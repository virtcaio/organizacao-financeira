"use client";

import {
  categorizeImportedOutputSchema,
  type CategorizeImportedOutput,
} from "./types";

export type CategorizeItem = {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
};

export type CategorizeImportedResult =
  | { ok: true; data: CategorizeImportedOutput }
  | { ok: false; error: string };

export async function categorizeImportedWithClaude({
  apiKey,
  items,
}: {
  apiKey: string;
  items: CategorizeItem[];
}): Promise<CategorizeImportedResult> {
  let res: Response;
  try {
    res = await fetch("/api/ai/categorize-imported", {
      method: "POST",
      headers: {
        "x-anthropic-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ items }),
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

  const typed = body as { data: unknown };
  const parsed = categorizeImportedOutputSchema.safeParse(typed.data);
  if (!parsed.success) {
    return { ok: false, error: "Resposta da rota com schema inesperado." };
  }
  return { ok: true, data: parsed.data };
}
