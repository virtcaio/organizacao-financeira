/**
 * Parte pura do dedup de chamadas IA — sem DB, sem "server-only".
 * Extraída de lib/ai/dedup.ts pra ser testável isoladamente.
 */

import { createHash } from "node:crypto";

/** Hash sha256 hex de um buffer ou string. */
export function hashInput(input: Buffer | string): string {
  const data = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return createHash("sha256").update(data).digest("hex");
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

/**
 * Hash versionado: prefixa o payload com um contexto (kind + versão do
 * prompt + modelo). Mudar o system prompt ou o modelo passa a invalidar o
 * cache de `ai_run` — antes, o mesmo PDF devolvia pra sempre o output da
 * primeira versão do prompt.
 */
export function hashInputVersioned(
  context: string,
  input: Buffer | string,
): string {
  const pre = Buffer.from(`${context}\n`, "utf8");
  const data = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return createHash("sha256").update(pre).update(data).digest("hex");
}
