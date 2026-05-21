import "server-only";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, financialAccounts, recurringRules } from "@/lib/db/schema";
import type { RecurringRuleListItem } from "@/types/recurring";

function mapRow(r: {
  id: string;
  type: string;
  financialAccountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  amount: string;
  currency: string;
  description: string;
  frequency: string;
  interval: number;
  dayOfMonth: number | null;
  nextRunAt: string;
  endDate: string | null;
  paused: boolean;
}): RecurringRuleListItem {
  return {
    id: r.id,
    type: r.type as RecurringRuleListItem["type"],
    financialAccountId: r.financialAccountId,
    accountName: r.accountName,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    amount: r.amount,
    currency: r.currency,
    description: r.description,
    frequency: r.frequency as RecurringRuleListItem["frequency"],
    interval: r.interval,
    dayOfMonth: r.dayOfMonth,
    nextRunAt: r.nextRunAt,
    endDate: r.endDate,
    paused: r.paused,
  };
}

export async function listRecurringRulesForUser(
  userId: string,
): Promise<RecurringRuleListItem[]> {
  const rows = await db
    .select({
      id: recurringRules.id,
      type: recurringRules.type,
      financialAccountId: recurringRules.financialAccountId,
      accountName: financialAccounts.name,
      categoryId: recurringRules.categoryId,
      categoryName: categories.name,
      amount: recurringRules.amount,
      currency: recurringRules.currency,
      description: recurringRules.description,
      frequency: recurringRules.frequency,
      interval: recurringRules.interval,
      dayOfMonth: recurringRules.dayOfMonth,
      nextRunAt: recurringRules.nextRunAt,
      endDate: recurringRules.endDate,
      paused: recurringRules.paused,
    })
    .from(recurringRules)
    .innerJoin(
      financialAccounts,
      eq(financialAccounts.id, recurringRules.financialAccountId),
    )
    .leftJoin(categories, eq(categories.id, recurringRules.categoryId))
    .where(eq(recurringRules.userId, userId))
    .orderBy(asc(recurringRules.paused), asc(recurringRules.nextRunAt));

  return rows.map(mapRow);
}

/** Regras ativas com próxima execução dentro dos próximos `days` dias. */
export async function getUpcomingRules(
  userId: string,
  days = 14,
): Promise<RecurringRuleListItem[]> {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const limit = new Date(today);
  limit.setUTCDate(limit.getUTCDate() + days);
  const limitIso = limit.toISOString().slice(0, 10);

  const rows = await db
    .select({
      id: recurringRules.id,
      type: recurringRules.type,
      financialAccountId: recurringRules.financialAccountId,
      accountName: financialAccounts.name,
      categoryId: recurringRules.categoryId,
      categoryName: categories.name,
      amount: recurringRules.amount,
      currency: recurringRules.currency,
      description: recurringRules.description,
      frequency: recurringRules.frequency,
      interval: recurringRules.interval,
      dayOfMonth: recurringRules.dayOfMonth,
      nextRunAt: recurringRules.nextRunAt,
      endDate: recurringRules.endDate,
      paused: recurringRules.paused,
    })
    .from(recurringRules)
    .innerJoin(
      financialAccounts,
      eq(financialAccounts.id, recurringRules.financialAccountId),
    )
    .leftJoin(categories, eq(categories.id, recurringRules.categoryId))
    .where(
      and(
        eq(recurringRules.userId, userId),
        eq(recurringRules.paused, false),
        gte(recurringRules.nextRunAt, todayIso),
        lte(recurringRules.nextRunAt, limitIso),
      ),
    )
    .orderBy(asc(recurringRules.nextRunAt));

  return rows.map(mapRow);
}

export async function countActiveRules(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(recurringRules)
    .where(
      and(eq(recurringRules.userId, userId), eq(recurringRules.paused, false)),
    );
  return row?.n ?? 0;
}
