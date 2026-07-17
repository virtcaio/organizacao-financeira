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
