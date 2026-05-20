import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildAnthropicForRequest,
  DEFAULT_MODEL,
  sanitizeForLog,
} from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const apiKey = req.headers.get("x-anthropic-key")?.trim();
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { ok: false, error: "Chave ausente ou inválida no header." },
      { status: 400 },
    );
  }

  const client = buildAnthropicForRequest(apiKey);
  try {
    await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 8,
      messages: [{ role: "user", content: "ping" }],
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : "Falha desconhecida";
    const message = sanitizeForLog(raw);
    // Do NOT log the raw error — it could carry headers or stack frames.
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
