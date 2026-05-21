"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-helpers";
import { tagInputSchema } from "@/types/tag";
import { listTagsForUser } from "@/lib/db/queries/tags";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function listTagsAction() {
  const userId = await requireUserId();
  return listTagsForUser(userId);
}

export async function createTagAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; name: string; color: string | null }>> {
  const userId = await requireUserId();
  const parsed = tagInputSchema.safeParse(raw);
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

  const { name, color } = parsed.data;

  // UNIQUE (userId, name) — checa antes pra dar mensagem amigável
  const existing = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), eq(tags.name, name)));
  if (existing.length > 0) {
    return {
      ok: false,
      error: "Já existe uma tag com esse nome",
      fieldErrors: { name: "Nome já usado" },
    };
  }

  const [row] = await db
    .insert(tags)
    .values({ userId, name, color: color ?? null })
    .returning({ id: tags.id, name: tags.name, color: tags.color });

  revalidatePath("/configuracoes");
  revalidatePath("/transacoes");
  return { ok: true, data: { id: row.id, name: row.name, color: row.color } };
}

export async function deleteTagAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  // ON DELETE CASCADE em transaction_tag remove as associações.
  const result = await db
    .delete(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)));

  if (result.count === 0) {
    return { ok: false, error: "Tag não encontrada" };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/transacoes");
  return { ok: true, data: undefined };
}
