import { NextRequest, NextResponse } from "next/server";
import { and, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { recurringRules, transactions } from "@/lib/db/schema";
import { todayIso } from "@/lib/date";
import { nextRunDate, type RecurringFrequency } from "@/lib/recurring";

/** Teto de ocorrências geradas por regra numa execução (catch-up). */
const MAX_CATCHUP = 60;

/**
 * Gera as transações das recorrências vencidas.
 *
 * Acionado pelo Vercel Cron (GET) — a Vercel envia
 * `Authorization: Bearer ${CRON_SECRET}` automaticamente. Aceita POST também
 * pra teste manual. Idempotente no sentido de catch-up: se o cron pular dias,
 * a próxima execução recupera as ocorrências perdidas.
 */
async function handler(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }

  const today = todayIso();

  const due = await db
    .select()
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.paused, false),
        lte(recurringRules.nextRunAt, today),
      ),
    );

  let generated = 0;

  for (const rule of due) {
    const rows: (typeof transactions.$inferInsert)[] = [];
    let runAt = rule.nextRunAt;
    let iterations = 0;

    while (runAt <= today && iterations < MAX_CATCHUP) {
      if (rule.endDate && runAt > rule.endDate) break;
      rows.push({
        userId: rule.userId,
        financialAccountId: rule.financialAccountId,
        categoryId: rule.categoryId,
        type: rule.type,
        amount: rule.amount,
        currency: rule.currency,
        date: runAt,
        description: rule.description,
        source: "recurring",
        recurringRuleId: rule.id,
      });
      runAt = nextRunDate(
        runAt,
        rule.frequency as RecurringFrequency,
        rule.interval,
        rule.dayOfMonth,
      );
      iterations++;
    }

    if (rows.length > 0) {
      await db.transaction(async (tx) => {
        await tx.insert(transactions).values(rows);
        await tx
          .update(recurringRules)
          .set({ nextRunAt: runAt })
          .where(eq(recurringRules.id, rule.id));
      });
      generated += rows.length;
    }

    // Encerrou o período da regra — pausa pra não reprocessar.
    if (rule.endDate && runAt > rule.endDate) {
      await db
        .update(recurringRules)
        .set({ paused: true })
        .where(eq(recurringRules.id, rule.id));
    }
  }

  return NextResponse.json({
    ok: true,
    data: { rulesProcessed: due.length, transactionsGenerated: generated },
  });
}

export const GET = handler;
export const POST = handler;
