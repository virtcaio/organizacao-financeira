import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  buildAnthropicForRequest,
  DEFAULT_MODEL,
  sanitizeForLog,
} from "@/lib/ai/server";
import { buildCategorizeImportedSystemPrompt } from "@/lib/ai/prompts/categorize-imported";
import { categorizeImportedOutputSchema } from "@/lib/ai/types";
import { listCategoriesForUser } from "@/lib/db/queries/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(128),
        description: z.string().min(1).max(300),
        amount: z.number(),
        type: z.enum(["income", "expense"]),
      }),
    )
    .min(1)
    .max(500),
});

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const parsedReq = requestSchema.safeParse(body);
  if (!parsedReq.success) {
    return NextResponse.json(
      {
        ok: false,
        error: `Entrada inválida: ${parsedReq.error.issues[0]?.message ?? "desconhecida"}`,
      },
      { status: 400 },
    );
  }

  const categories = await listCategoriesForUser(userId);
  const system = buildCategorizeImportedSystemPrompt(categories);
  const client = buildAnthropicForRequest(apiKey);

  const userPayload = JSON.stringify({ items: parsedReq.data.items });

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
              type: "text",
              text: `Categorize as transações abaixo. Preserve o "id" exatamente. Responda apenas com JSON.\n\n${userPayload}`,
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
    return NextResponse.json({ ok: false, error: "Resposta vazia da IA." }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    return NextResponse.json(
      { ok: false, error: "A IA não respondeu em JSON válido." },
      { status: 502 },
    );
  }

  const result = categorizeImportedOutputSchema.safeParse(parsed);
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
    cacheReads: response.usage?.cache_read_input_tokens ?? 0,
    cacheCreations: response.usage?.cache_creation_input_tokens ?? 0,
  });
}
