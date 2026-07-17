import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, categorizationRules } from "@/lib/db/schema";
import type { CategoryKind } from "@/types/category";
import type { CategorizationRule } from "@/lib/categorization/apply";

export type RuleRow = {
  id: string;
  pattern: string;
  categoryId: string;
  categoryName: string;
  categoryKind: CategoryKind;
  priority: number;
  hitCount: number;
};

/** Lista regras do user com nome da categoria (INNER JOIN). Ordena priority asc, hits desc. */
export async function listRulesForUser(userId: string): Promise<RuleRow[]> {
  const rows = await db
    .select({
      id: categorizationRules.id,
      pattern: categorizationRules.pattern,
      categoryId: categorizationRules.categoryId,
      categoryName: categories.name,
      categoryKind: categories.kind,
      priority: categorizationRules.priority,
      hitCount: categorizationRules.hitCount,
    })
    .from(categorizationRules)
    .innerJoin(categories, eq(categories.id, categorizationRules.categoryId))
    .where(eq(categorizationRules.userId, userId))
    .orderBy(asc(categorizationRules.priority), desc(categorizationRules.hitCount));

  return rows.map((r) => ({
    id: r.id,
    pattern: r.pattern,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    categoryKind: r.categoryKind,
    priority: r.priority,
    hitCount: r.hitCount,
  }));
}

/** Forma reduzida pra os endpoints IA — só o necessário pra `applyRulesToItems`. */
export async function listRulesForApply(userId: string): Promise<CategorizationRule[]> {
  const rows = await db
    .select({
      id: categorizationRules.id,
      pattern: categorizationRules.pattern,
      categoryId: categorizationRules.categoryId,
      priority: categorizationRules.priority,
    })
    .from(categorizationRules)
    .where(eq(categorizationRules.userId, userId))
    .orderBy(asc(categorizationRules.priority));
  return rows;
}

/** Incrementa hitCount em bulk. Caller é responsável por deduplicar ids. */
export async function incrementHitCounts(userId: string, ruleIds: string[]): Promise<void> {
  if (ruleIds.length === 0) return;
  await db
    .update(categorizationRules)
    .set({ hitCount: sql`${categorizationRules.hitCount} + 1` })
    .where(
      and(
        eq(categorizationRules.userId, userId),
        inArray(categorizationRules.id, ruleIds),
      ),
    );
}
