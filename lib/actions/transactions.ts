"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  transactions,
  financialAccounts,
  categories,
  tags,
  transactionTags,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-helpers";
import { transactionInputSchema, transferInputSchema } from "@/types/transaction";
import { getTagsByTransactionIds } from "@/lib/db/queries/tags";
import type { Tag } from "@/types/tag";
import { randomUUID } from "node:crypto";
import { removeReceipt, isOwnReceiptKey } from "@/lib/storage";

/**
 * Substitui as tags de uma transação pelas informadas.
 * Filtra tagIds que não pertencem ao usuário (defense-in-depth).
 */
async function syncTransactionTags(
  userId: string,
  transactionId: string,
  tagIds: string[] | undefined,
) {
  await db
    .delete(transactionTags)
    .where(eq(transactionTags.transactionId, transactionId));

  if (!tagIds || tagIds.length === 0) return;

  const owned = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)));
  const ownedIds = owned.map((t) => t.id);
  if (ownedIds.length === 0) return;

  await db
    .insert(transactionTags)
    .values(ownedIds.map((tagId) => ({ transactionId, tagId })));
}

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
  transferPairId: string | null;
  receiptKey: string | null;
  tags: Tag[];
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
      transferPairId: transactions.transferPairId,
      sourceRef: transactions.sourceRef,
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

  const tagsByTx = await getTagsByTransactionIds(
    userId,
    rows.map((r) => r.id),
  );

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
    transferPairId: r.transferPairId,
    receiptKey: r.sourceRef,
    tags: tagsByTx.get(r.id) ?? [],
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

  // Comprovante anexado (vindo do OCR). Só aceita key do próprio usuário.
  const hasReceipt = !!data.receiptKey && isOwnReceiptKey(data.receiptKey, userId);

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
      source: hasReceipt ? "photo" : "manual",
      sourceRef: hasReceipt ? data.receiptKey : null,
    })
    .returning({ id: transactions.id });

  await syncTransactionTags(userId, row.id, data.tagIds);

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

  await syncTransactionTags(userId, id, data.tagIds);

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();

  // Lê o comprovante antes de apagar — pra remover o arquivo do Storage.
  const [existing] = await db
    .select({ sourceRef: transactions.sourceRef })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);

  const result = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  if (result.count === 0) {
    return { ok: false, error: "Transação não encontrada" };
  }

  if (existing?.sourceRef && isOwnReceiptKey(existing.sourceRef, userId)) {
    await removeReceipt(existing.sourceRef);
  }

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

/**
 * Cria uma transferência: duas linhas type=transfer ligadas por
 * transferPairId. Linha de saída tem amount negativo, entrada positivo —
 * assim sum(amount) por conta dá o saldo correto e o par é distinguível.
 * Dashboard ignora type=transfer em receitas/despesas.
 */
export async function createTransferAction(
  raw: unknown,
): Promise<ActionResult<{ pairId: string }>> {
  const userId = await requireUserId();
  const parsed = transferInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const { fromAccountId, toAccountId, amount, date, description } = parsed.data;

  const accts = await db
    .select({
      id: financialAccounts.id,
      currency: financialAccounts.currency,
    })
    .from(financialAccounts)
    .where(eq(financialAccounts.userId, userId));
  const from = accts.find((a) => a.id === fromAccountId);
  const to = accts.find((a) => a.id === toAccountId);
  if (!from || !to) {
    return { ok: false, error: "Conta não encontrada" };
  }
  if (from.currency !== to.currency) {
    return {
      ok: false,
      error: "Transferência entre moedas diferentes ainda não é suportada",
      fieldErrors: { toAccountId: "Moeda diferente da conta de origem" },
    };
  }

  const outId = randomUUID();
  const inId = randomUUID();
  const currency = from.currency;

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values([
      {
        id: outId,
        userId,
        financialAccountId: fromAccountId,
        type: "transfer",
        amount: `-${amount}`,
        currency,
        date,
        description,
        transferPairId: inId,
        source: "manual",
      },
      {
        id: inId,
        userId,
        financialAccountId: toAccountId,
        type: "transfer",
        amount,
        currency,
        date,
        description,
        transferPairId: outId,
        source: "manual",
      },
    ]);
  });

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  return { ok: true, data: { pairId: outId } };
}

/** Atualiza valor/data/descrição de ambas as linhas de uma transferência. */
export async function updateTransferAction(
  lineId: string,
  raw: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = transferInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }
  const { amount, date, description } = parsed.data;

  const [line] = await db
    .select({ id: transactions.id, pairId: transactions.transferPairId })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, lineId),
        eq(transactions.userId, userId),
        eq(transactions.type, "transfer"),
      ),
    )
    .limit(1);
  if (!line || !line.pairId) {
    return { ok: false, error: "Transferência não encontrada" };
  }

  await db.transaction(async (tx) => {
    // A linha de saída mantém o sinal negativo; a de entrada, positivo.
    for (const id of [line.id, line.pairId!]) {
      const [current] = await tx
        .select({ amount: transactions.amount })
        .from(transactions)
        .where(eq(transactions.id, id))
        .limit(1);
      const isOutgoing = current ? Number(current.amount) < 0 : false;
      await tx
        .update(transactions)
        .set({
          amount: isOutgoing ? `-${amount}` : amount,
          date,
          description,
          updatedAt: new Date(),
        })
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    }
  });

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

/** Exclui ambas as linhas de uma transferência. */
export async function deleteTransferAction(lineId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const [line] = await db
    .select({ id: transactions.id, pairId: transactions.transferPairId })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, lineId),
        eq(transactions.userId, userId),
        eq(transactions.type, "transfer"),
      ),
    )
    .limit(1);
  if (!line) {
    return { ok: false, error: "Transferência não encontrada" };
  }

  const ids = line.pairId ? [line.id, line.pairId] : [line.id];
  await db
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), inArray(transactions.id, ids)));

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
