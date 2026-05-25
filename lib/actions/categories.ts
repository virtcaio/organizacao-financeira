"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, categoryUserOverrides } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-helpers";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
} from "@/types/category";
import { countCategoryUsage } from "@/lib/db/queries/categories";

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

/** Carrega a categoria se acessível ao user (seed ou própria). Senão null. */
async function loadAccessibleCategory(userId: string, id: string) {
  const [row] = await db
    .select({
      id: categories.id,
      userId: categories.userId,
      parentId: categories.parentId,
      kind: categories.kind,
      archived: categories.archived,
    })
    .from(categories)
    .where(
      and(
        eq(categories.id, id),
        or(isNull(categories.userId), eq(categories.userId, userId)),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Quantas subcategorias VISÍVEIS (não arquivadas) a categoria tem. */
async function countVisibleChildren(
  userId: string,
  parentId: string,
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(categories)
    .leftJoin(
      categoryUserOverrides,
      and(
        eq(categoryUserOverrides.categoryId, categories.id),
        eq(categoryUserOverrides.userId, userId),
      ),
    )
    .where(
      and(
        eq(categories.parentId, parentId),
        or(isNull(categories.userId), eq(categories.userId, userId)),
        eq(categories.archived, false),
        or(
          isNull(categoryUserOverrides.archived),
          eq(categoryUserOverrides.archived, false),
        ),
      ),
    );
  return row?.n ?? 0;
}

export async function createCategoryAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = categoryCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }
  const { name, icon, kind, parentId } = parsed.data;

  let resolvedKind = kind ?? null;
  let resolvedParentId: string | null = null;

  if (parentId) {
    const parent = await loadAccessibleCategory(userId, parentId);
    if (!parent) {
      return {
        ok: false,
        error: "Categoria-mãe não encontrada",
        fieldErrors: { parentId: "Selecione uma categoria-mãe válida" },
      };
    }
    if (parent.parentId !== null) {
      return {
        ok: false,
        error: "Subcategoria de subcategoria não é suportada",
        fieldErrors: { parentId: "Escolha uma categoria-mãe (nível 1)" },
      };
    }
    resolvedKind = parent.kind;
    resolvedParentId = parent.id;
  }

  if (!resolvedKind) {
    return {
      ok: false,
      error: "Tipo obrigatório",
      fieldErrors: { kind: "Selecione o tipo" },
    };
  }

  const [row] = await db
    .insert(categories)
    .values({
      userId,
      parentId: resolvedParentId,
      name,
      kind: resolvedKind,
      icon: icon ?? null,
      isSystem: false,
    })
    .returning({ id: categories.id });

  revalidatePath("/configuracoes");
  return { ok: true, data: { id: row.id } };
}

export async function updateCategoryAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = categoryUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }
  const { name, icon } = parsed.data;

  // Só permite editar categoria do próprio usuário (não-seed).
  const result = await db
    .update(categories)
    .set({ name, icon: icon ?? null })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  if (result.count === 0) {
    return {
      ok: false,
      error:
        "Não é possível editar — categoria não encontrada ou pertence ao sistema.",
    };
  }

  revalidatePath("/configuracoes");
  return { ok: true, data: undefined };
}

export async function archiveCategoryAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const cat = await loadAccessibleCategory(userId, id);
  if (!cat) {
    return { ok: false, error: "Categoria não encontrada" };
  }

  // Mãe com filhos visíveis: bloqueia (arquive os filhos primeiro).
  if (cat.parentId === null) {
    const children = await countVisibleChildren(userId, cat.id);
    if (children > 0) {
      return {
        ok: false,
        error: `Esta categoria tem ${children} subcategoria${children > 1 ? "s" : ""} ativa${children > 1 ? "s" : ""}. Arquive-as primeiro.`,
      };
    }
  }

  if (cat.userId === userId) {
    // Custom: archive direto.
    await db
      .update(categories)
      .set({ archived: true })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  } else {
    // Seed: upsert override.
    await db
      .insert(categoryUserOverrides)
      .values({ userId, categoryId: id, archived: true })
      .onConflictDoUpdate({
        target: [categoryUserOverrides.userId, categoryUserOverrides.categoryId],
        set: { archived: true },
      });
  }

  revalidatePath("/configuracoes");
  revalidatePath("/transacoes");
  revalidatePath("/orcamento");
  return { ok: true, data: undefined };
}

export async function unarchiveCategoryAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const cat = await loadAccessibleCategory(userId, id);
  if (!cat) {
    return { ok: false, error: "Categoria não encontrada" };
  }

  if (cat.userId === userId) {
    await db
      .update(categories)
      .set({ archived: false })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  } else {
    await db
      .delete(categoryUserOverrides)
      .where(
        and(
          eq(categoryUserOverrides.userId, userId),
          eq(categoryUserOverrides.categoryId, id),
        ),
      );
  }

  revalidatePath("/configuracoes");
  revalidatePath("/transacoes");
  revalidatePath("/orcamento");
  return { ok: true, data: undefined };
}

/** Hard-delete: só permite se for custom do user E sem uso (zero refs). */
export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const cat = await loadAccessibleCategory(userId, id);
  if (!cat) {
    return { ok: false, error: "Categoria não encontrada" };
  }
  if (cat.userId !== userId) {
    return {
      ok: false,
      error: "Categorias do sistema não podem ser excluídas — apenas arquivadas.",
    };
  }

  const usage = await countCategoryUsage(userId, id);
  if (usage.total > 0) {
    return {
      ok: false,
      error: `Esta categoria está em uso (${usage.transactions} transações, ${usage.budgets} orçamentos, ${usage.recurring} recorrências). Arquive em vez de excluir.`,
    };
  }

  // Também bloqueia se tem filhos quaisquer (visíveis ou não) — pra evitar órfãos.
  const [hasChildren] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(categories)
    .where(eq(categories.parentId, id));
  if ((hasChildren?.n ?? 0) > 0) {
    return {
      ok: false,
      error: "Esta categoria tem subcategorias. Exclua-as ou arquive a categoria.",
    };
  }

  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  revalidatePath("/configuracoes");
  return { ok: true, data: undefined };
}
