/**
 * Normalização de entrada monetária humana → string decimal com ponto.
 *
 * Aceita os formatos que usuários BR realmente digitam:
 *   "1234" · "12,34" · "12.34" · "1.234,56" · "1,234.56" · "1.000" · "R$ 1.000,50"
 *
 * Regra: quando há os dois separadores, o último é o decimal e o outro é
 * milhar. Com um separador só, é decimal se tiver 1–2 dígitos depois; com 3
 * dígitos depois (ou repetido), é milhar. Mesma lógica do parser OFX
 * (`lib/ofx/parse.ts`). Ver guia de estilo §7 e issue #61.
 */
export function normalizeAmountInput(raw: string): string {
  let s = raw.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  const negative = s.startsWith("-");
  if (negative) s = s.slice(1);

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    s =
      lastComma > lastDot
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      s = parts.join(".");
    } else if (parts[0] !== "0") {
      // "1,234" / "1,234,567" → separador de milhar
      s = parts.join("");
    } else {
      // "0,500" não é agrupamento válido — deixa cair na validação (inválido)
      s = parts.join(".");
    }
  } else if (lastDot > -1) {
    const parts = s.split(".");
    if (
      (parts.length > 2 || parts[parts.length - 1].length === 3) &&
      parts[0] !== "0"
    ) {
      // "1.234" / "1.234.567" → separador de milhar
      s = parts.join("");
    }
  }
  return negative ? `-${s}` : s;
}
