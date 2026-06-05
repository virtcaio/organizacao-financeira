import "server-only";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiRuns } from "@/lib/db/schema";

/**
 * Helper compartilhado pra dedup de chamadas IA via `ai_run`.
 * Cada endpoint que paga tokens (OCR, PDF, categorize) hasheia seu input,
 * consulta o cache, e se hit, devolve o output sem chamar a IA.
 *
 * Nota sobre nomes legacy: `categorize_csv` foi nomeado antes do OFX existir.
 * Hoje cobre OFX (também é categorize-imported). Não vou renomear via migration
 * — só comentário explicando.
 */

export type AiRunKind =
  | "categorize_csv"
  | "categorize_pdf"
  | "ocr_receipt"
  | "insight"
  | "projection";

/** Hash sha256 hex de um buffer ou string. */
export function hashInput(input: Buffer | string): string {
  const data = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Procura um cache hit em ai_run. Retorna o output bruto (jsonb).
 * Caller faz safeParse contra seu schema antes de devolver pro cliente.
 */
export async function findAiRunCache(
  userId: string,
  kind: AiRunKind,
  inputHash: string,
): Promise<unknown | null> {
  const [row] = await db
    .select({ output: aiRuns.output })
    .from(aiRuns)
    .where(
      and(
        eq(aiRuns.userId, userId),
        eq(aiRuns.kind, kind),
        eq(aiRuns.inputHash, inputHash),
      ),
    )
    .limit(1);
  return row?.output ?? null;
}

/**
 * Salva uma execução IA pra dedup futuro. Idempotente via unique index
 * `(userId, kind, inputHash)`. Conflitos são silenciados (concurrent insert).
 */
export async function saveAiRun(args: {
  userId: string;
  kind: AiRunKind;
  inputHash: string;
  output: unknown;
  tokensIn?: number;
  tokensOut?: number;
}): Promise<void> {
  await db
    .insert(aiRuns)
    .values({
      userId: args.userId,
      kind: args.kind,
      inputHash: args.inputHash,
      output: args.output as object,
      tokensIn: args.tokensIn ?? 0,
      tokensOut: args.tokensOut ?? 0,
    })
    .onConflictDoNothing();
}

/**
 * Serializa um valor pra JSON canônico (chaves ordenadas, sem espaços),
 * pra usar como input de hashInput em endpoints que recebem listas/objetos.
 * Garante que mesma "pergunta lógica" gera mesmo hash.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const inner = keys
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",");
  return `{${inner}}`;
}
