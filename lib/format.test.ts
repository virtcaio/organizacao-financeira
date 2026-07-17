import { describe, expect, it } from "vitest";
import { amountDisplay, formatCurrency, formatDate } from "@/lib/format";

/** Intl usa NBSP/narrow-NBSP entre "R$" e o número — normaliza pra comparar. */
function norm(s: string): string {
  return s.replace(/[\ \ ]/g, " ");
}

describe("formatCurrency", () => {
  it("formata string numeric(14,2) em pt-BR", () => {
    expect(norm(formatCurrency("1234.56"))).toBe("R$ 1.234,56");
    expect(norm(formatCurrency(0.5))).toBe("R$ 0,50");
  });

  it("string não-numérica vira R$ 0,00 (não NaN)", () => {
    expect(norm(formatCurrency("abc"))).toBe("R$ 0,00");
  });

  it("suporta USD e EUR", () => {
    expect(norm(formatCurrency("10", "USD"))).toContain("US$");
    expect(norm(formatCurrency("10", "EUR"))).toContain("€");
  });
});

describe("formatDate", () => {
  it("preserva o componente dia de ISO strings (não desloca em UTC-3)", () => {
    expect(formatDate("2026-07-17", { day: "2-digit", month: "2-digit", year: "numeric" })).toBe(
      "17/07/2026",
    );
  });
});

describe("amountDisplay", () => {
  it("income é + verde, expense é − vermelho", () => {
    expect(amountDisplay("income", 10)).toEqual({ sign: "+ ", valueClass: "text-income" });
    expect(amountDisplay("expense", 10)).toEqual({ sign: "− ", valueClass: "text-expense" });
  });

  it("transfer e adjustment seguem o sinal do amount (regressão do bug 3)", () => {
    expect(amountDisplay("transfer", -10).sign).toBe("− ");
    expect(amountDisplay("transfer", 10).sign).toBe("+ ");
    expect(amountDisplay("adjustment", 100)).toEqual({
      sign: "+ ",
      valueClass: "text-income",
    });
    expect(amountDisplay("adjustment", -100)).toEqual({
      sign: "− ",
      valueClass: "text-expense",
    });
  });
});
