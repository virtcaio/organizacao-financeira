/**
 * Client-side helpers that talk to our own `/api/ai/*` route handlers.
 *
 * The Anthropic SDK is server-only (it imports node:fs via its agent-toolset
 * and breaks Turbopack's browser bundle). The user's key still lives only in
 * localStorage; it is sent as a request header per call and discarded after.
 */

export async function validateAnthropicKey(apiKey: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const res = await fetch("/api/ai/validate-key", {
      method: "POST",
      headers: {
        "x-anthropic-key": apiKey,
      },
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (data.ok) return { ok: true };
    return { ok: false, error: data.error ?? "Falha ao validar a chave." };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro de rede ao validar a chave.",
    };
  }
}
