import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets, budgetTemplates, recurringRules } from "@/lib/db/schema";
import { getBudgetsForMonth } from "@/lib/db/queries/budgets";
import { createAlertIfAbsent } from "@/lib/db/queries/alerts";
import { addDaysIso, monthStartIso, todayIso } from "@/lib/date";

/**
 * Geração de alertas — chamada pelo cron diário (junto com as recorrências).
 * Dedup por `dedupeKey` no payload: a mesma ocorrência lógica (categoria+mês+
 * nível, ou regra+data) só alerta uma vez.
 */

/** Usuários com orçamento ativo (template ou override do mês). */
async function userIdsWithBudgets(monthIso: string): Promise<string[]> {
  const [tpl, ovr] = await Promise.all([
    db.selectDistinct({ userId: budgetTemplates.userId }).from(budgetTemplates),
    db
      .selectDistinct({ userId: budgets.userId })
      .from(budgets)
      .where(eq(budgets.month, monthIso)),
  ]);
  return Array.from(new Set([...tpl, ...ovr].map((r) => r.userId)));
}

export async function generateBudgetAlerts(): Promise<number> {
  const month = monthStartIso();
  const monthLabel = month.slice(0, 7); // YYYY-MM
  let created = 0;

  for (const userId of await userIdsWithBudgets(month)) {
    const rows = await getBudgetsForMonth(userId, month);
    for (const b of rows) {
      if (b.status === "ok" || b.limit <= 0) continue;
      const kind = b.status === "exceeded" ? "budget_exceeded" : "budget_warning";
      const dedupeKey = `budget:${b.categoryId}:${month}:${b.status}`;
      const ok = await createAlertIfAbsent(userId, kind, dedupeKey, {
        categoryId: b.categoryId,
        categoryName: b.categoryName,
        month,
        monthLabel,
        percent: Math.round(b.percent),
        limit: b.limit,
        spent: b.spent,
      });
      if (ok) created += 1;
    }
  }
  return created;
}

/** Recorrências ativas que vão rodar nos próximos `days` dias. */
export async function generateBillDueAlerts(days = 3): Promise<number> {
  const start = todayIso();
  const end = addDaysIso(start, days);
  let created = 0;

  const due = await db
    .select({
      id: recurringRules.id,
      userId: recurringRules.userId,
      description: recurringRules.description,
      amount: recurringRules.amount,
      currency: recurringRules.currency,
      type: recurringRules.type,
      nextRunAt: recurringRules.nextRunAt,
    })
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.paused, false),
        eq(recurringRules.type, "expense"),
        gte(recurringRules.nextRunAt, start),
        lte(recurringRules.nextRunAt, end),
        sql`(${recurringRules.endDate} is null or ${recurringRules.nextRunAt} <= ${recurringRules.endDate})`,
      ),
    );

  for (const rule of due) {
    const dedupeKey = `bill:${rule.id}:${rule.nextRunAt}`;
    const ok = await createAlertIfAbsent(rule.userId, "bill_due", dedupeKey, {
      ruleId: rule.id,
      description: rule.description,
      amount: rule.amount,
      currency: rule.currency,
      dueDate: rule.nextRunAt,
    });
    if (ok) created += 1;
  }
  return created;
}
