"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, financialAccounts, categories } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-helpers";
import { transactionInputSchema } from "@/types/transaction";

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

export type TransactionListItem = {
  id: string;
  type: "income" | "expense" | "transfer" | "investment" | "adjustment";
  amount: string;
  currency: string;
  date: string;
  description: string;
  notes: string | null;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryParentName: string | null;
};

export async function listTransactionsAction(): Promise<TransactionListItem[]> {
  const userId = await requireUserId();
  const parentCategory = categories;
  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      currency: transactions.currency,
      date: transactions.date,
      description: transactions.description,
      notes: transactions.notes,
      accountId: transactions.financialAccountId,
      accountName: financialAccounts.name,
      categoryId: transactions.categoryId,
      categoryName: parentCategory.name,
      categoryParentId: parentCategory.parentId,
    })
    .from(transactions)
    .innerJoin(financialAccounts, eq(financialAccounts.id, transactions.financialAccountId))
    .leftJoin(parentCategory, eq(parentCategory.id, transactions.categoryId))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  // Resolve parent category name in JS to keep the SQL one join lighter.
  const parentIds = Array.from(
    new Set(rows.map((r) => r.categoryParentId).filter((v): v is string => !!v)),
  );
  const parents = parentIds.length
    ? await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.archived, false))
    : [];
  const parentNameById = new Map(parents.map((p) => [p.id, p.name]));

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    currency: r.currency,
    date: r.date,
    description: r.description,
    notes: r.notes,
    accountId: r.accountId,
    accountName: r.accountName,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    categoryParentName: r.categoryParentId
      ? parentNameById.get(r.categoryParentId) ?? null
      : null,
  }));
}

export async function createTransactionAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = transactionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const data = parsed.data;

  // Confirm the account belongs to the user (defense-in-depth on top of RLS).
  const [account] = await db
    .select({ id: financialAccounts.id })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, data.financialAccountId),
        eq(financialAccounts.userId, userId),
      ),
    )
    .limit(1);
  if (!account) {
    return { ok: false, error: "Conta não encontrada" };
  }

  const [row] = await db
    .insert(transactions)
    .values({
      userId,
      financialAccountId: data.financialAccountId,
      categoryId: data.categoryId ?? null,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      date: data.date,
      description: data.description,
      notes: data.notes ?? null,
      source: "manual",
    })
    .returning({ id: transactions.id });

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: row.id } };
}

export async function updateTransactionAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = transactionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const data = parsed.data;

  const result = await db
    .update(transactions)
    .set({
      financialAccountId: data.financialAccountId,
      categoryId: data.categoryId ?? null,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      date: data.date,
      description: data.description,
      notes: data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  if (result.count === 0) {
    return { ok: false, error: "Transação não encontrada" };
  }

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const result = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  if (result.count === 0) {
    return { ok: false, error: "Transação não encontrada" };
  }

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export type BulkTransactionInput = {
  type: "income" | "expense";
  financialAccountId: string;
  categoryId?: string | null;
  amount: string; // string to preserve precision
  currency: "BRL" | "USD" | "EUR";
  date: string; // YYYY-MM-DD
  description: string;
  notes?: string | null;
  installmentSeq?: number | null;
  installmentTotal?: number | null;
  installmentGroupId?: string | null;
  source?: "manual" | "photo" | "csv" | "pdf";
};

export async function createTransactionsBulkAction(
  rows: BulkTransactionInput[],
): Promise<ActionResult<{ inserted: number }>> {
  const userId = await requireUserId();
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "Nada para importar." };
  }

  // Validate each row server-side (defense-in-depth)
  for (const r of rows) {
    const parsed = transactionInputSchema.safeParse({
      type: r.type,
      financialAccountId: r.financialAccountId,
      categoryId: r.categoryId ?? "",
      amount: r.amount,
      currency: r.currency,
      date: r.date,
      description: r.description,
      notes: r.notes ?? "",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: `Linha inválida (${r.description || "sem descrição"}): ${parsed.error.issues[0]?.message ?? "dados inválidos"}`,
      };
    }
  }

  // Make sure all referenced accounts belong to the user
  const accountIds = Array.from(new Set(rows.map((r) => r.financialAccountId)));
  const owned = await db
    .select({ id: financialAccounts.id })
    .from(financialAccounts)
    .where(eq(financialAccounts.userId, userId));
  const ownedSet = new Set(owned.map((a) => a.id));
  for (const id of accountIds) {
    if (!ownedSet.has(id)) {
      return { ok: false, error: "Conta inválida no lote." };
    }
  }

  await db.insert(transactions).values(
    rows.map((r) => ({
      userId,
      financialAccountId: r.financialAccountId,
      categoryId: r.categoryId ?? null,
      type: r.type,
      amount: r.amount,
      currency: r.currency,
      date: r.date,
      description: r.description,
      notes: r.notes ?? null,
      source: r.source ?? "pdf",
      installmentSeq: r.installmentSeq ?? null,
      installmentTotal: r.installmentTotal ?? null,
      installmentGroupId: r.installmentGroupId ?? null,
    })),
  );

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  return { ok: true, data: { inserted: rows.length } };
}

export async function listAccountsForPickerAction() {
  const userId = await requireUserId();
  return db
    .select({
      id: financialAccounts.id,
      name: financialAccounts.name,
      currency: financialAccounts.currency,
      type: financialAccounts.type,
    })
    .from(financialAccounts)
    .where(
      and(eq(financialAccounts.userId, userId), eq(financialAccounts.archived, false)),
    )
    .orderBy(asc(financialAccounts.name));
}
