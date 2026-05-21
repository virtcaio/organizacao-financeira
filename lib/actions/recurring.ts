"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recurringRules, financialAccounts } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-helpers";
import { recurringRuleInputSchema } from "@/types/recurring";
import { listRecurringRulesForUser } from "@/lib/db/queries/recurring";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function collectFieldErrors(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function listRecurringRulesAction() {
  const userId = await requireUserId();
  return listRecurringRulesForUser(userId);
}

export async function createRecurringRuleAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = recurringRuleInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }
  const d = parsed.data;

  const [account] = await db
    .select({ id: financialAccounts.id })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, d.financialAccountId),
        eq(financialAccounts.userId, userId),
      ),
    )
    .limit(1);
  if (!account) {
    return { ok: false, error: "Conta não encontrada" };
  }

  const [row] = await db
    .insert(recurringRules)
    .values({
      userId,
      financialAccountId: d.financialAccountId,
      categoryId: d.categoryId ?? null,
      type: d.type,
      amount: d.amount,
      currency: d.currency,
      description: d.description,
      frequency: d.frequency,
      interval: d.interval,
      dayOfMonth: d.dayOfMonth ?? null,
      nextRunAt: d.startDate,
      endDate: d.endDate ?? null,
    })
    .returning({ id: recurringRules.id });

  revalidatePath("/recorrencias");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: row.id } };
}

export async function updateRecurringRuleAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = recurringRuleInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }
  const d = parsed.data;

  const result = await db
    .update(recurringRules)
    .set({
      financialAccountId: d.financialAccountId,
      categoryId: d.categoryId ?? null,
      type: d.type,
      amount: d.amount,
      currency: d.currency,
      description: d.description,
      frequency: d.frequency,
      interval: d.interval,
      dayOfMonth: d.dayOfMonth ?? null,
      nextRunAt: d.startDate,
      endDate: d.endDate ?? null,
    })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));

  if (result.count === 0) {
    return { ok: false, error: "Recorrência não encontrada" };
  }

  revalidatePath("/recorrencias");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function setRecurringRulePausedAction(
  id: string,
  paused: boolean,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const result = await db
    .update(recurringRules)
    .set({ paused })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
  if (result.count === 0) {
    return { ok: false, error: "Recorrência não encontrada" };
  }
  revalidatePath("/recorrencias");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function deleteRecurringRuleAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const result = await db
    .delete(recurringRules)
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
  if (result.count === 0) {
    return { ok: false, error: "Recorrência não encontrada" };
  }
  revalidatePath("/recorrencias");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
