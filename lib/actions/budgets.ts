"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets } from "@/lib/db/schema";
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

  const { categoryId, month, limit } = parsed.data;

  // Existing budget? (UNIQUE constraint per user+category+month)
  const existing = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, userId),
        eq(budgets.categoryId, categoryId),
        eq(budgets.month, month),
      ),
    );
  const existingId = existing[0]?.id;

  // Overlap check (mãe↔sub no mesmo mês)
  const overlap = await findBudgetOverlap(userId, categoryId, month, existingId);
  if (overlap) {
    return {
      ok: false,
      error: `Categoria conflita com orçamento existente em "${overlap.conflictCategoryName}". Use apenas categoria-mãe OU subcategorias, não ambos no mesmo mês.`,
      fieldErrors: { categoryId: "Conflito com orçamento existente" },
    };
  }

  if (existingId) {
    await db
      .update(budgets)
      .set({ limitAmount: limit })
      .where(and(eq(budgets.id, existingId), eq(budgets.userId, userId)));
    revalidatePath("/orcamento");
    return { ok: true, data: { id: existingId } };
  }

  const [row] = await db
    .insert(budgets)
    .values({ userId, categoryId, month, limitAmount: limit })
    .returning({ id: budgets.id });

  revalidatePath("/orcamento");
  return { ok: true, data: { id: row.id } };
}

export async function deleteBudgetAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const result = await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));

  if (result.count === 0) {
    return { ok: false, error: "Orçamento não encontrado" };
  }

  revalidatePath("/orcamento");
  return { ok: true, data: undefined };
}
