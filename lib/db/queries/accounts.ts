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
  /** Saldo computado: opening + sum(transactions.amount). String pra preservar precisão. */
  computedBalance: string;
};

/**
 * Lista contas do user com saldo computado.
 * Saldo = opening + SUM(transactions.amount) — amount já vem com sinal (transferência
 * outflow é negativo, receita/adjustment positivo é positivo). Single source of truth
 * pra dashboards e /contas.
 */
export async function listAccountsWithBalance(
  userId: string,
): Promise<AccountWithBalance[]> {
  const rows = await db
    .select({
      id: financialAccounts.id,
      name: financialAccounts.name,
      type: financialAccounts.type,
      currency: financialAccounts.currency,
      openingBalance: financialAccounts.openingBalance,
      archived: financialAccounts.archived,
      txSum: sql<string>`coalesce(
        (
          select sum(${transactions.amount})
          from ${transactions}
          where ${transactions.financialAccountId} = ${financialAccounts.id}
            and ${transactions.userId} = ${financialAccounts.userId}
        ),
        0
      )`,
    })
    .from(financialAccounts)
    .where(eq(financialAccounts.userId, userId))
    .orderBy(asc(financialAccounts.archived), asc(financialAccounts.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type as FinancialAccountType,
    currency: r.currency,
    openingBalance: r.openingBalance,
    archived: r.archived,
    computedBalance: (Number(r.openingBalance) + Number(r.txSum)).toFixed(2),
  }));
}

/** Saldo computado de UMA conta (pra reconcileAccountAction). */
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
    .select({
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
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
