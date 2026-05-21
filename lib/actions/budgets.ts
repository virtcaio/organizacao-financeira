"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets, budgetTemplates } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-helpers";
import { budgetInputSchema } from "@/types/budget";
import {
  getBudgetsForMonth,
  getMonthlyBudgetSummary,
  findBudgetOverlap,
} from "@/lib/db/queries/budgets";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function listBudgetsForMonthAction(monthIso: string) {
  const userId = await requireUserId();
  return getBudgetsForMonth(userId, monthIso);
}

export async function getMonthlySummaryAction(monthIso: string) {
  const userId = await requireUserId();
  return getMonthlyBudgetSummary(userId, monthIso);
}

/**
 * Cria/atualiza orçamento. scope=template grava em budget_template (vale todo
 * mês); scope=month grava em budget (override do mês). Upsert idempotente
 * via UNIQUE constraint.
 */
export async function upsertBudgetAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = budgetInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { ok: false, error: "Dados inválidos", fieldErrors };
  }

  const { categoryId, limit, scope, month } = parsed.data;

  const overlap = await findBudgetOverlap(
    userId,
    categoryId,
    scope === "month" ? month! : null,
  );
  if (overlap) {
    return {
      ok: false,
      error: `Categoria conflita com orçamento existente em "${overlap.conflictCategoryName}". Use apenas categoria-mãe OU subcategorias, não ambos.`,
      fieldErrors: { categoryId: "Conflito com orçamento existente" },
    };
  }

  if (scope === "template") {
    const existing = await db
      .select({ id: budgetTemplates.id })
      .from(budgetTemplates)
      .where(
        and(
          eq(budgetTemplates.userId, userId),
          eq(budgetTemplates.categoryId, categoryId),
        ),
      );
    if (existing[0]) {
      await db
        .update(budgetTemplates)
        .set({ limitAmount: limit, updatedAt: new Date() })
        .where(
          and(
            eq(budgetTemplates.id, existing[0].id),
            eq(budgetTemplates.userId, userId),
          ),
        );
      revalidatePath("/orcamento");
      return { ok: true, data: { id: existing[0].id } };
    }
    const [row] = await db
      .insert(budgetTemplates)
      .values({ userId, categoryId, limitAmount: limit })
      .returning({ id: budgetTemplates.id });
    revalidatePath("/orcamento");
    return { ok: true, data: { id: row.id } };
  }

  // scope === "month" — override
  const existing = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, userId),
        eq(budgets.categoryId, categoryId),
        eq(budgets.month, month!),
      ),
    );
  if (existing[0]) {
    await db
      .update(budgets)
      .set({ limitAmount: limit })
      .where(and(eq(budgets.id, existing[0].id), eq(budgets.userId, userId)));
    revalidatePath("/orcamento");
    return { ok: true, data: { id: existing[0].id } };
  }
  const [row] = await db
    .insert(budgets)
    .values({ userId, categoryId, month: month!, limitAmount: limit })
    .returning({ id: budgets.id });
  revalidatePath("/orcamento");
  return { ok: true, data: { id: row.id } };
}

/** Remove o orçamento padrão (template) de uma categoria. */
export async function deleteBudgetTemplateAction(
  templateId: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const result = await db
    .delete(budgetTemplates)
    .where(
      and(eq(budgetTemplates.id, templateId), eq(budgetTemplates.userId, userId)),
    );
  if (result.count === 0) {
    return { ok: false, error: "Orçamento padrão não encontrado" };
  }
  revalidatePath("/orcamento");
  return { ok: true, data: undefined };
}

/** Remove o ajuste mensal (override), voltando ao template se houver. */
export async function deleteBudgetOverrideAction(
  overrideId: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const result = await db
    .delete(budgets)
    .where(and(eq(budgets.id, overrideId), eq(budgets.userId, userId)));
  if (result.count === 0) {
    return { ok: false, error: "Ajuste mensal não encontrado" };
  }
  revalidatePath("/orcamento");
  return { ok: true, data: undefined };
}
