import { describe, expect, it } from "vitest";
import { describeAlert } from "@/lib/alerts/format";

function norm(s: string | null): string | null {
  return s ? s.replace(/[  ]/g, " ") : s;
}

describe("describeAlert", () => {
  it("budget_warning com percent e mês", () => {
    const d = describeAlert("budget_warning", {
      categoryName: "Alimentação",
      percent: 85,
      monthLabel: "2026-07",
    });
    expect(d.title).toBe("Orçamento de Alimentação em atenção");
    expect(d.detail).toBe("85% do limite usado em 2026-07");
    expect(d.href).toBe("/orcamento");
  });

  it("budget_exceeded com valores", () => {
    const d = describeAlert("budget_exceeded", {
      categoryName: "Lazer",
      limit: 500,
      spent: 620.5,
    });
    expect(d.title).toBe("Orçamento de Lazer estourado");
    expect(norm(d.detail)).toBe("R$ 620,50 gastos de um limite de R$ 500,00");
  });

  it("bill_due com valor e data", () => {
    const d = describeAlert("bill_due", {
      description: "Netflix",
      amount: "55.90",
      currency: "BRL",
      dueDate: "2026-07-20",
    });
    expect(d.title).toBe("Netflix está chegando");
    expect(norm(d.detail)).toContain("R$ 55,90");
    expect(d.detail).toContain("20");
    expect(d.href).toBe("/recorrencias");
  });

  it("payload incompleto não explode", () => {
    const d = describeAlert("budget_warning", {});
    expect(d.title).toContain("categoria");
    expect(d.detail).toBeNull();
  });
});
