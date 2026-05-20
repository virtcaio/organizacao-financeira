"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { financialAccounts } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-helpers";
import { financialAccountInputSchema } from "@/types/financial-account";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function listFinancialAccountsAction() {
  const userId = await requireUserId();
  const rows = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.userId, userId))
    .orderBy(asc(financialAccounts.archived), asc(financialAccounts.name));
  return rows;
}

export async function createFinancialAccountAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = financialAccountInputSchema.safeParse(raw);
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

  const { name, type, currency, openingBalance } = parsed.data;

  const [row] = await db
    .insert(financialAccounts)
    .values({ userId, name, type, currency, openingBalance })
    .returning({ id: financialAccounts.id });

  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: row.id } };
}

export async function updateFinancialAccountAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = financialAccountInputSchema.safeParse(raw);
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

  const { name, type, currency, openingBalance } = parsed.data;

  const result = await db
    .update(financialAccounts)
    .set({ name, type, currency, openingBalance })
    .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)));

  if (result.count === 0) {
    return { ok: false, error: "Conta não encontrada" };
  }

  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function archiveFinancialAccountAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await db
    .update(financialAccounts)
    .set({ archived: true })
    .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)));
  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function unarchiveFinancialAccountAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await db
    .update(financialAccounts)
    .set({ archived: false })
    .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)));
  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
