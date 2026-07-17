import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  isLikelyAnthropicKey,
  buildAnthropicForRequest,
  DEFAULT_MODEL,
  sanitizeForLog,
} from "@/lib/ai/server";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }
  const userId = session.user.id;

  const rl = rateLimit(`validate-key:${userId}:${clientIpFromHeaders(req.headers)}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const apiKey = req.headers.get("x-anthropic-key")?.trim();
  if (!apiKey || !isLikelyAnthropicKey(apiKey)) {
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
