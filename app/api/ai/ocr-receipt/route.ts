import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiRuns } from "@/lib/db/schema";
import {
  buildAnthropicForRequest,
  DEFAULT_MODEL,
  sanitizeForLog,
} from "@/lib/ai/server";
import { buildOcrReceiptSystemPrompt } from "@/lib/ai/prompts/ocr-receipt";
import { ocrReceiptOutputSchema } from "@/lib/ai/types";
import { listCategoriesForUser } from "@/lib/db/queries/categories";
import { uploadReceipt, signedReceiptUrl, ACCEPTED_IMAGE_TYPES } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

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
    return NextResponse.json({ ok: false, error: "Imagem ausente." }, { status: 400 });
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { ok: false, error: "Envie uma imagem JPEG, PNG ou WebP." },
      { status: 400 },
    );
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `Imagem muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite: 10MB.`,
      },
      { status: 413 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const inputHash = createHash("sha256").update(buffer).digest("hex");

  // Sobe o comprovante no bucket privado (sempre — arquiva a foto).
  let receiptKey: string;
  try {
    receiptKey = await uploadReceipt(userId, file);
  } catch (err) {
    const message = sanitizeForLog(
      err instanceof Error ? err.message : "Falha no upload.",
    );
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  // Dedup: mesma imagem já lida antes? Reaproveita o resultado, poupa a IA.
  const cached = await db
    .select({ output: aiRuns.output })
    .from(aiRuns)
    .where(
      and(
        eq(aiRuns.userId, userId),
        eq(aiRuns.kind, "ocr_receipt"),
        eq(aiRuns.inputHash, inputHash),
      ),
    )
    .limit(1);

  if (cached[0]) {
    const reparsed = ocrReceiptOutputSchema.safeParse(cached[0].output);
    if (reparsed.success) {
      return NextResponse.json({
        ok: true,
        data: reparsed.data,
        receiptKey,
        cached: true,
      });
    }
  }

  // Signed URL temporária pra o Claude buscar a imagem.
  let imageUrl: string;
  try {
    imageUrl = await signedReceiptUrl(receiptKey, 300);
  } catch (err) {
    const message = sanitizeForLog(
      err instanceof Error ? err.message : "Falha ao gerar URL.",
    );
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  const categories = await listCategoriesForUser(userId);
  const system = buildOcrReceiptSystemPrompt(categories);
  const client = buildAnthropicForRequest(apiKey);

  let response;
  try {
    response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
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
              type: "image",
              source: { type: "url", url: imageUrl },
            },
            {
              type: "text",
              text: "Leia este comprovante e responda apenas com o JSON conforme o schema do system prompt.",
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
      { ok: false, error: "A IA não respondeu em JSON válido. Tente outra foto." },
      { status: 502 },
    );
  }

  const result = ocrReceiptOutputSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        error: `Schema inesperado: ${result.error.issues[0]?.message ?? "desconhecido"}`,
      },
      { status: 502 },
    );
  }

  // Registra a execução (dedup futuro). Ignora conflito de corrida.
  await db
    .insert(aiRuns)
    .values({
      userId,
      kind: "ocr_receipt",
      inputHash,
      output: result.data,
      tokensIn: response.usage?.input_tokens ?? 0,
      tokensOut: response.usage?.output_tokens ?? 0,
    })
    .onConflictDoNothing();

  return NextResponse.json({
    ok: true,
    data: result.data,
    receiptKey,
    cached: false,
  });
}
