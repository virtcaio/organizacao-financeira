/**
 * Storage helpers for the BYOK Anthropic API key.
 *
 * The key lives ONLY in the browser's localStorage. It is never sent to our backend.
 * Every Claude call originates from the client.
 */

const KEY_STORAGE = "anthropic_api_key";

export function getAnthropicApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_STORAGE);
}

export function setAnthropicApiKey(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_STORAGE, key.trim());
}

export function clearAnthropicApiKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY_STORAGE);
}

/** Mask a key for display: shows the first 6 and last 4 chars only. */
export function maskApiKey(key: string): string {
  if (key.length <= 12) return "•".repeat(key.length);
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
