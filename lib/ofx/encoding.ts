/**
 * Detecção de encoding de arquivos OFX — pura, testável isoladamente.
 * Extraída de app/api/import/ofx/route.ts.
 */

export function detectEncoding(headerBytes: Buffer): string {
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
