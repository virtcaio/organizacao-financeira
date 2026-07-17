/**
 * Parser de OFX (Open Financial Exchange) — versões 1.x (SGML) e 2.x (XML).
 *
 * Determinístico, sem dependências externas. Cobre os campos essenciais
 * de extrato bancário e fatura de cartão. Não valida o documento por
 * completo — extrai o que é útil pra importação.
 */

export type OfxTransactionType = "income" | "expense";

export type OfxTransaction = {
  fitid: string;
  date: string; // ISO YYYY-MM-DD
  amount: number; // valor absoluto
  type: OfxTransactionType;
  description: string;
};

export type OfxAccountInfo = {
  bankId: string | null;
  accountId: string | null;
  accountType: string | null;
  isCreditCard: boolean;
};

export type OfxStatement = {
  account: OfxAccountInfo;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  transactions: OfxTransaction[];
};

export type OfxParseError =
  | "empty"
  | "no_transactions"
  | "invalid_format";

/** Decodifica entidades SGML/XML comuns ("H&amp;M" → "H&M"). */
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function field(block: string, tag: string): string | null {
  // OFX 1.x (SGML) frequentemente omite a tag de fechamento — captura até
  // o próximo `<` ou quebra de linha.
  const re = new RegExp(`<${tag}>([^<\\n\\r]*)`);
  const m = block.match(re);
  return m ? decodeEntities(m[1].trim()) : null;
}

function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  // Formato OFX: YYYYMMDD ou YYYYMMDDHHMMSS[+/-TZ:NAME]
  if (!/^\d{8}/.test(raw)) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function parseAmount(raw: string | null): number | null {
  if (!raw) return null;
  // Bancos BR emitem vírgula decimal e às vezes separador de milhar
  // ("1.234,56", "-1234,56", "1,234.56"). Sem tratar o milhar, "1.234,56"
  // virava NaN e a transação era descartada em silêncio.
  let s = raw.replace(/\s/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // Ambos presentes: o que aparece por último é o decimal, o outro é milhar.
    s =
      lastComma > lastDot
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // Só vírgula: decimal (padrão BR); múltiplas vírgulas = milhar.
    const parts = s.split(",");
    s = parts.length === 2 ? parts.join(".") : parts.join("");
  } else if (lastDot > -1) {
    // Só ponto: decimal (padrão OFX); múltiplos pontos = milhar + decimal.
    const parts = s.split(".");
    if (parts.length > 2) {
      s = parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function joinDescription(memo: string | null, name: string | null): string {
  const parts = [name, memo].filter((s): s is string => !!s && s.length > 0);
  // Remove duplicação caso name esteja contido em memo
  if (parts.length === 2 && memo?.includes(name!)) {
    return memo;
  }
  const joined = parts.join(" — ").trim();
  return joined || "(sem descrição)";
}

export function parseOfx(content: string): OfxStatement | OfxParseError {
  if (!content || !content.trim()) return "empty";

  // Remove cabeçalho OFX 1.x (linhas até a primeira `<OFX>` ou `<?xml`)
  const ofxStart = content.search(/<OFX[>\s]|<\?xml/i);
  const body = ofxStart >= 0 ? content.slice(ofxStart) : content;

  if (!/<STMTTRN>/i.test(body)) return "no_transactions";

  const isCreditCard = /<CCSTMTTRNRS|<CCSTMTRS|<CCACCTFROM/i.test(body);

  // Extrai info da conta
  const acctBlock =
    body.match(/<(?:CCACCTFROM|BANKACCTFROM)>([\s\S]*?)<\/(?:CCACCTFROM|BANKACCTFROM)>/i)?.[1] ??
    "";
  const account: OfxAccountInfo = {
    bankId: field(acctBlock, "BANKID"),
    accountId: field(acctBlock, "ACCTID"),
    accountType: field(acctBlock, "ACCTTYPE"),
    isCreditCard,
  };

  // Moeda do statement
  const currency =
    body.match(/<CURDEF>([^<\n\r]+)/)?.[1]?.trim().toUpperCase() ?? "BRL";

  // Janela do statement (opcional, informativo)
  const banktranlist = body.match(
    /<BANKTRANLIST>([\s\S]*?)<\/BANKTRANLIST>/i,
  )?.[1] ?? "";
  const startDate = parseDate(field(banktranlist, "DTSTART"));
  const endDate = parseDate(field(banktranlist, "DTEND"));

  // Extrai cada transação
  const txMatches = [...body.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
  const transactions: OfxTransaction[] = [];
  for (const m of txMatches) {
    const block = m[1];
    const fitid = field(block, "FITID");
    const date = parseDate(field(block, "DTPOSTED"));
    const amountRaw = parseAmount(field(block, "TRNAMT"));
    const memo = field(block, "MEMO");
    const name = field(block, "NAME");

    if (!fitid || !date || amountRaw === null) continue;

    transactions.push({
      fitid,
      date,
      amount: Math.abs(amountRaw),
      type: amountRaw >= 0 ? "income" : "expense",
      description: joinDescription(memo, name),
    });
  }

  if (transactions.length === 0) return "no_transactions";

  // Ordena por data (mais antiga primeiro pra revisão linear)
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return { account, currency, startDate, endDate, transactions };
}
