"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categorizationRules } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-helpers";
import {
  ruleCreateSchema,
  ruleUpdateSchema,
  type RuleCreateInput,
  type RuleUpdateInput,
} from "@/types/categorization-rule";
import { incrementHitCounts } from "@/lib/db/queries/categorization-rules";
import { categoryIsAccessible } from "@/lib/db/queries/categories";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function collectFieldErrors(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

async function loadOwnRule(userId: string, id: string) {
  const [row] = await db
    .select({
      id: categorizationRules.id,
      userId: categorizationRules.userId,
    })
    .from(categorizationRules)
    .where(eq(categorizationRules.id, id))
    .limit(1);
  if (!row || row.userId !== userId) return null;
  return row;
}

export async function createRuleAction(
  input: RuleCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = ruleCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  if (!(await categoryIsAccessible(userId, parsed.data.categoryId))) {
    return { ok: false, error: "Categoria inválida" };
  }

  const [row] = await db
    .insert(categorizationRules)
    .values({
      userId,
      pattern: parsed.data.pattern,
      categoryId: parsed.data.categoryId,
      priority: parsed.data.priority ?? 100,
    })
    .returning({ id: categorizationRules.id });

  revalidatePath("/configuracoes");
  return { ok: true, data: { id: row.id } };
}

export async function updateRuleAction(
  id: string,
  input: RuleUpdateInput,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const owned = await loadOwnRule(userId, id);
  if (!owned) return { ok: false, error: "Regra não encontrada" };

  const parsed = ruleUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  if (parsed.data.categoryId && !(await categoryIsAccessible(userId, parsed.data.categoryId))) {
    return { ok: false, error: "Categoria inválida" };
  }

  const patch: Partial<typeof categorizationRules.$inferInsert> = {};
  if (parsed.data.pattern !== undefined) patch.pattern = parsed.data.pattern;
  if (parsed.data.categoryId !== undefined) patch.categoryId = parsed.data.categoryId;
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;

  if (Object.keys(patch).length === 0) {
    return { ok: true, data: undefined };
  }

  await db
    .update(categorizationRules)
    .set(patch)
    .where(and(eq(categorizationRules.id, id), eq(categorizationRules.userId, userId)));

  revalidatePath("/configuracoes");
  return { ok: true, data: undefined };
}

export async function deleteRuleAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const owned = await loadOwnRule(userId, id);
  if (!owned) return { ok: false, error: "Regra não encontrada" };

  await db
    .delete(categorizationRules)
    .where(and(eq(categorizationRules.id, id), eq(categorizationRules.userId, userId)));

  revalidatePath("/configuracoes");
  return { ok: true, data: undefined };
}

/** Bulk increment chamado pós-save de import. Dedup de IDs no caller. */
export async function incrementHitCountAction(
  ruleIds: string[],
): Promise<ActionResult> {
  const userId = await requireUserId();
  const unique = Array.from(new Set(ruleIds.filter((id) => typeof id === "string" && id)));
  if (unique.length === 0) return { ok: true, data: undefined };
  await incrementHitCounts(userId, unique);
  return { ok: true, data: undefined };
}
