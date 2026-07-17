import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiRuns } from "@/lib/db/schema";

// Parte pura (hash + JSON canônico) vive em dedup-core.ts — testável sem DB.
export { canonicalJson, hashInput } from "@/lib/ai/dedup-core";

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
