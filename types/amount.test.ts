import { describe, expect, it } from "vitest";
import { normalizeAmountInput } from "@/types/amount";

describe("normalizeAmountInput", () => {
  it("vírgula decimal BR", () => {
    expect(normalizeAmountInput("12,34")).toBe("12.34");
    expect(normalizeAmountInput("10,5")).toBe("10.5");
  });

  it("milhar + decimal nos dois estilos (issue #61)", () => {
    expect(normalizeAmountInput("1.234,56")).toBe("1234.56");
    expect(normalizeAmountInput("1,234.56")).toBe("1234.56");
    expect(normalizeAmountInput("1.234.567,89")).toBe("1234567.89");
  });

  it("separador único com 3 dígitos é milhar", () => {
    expect(normalizeAmountInput("1.000")).toBe("1000");
    expect(normalizeAmountInput("1,234")).toBe("1234");
    expect(normalizeAmountInput("12.345")).toBe("12345");
  });

  it("prefixo R$ e espaços são ignorados", () => {
    expect(normalizeAmountInput("R$ 1.000,50")).toBe("1000.50");
    expect(normalizeAmountInput(" 1 000,50 ")).toBe("1000.50");
  });

  it("decimal com ponto (estilo en) continua funcionando", () => {
    expect(normalizeAmountInput("12.34")).toBe("12.34");
    expect(normalizeAmountInput("0.5")).toBe("0.5");
  });

  it("'0.500'/'0,500' não viram 500 (agrupamento não começa com 0)", () => {
    // Ficam com 3 casas e caem na validação de 2 decimais → inválido, não silencioso
    expect(normalizeAmountInput("0.500")).toBe("0.500");
    expect(normalizeAmountInput("0,500")).toBe("0.500");
  });

  it("preserva sinal negativo (saldo de conta)", () => {
    expect(normalizeAmountInput("-1.234,56")).toBe("-1234.56");
  });
});
