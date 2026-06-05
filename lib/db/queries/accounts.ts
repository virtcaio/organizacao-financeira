import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { financialAccounts, transactions } from "@/lib/db/schema";
import type { FinancialAccountType } from "@/types/financial-account";

export type AccountWithBalance = {
  id: string;
  name: string;
  type: FinancialAccountType;
  currency: string;
  openingBalance: string;
  archived: boolean;
  /** Saldo computado: opening + sum signed das transações. */
  computedBalance: string;
};

/**
 * Convenção de sinal (mesma do dashboard em `lib/db/queries/dashboard.ts`):
 * - income / adjustment: amount já tem sinal (positivo soma, negativo subtrai)
 * - expense: amount armazenado positivo, subtrai do saldo
 * - transfer: amount já tem sinal (outflow negativo, inflow positivo)
 * - investment: ignorado no saldo de caixa
 */
const signedSumExpr = sql<string>`coalesce(sum(
  case ${transactions.type}
    when 'expense' then -${transactions.amount}
    when 'investment' then 0
    else ${transactions.amount}
  end
), 0)`;

export async function listAccountsWithBalance(
  userId: string,
): Promise<AccountWithBalance[]> {
  const [accounts, sums] = await Promise.all([
    db
      .select({
        id: financialAccounts.id,
        name: financialAccounts.name,
        type: financialAccounts.type,
        currency: financialAccounts.currency,
        openingBalance: financialAccounts.openingBalance,
        archived: financialAccounts.archived,
      })
      .from(financialAccounts)
      .where(eq(financialAccounts.userId, userId))
      .orderBy(asc(financialAccounts.archived), asc(financialAccounts.name)),
    db
      .select({
        accountId: transactions.financialAccountId,
        total: signedSumExpr,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .groupBy(transactions.financialAccountId),
  ]);

  const sumByAccount = new Map(sums.map((s) => [s.accountId, Number(s.total)]));
  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type as FinancialAccountType,
    currency: a.currency,
    openingBalance: a.openingBalance,
    archived: a.archived,
    computedBalance: (
      Number(a.openingBalance) + (sumByAccount.get(a.id) ?? 0)
    ).toFixed(2),
  }));
}

/** Saldo computado de UMA conta (pra reconcileAccountAction). Mesma convenção. */
export async function computeAccountBalance(
  userId: string,
  accountId: string,
): Promise<{ balance: number; currency: string } | null> {
  const [acct] = await db
    .select({
      id: financialAccounts.id,
      openingBalance: financialAccounts.openingBalance,
      currency: financialAccounts.currency,
    })
    .from(financialAccounts)
    .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId)))
    .limit(1);
  if (!acct) return null;

  const [agg] = await db
    .select({ total: signedSumExpr })
    .from(transactions)
    .where(
      and(
        eq(transactions.financialAccountId, accountId),
        eq(transactions.userId, userId),
      ),
    );

  return {
    balance: Number(acct.openingBalance) + Number(agg?.total ?? 0),
    currency: acct.currency,
  };
}
