import { describe, expect, it } from "vitest";
import { parseOfx, type OfxStatement } from "@/lib/ofx/parse";

function sgml(trns: string, acct = "<BANKACCTFROM><BANKID>0260<ACCTID>123456</BANKACCTFROM>") {
  return `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<CURDEF>BRL
${acct}
<BANKTRANLIST>
<DTSTART>20260701
<DTEND>20260715
${trns}
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;
}

function trn(fitid: string, amount: string, date = "20260710", memo = "PADARIA") {
  return `<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>${date}
<TRNAMT>${amount}
<FITID>${fitid}
<MEMO>${memo}
</STMTTRN>`;
}

function ok(result: ReturnType<typeof parseOfx>): OfxStatement {
  expect(typeof result).toBe("object");
  return result as OfxStatement;
}

describe("parseOfx", () => {
  it("lê SGML 1.x sem closing tags e mapeia sinal → tipo", () => {
    const st = ok(parseOfx(sgml(trn("A1", "-150.00") + trn("A2", "3200.50"))));
    expect(st.transactions).toHaveLength(2);
    const [debit, credit] = [
      st.transactions.find((t) => t.fitid === "A1")!,
      st.transactions.find((t) => t.fitid === "A2")!,
    ];
    expect(debit.type).toBe("expense");
    expect(debit.amount).toBe(150);
    expect(credit.type).toBe("income");
    expect(credit.amount).toBe(3200.5);
  });

  it("aceita vírgula decimal e separador de milhar BR", () => {
    const st = ok(
      parseOfx(sgml(trn("B1", "-1234,56") + trn("B2", "-1.234,56") + trn("B3", "1,234.56"))),
    );
    expect(st.transactions.map((t) => t.amount)).toEqual([1234.56, 1234.56, 1234.56]);
  });

  it("não descarta silenciosamente valores com milhar (regressão do bug 13)", () => {
    const st = ok(parseOfx(sgml(trn("C1", "-1.234,56"))));
    expect(st.transactions).toHaveLength(1);
  });

  it("decodifica entidades SGML na descrição", () => {
    const st = ok(parseOfx(sgml(trn("D1", "-10.00", "20260710", "H&amp;M LOJA"))));
    expect(st.transactions[0].description).toContain("H&M");
  });

  it("detecta cartão de crédito via CCACCTFROM", () => {
    const st = ok(
      parseOfx(sgml(trn("E1", "-10.00"), "<CCACCTFROM><ACCTID>9999</CCACCTFROM>")),
    );
    expect(st.account.isCreditCard).toBe(true);
  });

  it("pula transação sem FITID e ordena por data", () => {
    const noFitid = `<STMTTRN>\n<DTPOSTED>20260711\n<TRNAMT>-5.00\n<MEMO>X\n</STMTTRN>`;
    const st = ok(
      parseOfx(sgml(trn("F2", "-1.00", "20260712") + noFitid + trn("F1", "-2.00", "20260709"))),
    );
    expect(st.transactions.map((t) => t.fitid)).toEqual(["F1", "F2"]);
  });

  it("retorna erros tipados pra entradas inválidas", () => {
    expect(parseOfx("")).toBe("empty");
    expect(parseOfx("<OFX></OFX>")).toBe("no_transactions");
  });
});
