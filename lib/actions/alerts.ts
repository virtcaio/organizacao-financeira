"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-helpers";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function markAlertReadAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const result = await db
    .update(alerts)
    .set({ readAt: new Date() })
    .where(and(eq(alerts.id, id), eq(alerts.userId, userId), isNull(alerts.readAt)));
  if (result.count === 0) {
    return { ok: false, error: "Alerta não encontrado" };
  }
  revalidatePath("/alertas");
  return { ok: true, data: undefined };
}

export async function markAllAlertsReadAction(): Promise<ActionResult<{ updated: number }>> {
  const userId = await requireUserId();
  const result = await db
    .update(alerts)
    .set({ readAt: new Date() })
    .where(and(eq(alerts.userId, userId), isNull(alerts.readAt)));
  revalidatePath("/alertas");
  return { ok: true, data: { updated: result.count } };
}

export async function deleteAlertAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const result = await db
    .delete(alerts)
    .where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
  if (result.count === 0) {
    return { ok: false, error: "Alerta não encontrado" };
  }
  revalidatePath("/alertas");
  return { ok: true, data: undefined };
}
