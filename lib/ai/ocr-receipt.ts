"use client";

import { ocrReceiptOutputSchema, type OcrReceiptOutput } from "./types";

export type OcrReceiptResult =
  | { ok: true; data: OcrReceiptOutput; receiptKey: string; cached: boolean }
  | { ok: false; error: string };

/**
 * Envia a foto do comprovante pro route handler, que sobe no Storage e
 * chama o Claude Vision com a chave BYOK (header `x-anthropic-key`).
 */
export async function ocrReceiptWithClaude({
  apiKey,
  file,
}: {
  apiKey: string;
  file: File;
}): Promise<OcrReceiptResult> {
  const formData = new FormData();
  formData.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/ai/ocr-receipt", {
      method: "POST",
      headers: { "x-anthropic-key": apiKey },
      body: formData,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro de rede." };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: `Servidor respondeu ${res.status} sem JSON válido.` };
  }

  if (!res.ok || !(body as { ok?: boolean }).ok) {
    return {
      ok: false,
      error: (body as { error?: string }).error ?? `HTTP ${res.status}`,
    };
  }

  const typed = body as { ok: true; data: unknown; receiptKey: string; cached: boolean };
  const parsed = ocrReceiptOutputSchema.safeParse(typed.data);
  if (!parsed.success) {
    return { ok: false, error: "Resposta da rota com schema inesperado." };
  }

  return {
    ok: true,
    data: parsed.data,
    receiptKey: typed.receiptKey,
    cached: typed.cached,
  };
}
