import { NextResponse } from "next/server";
import { z } from "zod";
import { isoDateString } from "@/types/iso-date";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialAccounts, transactions } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { incrementHitCounts } from "@/lib/db/queries/categorization-rules";
import { categoriesAreAccessible } from "@/lib/db/queries/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rowSchema = z.object({
  type: z.enum(["income", "expense"]),
  financialAccountId: z.string().uuid(),
  categoryId: z.string().uuid().nullable(),
  amount: z
    .string()
    .trim()
    .transform((v) => v.replace(",", "."))
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Valor inválido")
    .refine((v) => Number(v) > 0, "Valor precisa ser maior que zero"),
  currency: z.enum(["BRL", "USD", "EUR"]),
  date: isoDateString,
  description: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(1000).nullable().optional(),
  installmentSeq: z.number().int().positive().nullable().optional(),
  installmentTotal: z.number().int().positive().nullable().optional(),
  source: z.enum(["manual", "photo", "csv", "pdf", "ofx"]).optional(),
  /** ID externo (ex: FITID do OFX) — usado para dedup quando presente. */
  sourceRef: z.string().trim().max(128).nullable().optional(),
  /** Quando a categoria veio de uma regra de categorização — pra incrementar hitCount. */
  ruleId: z.string().uuid().nullable().optional(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: `Linha inválida: ${parsed.error.issues[0]?.message ?? "dados inválidos"}`,
      },
      { status: 400 },
    );
  }

  const { rows } = parsed.data;

  // Defense in depth: confirm accounts belong to this user
  const accountIds = Array.from(new Set(rows.map((r) => r.financialAccountId)));
  const owned = await db
    .select({ id: financialAccounts.id })
    .from(financialAccounts)
    .where(eq(financialAccounts.userId, userId));
  const ownedSet = new Set(owned.map((a) => a.id));
  for (const id of accountIds) {
    if (!ownedSet.has(id)) {
      return NextResponse.json(
        { ok: false, error: "Conta inválida no lote." },
        { status: 400 },
      );
    }
  }

  // Mesma checagem pra categorias (seed ou do próprio usuário).
  const categoryIds = rows
    .map((r) => r.categoryId)
    .filter((v): v is string => !!v);
  if (!(await categoriesAreAccessible(userId, categoryIds))) {
    return NextResponse.json(
      { ok: false, error: "Categoria inválida no lote." },
      { status: 400 },
    );
  }

  // Dedup: pra linhas com sourceRef, checa se já existe (userId, account,
  // source, sourceRef). Linhas sem sourceRef passam sempre.
  const refsOnly = rows
    .map((r) => r.sourceRef)
    .filter((v): v is string => !!v);
  const existingKeys = new Set<string>();
  if (refsOnly.length > 0) {
    const existing = await db
      .select({
        accountId: transactions.financialAccountId,
        source: transactions.source,
        sourceRef: transactions.sourceRef,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.sourceRef, refsOnly),
        ),
      );
    for (const e of existing) {
      if (e.sourceRef) {
        existingKeys.add(`${e.accountId}|${e.source}|${e.sourceRef}`);
      }
    }
  }

  // Dedup também dentro do próprio lote (dois FITIDs iguais no mesmo arquivo).
  const seenInBatch = new Set<string>();
  const toInsert = rows.filter((r) => {
    if (!r.sourceRef) return true;
    const key = `${r.financialAccountId}|${r.source ?? "pdf"}|${r.sourceRef}`;
    if (existingKeys.has(key) || seenInBatch.has(key)) return false;
    seenInBatch.add(key);
    return true;
  });

  if (toInsert.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, skipped: rows.length });
  }

  let insertedCount = 0;
  try {
    // onConflictDoNothing + índice único parcial (tx_user_source_ref_uq):
    // o check acima é UX; a constraint segura requests concorrentes.
    const inserted = await db
      .insert(transactions)
      .values(
        toInsert.map((r) => ({
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
          sourceRef: r.sourceRef ?? null,
          installmentSeq: r.installmentSeq ?? null,
          installmentTotal: r.installmentTotal ?? null,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: transactions.id });
    insertedCount = inserted.length;
  } catch {
    // Mensagem genérica: erro cru do Postgres não deve vazar pro cliente.
    return NextResponse.json(
      { ok: false, error: "Falha ao salvar o lote. Tente novamente." },
      { status: 500 },
    );
  }

  const skipped = rows.length - insertedCount;

  // Increment hitCount das regras que foram aplicadas no save (best-effort, não bloqueia).
  const ruleIds = toInsert.map((r) => r.ruleId).filter((v): v is string => !!v);
  if (ruleIds.length > 0) {
    try {
      await incrementHitCounts(userId, ruleIds);
    } catch {
      // intencional — telemetria de hitCount não deve quebrar o save
    }
  }

  return NextResponse.json({ ok: true, inserted: insertedCount, skipped });
}
