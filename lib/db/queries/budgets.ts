import "server-only";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets, categories, transactions } from "@/lib/db/schema";
import type { BudgetRow, BudgetSummary } from "@/types/budget";

function statusFor(percent: number): BudgetRow["status"] {
  if (percent >= 100) return "exceeded";
  if (percent >= 70) return "warning";
  return "ok";
}

/**
 * Lista budgets do usuário pro mês, com spent calculado.
 *
 * - Se a categoria do budget é mãe (não tem parentId), spent inclui a própria
 *   + todas as subcategorias dela.
 * - Se é subcategoria, spent inclui só ela.
 * - Despesas em BRL apenas. Outras moedas ficam pra V2.
 */
export async function getBudgetsForMonth(
  userId: string,
  monthIso: string,
): Promise<BudgetRow[]> {
  // 1. Pega budgets do mês
  const rows = await db
    .select({
      id: budgets.id,
      categoryId: budgets.categoryId,
      limit: budgets.limitAmount,
      name: categories.name,
      parentId: categories.parentId,
    })
    .from(budgets)
    .innerJoin(categories, eq(categories.id, budgets.categoryId))
    .where(and(eq(budgets.userId, userId), eq(budgets.month, monthIso)));

  if (rows.length === 0) return [];

  // 2. Mapeia parent name (se a categoria é sub)
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

  // 3. Pra cada budget, calcula spent.
  //    Pra mãe: incluir descendentes (parent_id = budget.categoryId OR id = budget.categoryId).
  //    Pra sub: só ela mesma.
  const monthEnd = `${monthIso.slice(0, 7)}-31`; // basta ser >= último dia do mês
  const items: BudgetRow[] = [];

  // Pré-busca todas as subcategorias dos parents dos budgets em uma query só
  const motherIds = rows.filter((r) => r.parentId === null).map((r) => r.categoryId);
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

  // Agora soma despesas pra cada budget
  for (const r of rows) {
    const isParent = r.parentId === null;
    const includedCategoryIds = isParent
      ? [r.categoryId, ...(childrenByMother.get(r.categoryId) ?? [])]
      : [r.categoryId];

    const [spentRow] = await db
      .select({
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
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

    const limit = Number(r.limit);
    const spent = Number(spentRow?.total ?? 0);
    const remaining = limit - spent;
    const percent = limit === 0 ? 0 : (spent / limit) * 100;

    items.push({
      id: r.id,
      categoryId: r.categoryId,
      categoryName: r.name,
      categoryParentName: r.parentId ? parentNameById.get(r.parentId) ?? null : null,
      isParent,
      limit,
      spent,
      remaining,
      percent,
      status: statusFor(percent),
    });
  }

  // Ordena por status (exceeded primeiro), depois alfabético
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
 * Retorna a categoria conflitante, ou null se OK.
 */
export async function findBudgetOverlap(
  userId: string,
  categoryId: string,
  monthIso: string,
  excludeBudgetId?: string,
): Promise<{ conflictCategoryName: string } | null> {
  // 1. Busca a categoria-alvo
  const [target] = await db
    .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.id, categoryId));

  if (!target) return null;

  // 2. Coleta IDs conflitantes
  // - Se target é mãe (parentId null): conflitam todos as subs dela
  // - Se target é sub (parentId !== null): conflita a mãe dela
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

  // 3. Verifica se algum desses tem budget no mesmo mês
  const conflicts = await db
    .select({
      budgetId: budgets.id,
      categoryName: categories.name,
    })
    .from(budgets)
    .innerJoin(categories, eq(categories.id, budgets.categoryId))
    .where(
      and(
        eq(budgets.userId, userId),
        eq(budgets.month, monthIso),
        inArray(budgets.categoryId, conflictIds),
      ),
    );

  const realConflict = excludeBudgetId
    ? conflicts.find((c) => c.budgetId !== excludeBudgetId)
    : conflicts[0];

  return realConflict ? { conflictCategoryName: realConflict.categoryName } : null;
}
