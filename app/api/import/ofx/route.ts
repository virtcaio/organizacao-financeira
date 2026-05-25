import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseOfx } from "@/lib/ofx/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OFX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB cobre extratos longos

function detectEncoding(headerBytes: Buffer): string {
  // OFX 1.x carrega cabeçalho `CHARSET:1252` (ou similar) antes do corpo.
  // OFX 2.x é XML com <?xml encoding="..."?>.
  const head = headerBytes.toString("ascii");
  const charsetMatch = head.match(/CHARSET[:=]\s*([0-9A-Za-z-]+)/i);
  if (charsetMatch) {
    const c = charsetMatch[1].toLowerCase();
    if (c.includes("1252") || c.includes("latin") || c === "iso-8859-1") {
      return "windows-1252";
    }
  }
  const xmlEnc = head.match(/<\?xml[^>]*encoding=["']([^"']+)/i);
  if (xmlEnc) {
    const c = xmlEnc[1].toLowerCase();
    if (c.includes("1252") || c.includes("latin") || c === "iso-8859-1") {
      return "windows-1252";
    }
  }
  return "utf-8";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Multipart inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Arquivo OFX ausente." }, { status: 400 });
  }
  if (file.size > MAX_OFX_SIZE_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite: 5MB.`,
      },
      { status: 413 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const encoding = detectEncoding(buffer.subarray(0, 500));

  let content: string;
  try {
    content = new TextDecoder(encoding).decode(arrayBuffer);
  } catch {
    content = new TextDecoder("utf-8").decode(arrayBuffer);
  }

  const result = parseOfx(content);
  if (typeof result === "string") {
    const messages: Record<string, string> = {
      empty: "Arquivo vazio.",
      no_transactions: "Nenhuma transação encontrada no OFX.",
      invalid_format: "Formato OFX inválido.",
    };
    return NextResponse.json(
      { ok: false, error: messages[result] ?? "OFX inválido." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, data: result, encoding });
}
