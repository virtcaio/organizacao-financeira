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
