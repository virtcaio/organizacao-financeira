"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { financialAccounts, transactions } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-helpers";
import {
  financialAccountInputSchema,
  reconcileAccountSchema,
  type ReconcileAccountInput,
} from "@/types/financial-account";
import { signedSumExpr } from "@/lib/db/queries/accounts";

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

/**
 * Concilia o saldo: gera uma transação tipo `adjustment` com a diferença entre
 * o saldo real informado e o saldo computado pelo app. Se diferença = 0, no-op.
 */
export async function reconcileAccountAction(
  raw: ReconcileAccountInput,
): Promise<ActionResult<{ delta: number }>> {
  const userId = await requireUserId();
  const parsed = reconcileAccountSchema.safeParse(raw);
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

  const { accountId, realBalance, date } = parsed.data;
  const real = Number(realBalance);

  // Ler saldo e inserir o ajuste na MESMA transação, com lock na conta:
  // dois submits concorrentes leriam o mesmo saldo e dobrariam o ajuste.
  const result = await db.transaction(async (tx) => {
    const [acct] = await tx
      .select({
        openingBalance: financialAccounts.openingBalance,
        currency: financialAccounts.currency,
      })
      .from(financialAccounts)
      .where(
        and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId)),
      )
      .for("update");
    if (!acct) return null;

    const [agg] = await tx
      .select({ total: signedSumExpr })
      .from(transactions)
      .where(
        and(
          eq(transactions.financialAccountId, accountId),
          eq(transactions.userId, userId),
        ),
      );

    const balance = Number(acct.openingBalance) + Number(agg?.total ?? 0);
    const delta = Number((real - balance).toFixed(2));
    if (Math.abs(delta) < 0.005) return { delta: 0 };

    await tx.insert(transactions).values({
      userId,
      financialAccountId: accountId,
      categoryId: null,
      type: "adjustment",
      amount: delta.toFixed(2),
      currency: acct.currency,
      date,
      description: "Ajuste de saldo",
      source: "manual",
    });
    return { delta };
  });

  if (!result) return { ok: false, error: "Conta não encontrada" };

  revalidatePath("/contas");
  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  return { ok: true, data: result };
}
