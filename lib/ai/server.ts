import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_MODEL = "claude-sonnet-4-6";

/**
 * Builds an Anthropic client on the SERVER using a per-request key.
 *
 * Important: the key is the user's own (BYOK) and trafficked in the request
 * header `x-anthropic-key`. We never persist it to the DB and never log it.
 * The client is created per-request and discarded after the response.
 */
export function buildAnthropicForRequest(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

/** Mask anything that looks like an Anthropic API key in a string. */
export function sanitizeForLog(s: string): string {
  return s.replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-***");
}

const ANTHROPIC_KEY_RE = /^sk-ant-[A-Za-z0-9_-]{16,}$/;

/**
 * Checagem de formato da chave BYOK antes de qualquer chamada. Não valida a
 * chave de verdade (isso é o /api/ai/validate-key) — só corta lixo óbvio.
 */
export function isLikelyAnthropicKey(key: string): boolean {
  return ANTHROPIC_KEY_RE.test(key);
}
