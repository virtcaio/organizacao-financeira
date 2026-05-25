import "server-only";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  budgets,
  budgetTemplates,
  categories,
  categoryUserOverrides,
  categorizationRules,
  recurringRules,
  transactions,
} from "@/lib/db/schema";

export type CategoryNode = {
  id: string;
  name: string;
  kind: "income" | "expense" | "investment" | "transfer";
  icon: string | null;
  parentId: string | null;
  /** true = categoria do próprio usuário (custom); false = seed do sistema. */
  isEditable: boolean;
  children: CategoryNode[];
};

/** Variante com bandeira de arquivado (pra UI de gestão). */
export type CategoryAdminNode = {
  id: string;
  name: string;
  kind: "income" | "expense" | "investment" | "transfer";
  icon: string | null;
  parentId: string | null;
  isEditable: boolean;
  archivedForUser: boolean;
  children: CategoryAdminNode[];
};

type Row = {
  id: string;
  name: string;
  kind: "income" | "expense" | "investment" | "transfer";
  icon: string | null;
  parentId: string | null;
  userId: string | null;
  archived: boolean;
  overrideArchived: boolean | null;
};

function buildTree<T extends { id: string; parentId: string | null; children: T[] }>(
  nodes: T[],
): T[] {
  const byId = new Map<string, T>(nodes.map((n) => [n.id, n]));
  const roots: T[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  roots.sort((a, b) => (a as unknown as { name: string }).name.localeCompare(
    (b as unknown as { name: string }).name, "pt-BR",
  ));
  return roots;
}

async function fetchCategoriesWithOverride(userId: string): Promise<Row[]> {
  // LEFT JOIN com category_user_override pra essa pessoa.
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
      icon: categories.icon,
      parentId: categories.parentId,
      userId: categories.userId,
      archived: categories.archived,
      overrideArchived: categoryUserOverrides.archived,
    })
    .from(categories)
    .leftJoin(
      categoryUserOverrides,
      and(
        eq(categoryUserOverrides.categoryId, categories.id),
        eq(categoryUserOverrides.userId, userId),
      ),
    )
    .where(or(isNull(categories.userId), eq(categories.userId, userId)))
    .orderBy(asc(categories.name));
  return rows;
}

/**
 * Categorias visíveis pro usuário (não arquivadas).
 * Inclui seeds (userId IS NULL) + custom do usuário.
 */
export async function listCategoriesForUser(userId: string): Promise<CategoryNode[]> {
  const rows = await fetchCategoriesWithOverride(userId);

  const visible = rows.filter(
    (r) => !r.archived && r.overrideArchived !== true,
  );

  const nodes: CategoryNode[] = visible.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    icon: r.icon,
    parentId: r.parentId,
    isEditable: r.userId !== null,
    children: [],
  }));

  return buildTree(nodes);
}

/**
 * Lista TODAS as categorias (inclusive arquivadas) — pra UI de gestão.
 * Cada node tem `archivedForUser` indicando o estado efetivo pro user.
 */
export async function listAllCategoriesForUser(
  userId: string,
): Promise<CategoryAdminNode[]> {
  const rows = await fetchCategoriesWithOverride(userId);

  const nodes: CategoryAdminNode[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    icon: r.icon,
    parentId: r.parentId,
    isEditable: r.userId !== null,
    archivedForUser: r.archived || r.overrideArchived === true,
    children: [],
  }));

  return buildTree(nodes);
}

/**
 * Conta usos de uma categoria nas tabelas que a referenciam.
 * Pra decidir se permite hard-delete.
 */
export async function countCategoryUsage(
  userId: string,
  categoryId: string,
): Promise<{
  transactions: number;
  budgets: number;
  budgetTemplates: number;
  recurring: number;
  rules: number;
  total: number;
}> {
  async function count(
    table:
      | typeof transactions
      | typeof budgets
      | typeof budgetTemplates
      | typeof recurringRules
      | typeof categorizationRules,
  ): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(table)
      .where(and(eq(table.userId, userId), eq(table.categoryId, categoryId)));
    return row?.n ?? 0;
  }

  const [tx, bg, bt, rr, cr] = await Promise.all([
    count(transactions),
    count(budgets),
    count(budgetTemplates),
    count(recurringRules),
    count(categorizationRules),
  ]);

  return {
    transactions: tx,
    budgets: bg,
    budgetTemplates: bt,
    recurring: rr,
    rules: cr,
    total: tx + bg + bt + rr + cr,
  };
}
