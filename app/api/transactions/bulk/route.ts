import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialAccounts, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  description: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(1000).nullable().optional(),
  installmentSeq: z.number().int().positive().nullable().optional(),
  installmentTotal: z.number().int().positive().nullable().optional(),
  source: z.enum(["manual", "photo", "csv", "pdf"]).optional(),
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

  try {
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
      })),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha ao inserir";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}
