import "server-only";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets, budgetTemplates, categories, transactions } from "@/lib/db/schema";
import { monthEndFromStart } from "@/lib/date";
import type { BudgetRow, BudgetScope, BudgetSummary } from "@/types/budget";

function statusFor(percent: number): BudgetRow["status"] {
  if (percent >= 100) return "exceeded";
  if (percent >= 70) return "warning";
  return "ok";
}

type CategoryMeta = {
  name: string;
  parentId: string | null;
  parentName: string | null;
};

/** Carrega nome/parent das categorias informadas + nome dos parents. */
async function loadCategoryMeta(
  categoryIds: string[],
): Promise<Map<string, CategoryMeta>> {
  const meta = new Map<string, CategoryMeta>();
  if (categoryIds.length === 0) return meta;

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(inArray(categories.id, categoryIds));

  const parentIds = Array.from(
    new Set(rows.map((r) => r.parentId).filter((v): v is string => v !== null)),
  );
  const parentRows = parentIds.length
    ? await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(inArray(categories.id, parentIds))
    : [];
  const parentNameById = new Map(parentRows.map((p) => [p.id, p.name]));

  for (const r of rows) {
    meta.set(r.id, {
      name: r.name,
      parentId: r.parentId,
      parentName: r.parentId ? parentNameById.get(r.parentId) ?? null : null,
    });
  }
  return meta;
}

/**
 * Lista o orçamento efetivo de cada categoria pro mês.
 *
 * Resolução por categoria: override (budget do mês) tem prioridade sobre o
 * template (budget_template, recorrente). Spent inclui descendentes quando a
 * categoria é mãe. Despesas em BRL apenas.
 */
export async function getBudgetsForMonth(
  userId: string,
  monthIso: string,
): Promise<BudgetRow[]> {
  const [templates, overrides] = await Promise.all([
    db
      .select({
        id: budgetTemplates.id,
        categoryId: budgetTemplates.categoryId,
        limit: budgetTemplates.limitAmount,
      })
      .from(budgetTemplates)
      .where(eq(budgetTemplates.userId, userId)),
    db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        limit: budgets.limitAmount,
      })
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.month, monthIso))),
  ]);

  const templateByCat = new Map(templates.map((t) => [t.categoryId, t]));
  const overrideByCat = new Map(overrides.map((o) => [o.categoryId, o]));

  const categoryIds = Array.from(
    new Set([...templateByCat.keys(), ...overrideByCat.keys()]),
  );
  if (categoryIds.length === 0) return [];

  const meta = await loadCategoryMeta(categoryIds);

  // Pré-busca subcategorias das categorias-mãe (pra somar spent dos descendentes).
  const motherIds = categoryIds.filter((id) => meta.get(id)?.parentId == null);
  const childrenByMother = new Map<string, string[]>();
  if (motherIds.length) {
    const children = await db
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories)
      .where(
        and(
          inArray(categories.parentId, motherIds),
          or(isNull(categories.userId), eq(categories.userId, userId)),
        ),
      );
    for (const c of children) {
      if (!c.parentId) continue;
      const arr = childrenByMother.get(c.parentId) ?? [];
      arr.push(c.id);
      childrenByMother.set(c.parentId, arr);
    }
  }

  const monthEnd = monthEndFromStart(monthIso);
  const items: BudgetRow[] = [];

  for (const categoryId of categoryIds) {
    const m = meta.get(categoryId);
    if (!m) continue;
    const isParent = m.parentId == null;
    const template = templateByCat.get(categoryId);
    const override = overrideByCat.get(categoryId);

    const templateLimit = template ? Number(template.limit) : null;
    const source: BudgetScope = override ? "month" : "template";
    const limit = override ? Number(override.limit) : (templateLimit ?? 0);

    const includedCategoryIds = isParent
      ? [categoryId, ...(childrenByMother.get(categoryId) ?? [])]
      : [categoryId];

    const [spentRow] = await db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.currency, "BRL"),
          eq(transactions.type, "expense"),
          inArray(transactions.categoryId, includedCategoryIds),
          sql`${transactions.date} >= ${monthIso}`,
          sql`${transactions.date} <= ${monthEnd}`,
        ),
      );

    const spent = Number(spentRow?.total ?? 0);
    const remaining = limit - spent;
    const percent = limit === 0 ? 0 : (spent / limit) * 100;

    items.push({
      categoryId,
      categoryName: m.name,
      categoryParentName: m.parentName,
      isParent,
      limit,
      spent,
      remaining,
      percent,
      status: statusFor(percent),
      source,
      templateLimit,
      templateId: template?.id ?? null,
      overrideId: override?.id ?? null,
    });
  }

  items.sort((a, b) => {
    const order = { exceeded: 0, warning: 1, ok: 2 } as const;
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return a.categoryName.localeCompare(b.categoryName, "pt-BR");
  });

  return items;
}

export async function getMonthlyBudgetSummary(
  userId: string,
  monthIso: string,
): Promise<BudgetSummary> {
  const rows = await getBudgetsForMonth(userId, monthIso);
  const totalLimit = rows.reduce((acc, r) => acc + r.limit, 0);
  const totalSpent = rows.reduce((acc, r) => acc + r.spent, 0);
  const totalRemaining = totalLimit - totalSpent;
  const percent = totalLimit === 0 ? 0 : (totalSpent / totalLimit) * 100;
  return { totalLimit, totalSpent, totalRemaining, percent };
}

/**
 * Detecta overlap mãe↔subcategoria pra evitar double-counting.
 *
 * - Salvando template (monthIso null): conflita se mãe/sub tem template ou
 *   qualquer override.
 * - Salvando override num mês: conflita se mãe/sub tem template ou override
 *   no mesmo mês.
 *
 * Retorna a categoria conflitante, ou null se OK.
 */
export async function findBudgetOverlap(
  userId: string,
  categoryId: string,
  monthIso: string | null,
): Promise<{ conflictCategoryName: string } | null> {
  const [target] = await db
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.id, categoryId));
  if (!target) return null;

  let conflictIds: string[];
  if (target.parentId === null) {
    const subs = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.parentId, target.id));
    conflictIds = subs.map((s) => s.id);
  } else {
    conflictIds = [target.parentId];
  }
  if (conflictIds.length === 0) return null;

  const templateConflicts = await db
    .select({ name: categories.name })
    .from(budgetTemplates)
    .innerJoin(categories, eq(categories.id, budgetTemplates.categoryId))
    .where(
      and(
        eq(budgetTemplates.userId, userId),
        inArray(budgetTemplates.categoryId, conflictIds),
      ),
    );
  if (templateConflicts[0]) {
    return { conflictCategoryName: templateConflicts[0].name };
  }

  const overrideWhere = monthIso
    ? and(
        eq(budgets.userId, userId),
        eq(budgets.month, monthIso),
        inArray(budgets.categoryId, conflictIds),
      )
    : and(eq(budgets.userId, userId), inArray(budgets.categoryId, conflictIds));

  const overrideConflicts = await db
    .select({ name: categories.name })
    .from(budgets)
    .innerJoin(categories, eq(categories.id, budgets.categoryId))
    .where(overrideWhere);
  if (overrideConflicts[0]) {
    return { conflictCategoryName: overrideConflicts[0].name };
  }

  return null;
}
