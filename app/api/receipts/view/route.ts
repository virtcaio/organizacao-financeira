import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { signedReceiptUrl, isOwnReceiptKey } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Redireciona pra uma signed URL temporária do comprovante. Pensado pra uso
 * direto em `<img src="/api/receipts/view?key=...">` — gera uma URL fresca a
 * cada request, sem o client lidar com expiração.
 *
 * Só o dono acessa: a key tem o formato `${userId}/${uuid}.ext`.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key || !isOwnReceiptKey(key, session.user.id)) {
    return NextResponse.json(
      { ok: false, error: "Comprovante não encontrado" },
      { status: 404 },
    );
  }

  try {
    const url = await signedReceiptUrl(key, 300);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Falha ao acessar o comprovante" },
      { status: 502 },
    );
  }
}
