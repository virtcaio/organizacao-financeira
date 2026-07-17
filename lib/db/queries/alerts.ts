import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import type { AlertKind, AlertListItem } from "@/types/alert";

export async function countUnreadAlerts(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(alerts)
    .where(and(eq(alerts.userId, userId), isNull(alerts.readAt)));
  return row?.n ?? 0;
}

export async function listAlerts(
  userId: string,
  limit = 50,
): Promise<AlertListItem[]> {
  const rows = await db
    .select({
      id: alerts.id,
      kind: alerts.kind,
      payload: alerts.payload,
      readAt: alerts.readAt,
      createdAt: alerts.createdAt,
    })
    .from(alerts)
    .where(eq(alerts.userId, userId))
    .orderBy(desc(alerts.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as AlertKind,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    readAt: r.readAt ? r.readAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Cria um alerta se ainda não existir um com o mesmo `dedupeKey` no payload.
 * O dedupeKey codifica a "ocorrência lógica" (ex.: budget:cat:mês:nível) pra
 * o cron diário não re-alertar a mesma coisa todo dia.
 */
export async function createAlertIfAbsent(
  userId: string,
  kind: AlertKind,
  dedupeKey: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const [existing] = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(
      and(
        eq(alerts.userId, userId),
        eq(alerts.kind, kind),
        sql`${alerts.payload} ->> 'dedupeKey' = ${dedupeKey}`,
      ),
    )
    .limit(1);
  if (existing) return false;

  await db.insert(alerts).values({
    userId,
    kind,
    payload: { ...payload, dedupeKey },
  });
  return true;
}
