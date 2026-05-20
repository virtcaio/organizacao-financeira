import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildAnthropicForRequest,
  DEFAULT_MODEL,
  sanitizeForLog,
} from "@/lib/ai/server";
import { buildImportPdfSystemPrompt } from "@/lib/ai/prompts/import-pdf";
import { importPdfOutputSchema } from "@/lib/ai/types";
import { listCategoriesForUser } from "@/lib/db/queries/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // up to 120s (Anthropic doc-PDF can take >40s for big files)

const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;

function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((b): b is { type: "text"; text: string } => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }
  const userId = session.user.id;

  const apiKey = req.headers.get("x-anthropic-key")?.trim();
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { ok: false, error: "Chave Anthropic ausente. Configure em /configuracoes." },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Multipart inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Arquivo PDF ausente." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ ok: false, error: "Envie um arquivo PDF." }, { status: 400 });
  }
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `PDF muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite: 20MB.`,
      },
      { status: 413 },
    );
  }

  // PDF → base64 (server side, never touches disk)
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  // System prompt with the user's category catalog
  const categories = await listCategoriesForUser(userId);
  const system = buildImportPdfSystemPrompt(categories);

  const client = buildAnthropicForRequest(apiKey);

  let response;
  try {
    response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text:
                "Extraia todas as transações da fatura deste PDF e responda apenas com JSON válido conforme o schema definido no system prompt.",
            },
          ],
        },
      ],
    });
  } catch (err: unknown) {
    const message = sanitizeForLog(
      err instanceof Error ? err.message : "Erro desconhecido na chamada da IA.",
    );
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  const text = extractText(response.content as Array<{ type: string; text?: string }>);
  if (!text) {
    return NextResponse.json(
      { ok: false, error: "Resposta vazia da IA." },
      { status: 502 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "A IA não respondeu em JSON válido. Tente novamente ou envie outro PDF.",
      },
      { status: 502 },
    );
  }

  const result = importPdfOutputSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        error: `Schema inesperado: ${result.error.issues[0]?.message ?? "desconhecido"}`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: result.data,
    tokensIn: response.usage?.input_tokens ?? 0,
    tokensOut: response.usage?.output_tokens ?? 0,
    // Cache hint for debugging (Anthropic returns these usage fields when cache is active)
    cacheReads: response.usage?.cache_read_input_tokens ?? 0,
    cacheCreations: response.usage?.cache_creation_input_tokens ?? 0,
  });
}
