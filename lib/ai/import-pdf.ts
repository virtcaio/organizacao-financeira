"use client";

import { importPdfOutputSchema, type ImportPdfOutput } from "./types";

export type ImportPdfResult =
  | { ok: true; data: ImportPdfOutput; tokensIn: number; tokensOut: number; cacheReads: number; cacheCreations: number }
  | { ok: false; error: string };

/**
 * Sends the PDF to our own server route which then calls Claude using the
 * user's BYOK key (sent in `x-anthropic-key`). The key is never persisted
 * or logged server-side.
 */
export async function importPdfWithClaude({
  apiKey,
  file,
}: {
  apiKey: string;
  file: File;
}): Promise<ImportPdfResult> {
  if (file.type !== "application/pdf") {
    return { ok: false, error: "Envie um arquivo PDF." };
  }

  const formData = new FormData();
  formData.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/ai/import-pdf", {
      method: "POST",
      headers: { "x-anthropic-key": apiKey },
      body: formData,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro de rede.",
    };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return {
      ok: false,
      error: `Servidor respondeu ${res.status} sem JSON válido.`,
    };
  }

  if (!res.ok || !(body as { ok?: boolean }).ok) {
    return {
      ok: false,
      error: (body as { error?: string }).error ?? `HTTP ${res.status}`,
    };
  }

  const typed = body as {
    ok: true;
    data: unknown;
    tokensIn: number;
    tokensOut: number;
    cacheReads: number;
    cacheCreations: number;
  };
  const parsed = importPdfOutputSchema.safeParse(typed.data);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Resposta da rota com schema inesperado.",
    };
  }

  return {
    ok: true,
    data: parsed.data,
    tokensIn: typed.tokensIn,
    tokensOut: typed.tokensOut,
    cacheReads: typed.cacheReads,
    cacheCreations: typed.cacheCreations,
  };
}
