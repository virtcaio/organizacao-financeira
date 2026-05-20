import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, financialAccounts, transactions } from "@/lib/db/schema";

/** ISO date (YYYY-MM-DD) of the first day of the month, in local time. */
function monthStartIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** ISO date (YYYY-MM-DD) of the last day of a month. */
function monthEndIso(year: number, monthIndex: number): string {
  const d = new Date(year, monthIndex + 1, 0); // day 0 = last day of previous month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type CurrencyBalance = {
  currency: string;
  total: number;
  income: number;
  expense: number;
};

/** Saldo total por moeda: opening_balance + sum(income) - sum(expense). All-time. */
export async function getBalancesByCurrency(userId: string): Promise<CurrencyBalance[]> {
  const openings = await db
    .select({
      currency: financialAccounts.currency,
      opening: sql<string>`coalesce(sum(${financialAccounts.openingBalance}), 0)`,
    })
    .from(financialAccounts)
    .where(
      and(eq(financialAccounts.userId, userId), eq(financialAccounts.archived, false)),
    )
    .groupBy(financialAccounts.currency);

  const txAgg = await db
    .select({
      currency: transactions.currency,
      type: transactions.type,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .groupBy(transactions.currency, transactions.type);

  const map = new Map<string, CurrencyBalance>();
  for (const o of openings) {
    map.set(o.currency, {
      currency: o.currency,
      total: Number(o.opening),
      income: 0,
      expense: 0,
    });
  }
  for (const t of txAgg) {
    const entry =
      map.get(t.currency) ??
      ({ currency: t.currency, total: 0, income: 0, expense: 0 } as CurrencyBalance);
    const v = Number(t.total);
    if (t.type === "income") {
      entry.income += v;
      entry.total += v;
    } else if (t.type === "expense") {
      entry.expense += v;
      entry.total -= v;
    }
    map.set(t.currency, entry);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.currency === "BRL") return -1;
    if (b.currency === "BRL") return 1;
    return a.currency.localeCompare(b.currency);
  });
}

export type MonthlyKpis = {
  income: number;
  expense: number;
  net: number;
};

/** KPIs do mês corrente em BRL. */
export async function getMonthlyKpisBRL(userId: string, now = new Date()): Promise<MonthlyKpis> {
  const start = monthStartIso(now);
  const end = monthEndIso(now.getFullYear(), now.getMonth());

  const rows = await db
    .select({
      type: transactions.type,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.currency, "BRL"),
        gte(transactions.date, start),
        lte(transactions.date, end),
      ),
    )
    .groupBy(transactions.type);

  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === "income") income = Number(r.total);
    if (r.type === "expense") expense = Number(r.total);
  }
  return { income, expense, net: income - expense };
}

export type CategoryBreakdownItem = {
  categoryId: string | null;
  categoryName: string;
  total: number;
  fillIndex: number;
};

/** Despesas do mês corrente agrupadas pela categoria-pai (BRL). */
export async function getCategoryBreakdownBRL(
  userId: string,
  now = new Date(),
): Promise<CategoryBreakdownItem[]> {
  const start = monthStartIso(now);
  const end = monthEndIso(now.getFullYear(), now.getMonth());

  // Get all transactions of the month with their (subcategory) data
  const txWithCat = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      parentId: categories.parentId,
      amount: transactions.amount,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        eq(transactions.currency, "BRL"),
        gte(transactions.date, start),
        lte(transactions.date, end),
      ),
    );

  // Resolve parent names for grouping
  const parentIds = Array.from(
    new Set(
      txWithCat.map((r) => r.parentId).filter((v): v is string => v !== null),
    ),
  );
  const parents = parentIds.length
    ? await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.archived, false))
    : [];
  const parentNameById = new Map(parents.map((p) => [p.id, p.name]));

  // Group by parent category (or the category itself if it has no parent)
  const totals = new Map<string, { name: string; total: number; categoryId: string | null }>();
  for (const r of txWithCat) {
    const key = r.parentId ?? r.categoryId ?? "__uncategorized";
    const name = r.parentId
      ? parentNameById.get(r.parentId) ?? "Outras"
      : r.categoryName ?? "Sem categoria";
    const entry = totals.get(key) ?? {
      name,
      total: 0,
      categoryId: r.parentId ?? r.categoryId,
    };
    entry.total += Number(r.amount);
    totals.set(key, entry);
  }

  const items = Array.from(totals.entries()).map(([key, v]) => ({
    categoryId: v.categoryId,
    categoryName: v.name,
    total: v.total,
    key,
  }));
  items.sort((a, b) => b.total - a.total);
  return items.map((it, i) => ({
    categoryId: it.categoryId,
    categoryName: it.categoryName,
    total: it.total,
    fillIndex: i,
  }));
}

export type MonthlyPoint = {
  monthIso: string; // YYYY-MM-01
  label: string; // "mai" / "jun"
  income: number;
  expense: number;
};

/** Receitas e despesas (BRL) dos últimos N meses (incluindo o corrente). */
export async function getMonthlyEvolutionBRL(
  userId: string,
  monthsBack = 6,
  now = new Date(),
): Promise<MonthlyPoint[]> {
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const startIso = monthStartIso(start);
  const endIso = monthEndIso(now.getFullYear(), now.getMonth());

  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${transactions.date}), 'YYYY-MM-01')`,
      type: transactions.type,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.currency, "BRL"),
        gte(transactions.date, startIso),
        lte(transactions.date, endIso),
      ),
    )
    .groupBy(sql`date_trunc('month', ${transactions.date})`, transactions.type);

  // Pre-fill all months with zeros
  const points: MonthlyPoint[] = [];
  const monthNames = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1) + i, 1);
    points.push({
      monthIso: monthStartIso(d),
      label: monthNames[d.getMonth()],
      income: 0,
      expense: 0,
    });
  }

  const byMonth = new Map(points.map((p) => [p.monthIso, p]));
  for (const r of rows) {
    const point = byMonth.get(r.month);
    if (!point) continue;
    if (r.type === "income") point.income = Number(r.total);
    else if (r.type === "expense") point.expense = Number(r.total);
  }
  return points;
}

export type RecentTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: "income" | "expense" | "transfer" | "investment" | "adjustment";
  accountName: string;
  categoryName: string | null;
};

export async function getRecentTransactions(
  userId: string,
  limit = 5,
): Promise<RecentTransaction[]> {
  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      currency: transactions.currency,
      type: transactions.type,
      accountName: financialAccounts.name,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(financialAccounts, eq(financialAccounts.id, transactions.financialAccountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    description: r.description,
    amount: Number(r.amount),
    currency: r.currency,
    type: r.type,
    accountName: r.accountName,
    categoryName: r.categoryName,
  }));
}
