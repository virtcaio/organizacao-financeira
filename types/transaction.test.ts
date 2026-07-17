import { describe, expect, it } from "vitest";
import {
  amountString,
  transactionInputSchema,
  transferInputSchema,
} from "@/types/transaction";

const UUID_A = "3f0c8a1e-6b3f-4b6f-9a1e-000000000001";
const UUID_B = "3f0c8a1e-6b3f-4b6f-9a1e-000000000002";

describe("amountString", () => {
  it("aceita vírgula decimal e normaliza pra ponto", () => {
    expect(amountString.parse("12,34")).toBe("12.34");
    expect(amountString.parse("10,5")).toBe("10.5");
    expect(amountString.parse("1000")).toBe("1000");
  });

  it("rejeita zero, negativo, milhar e 3 casas", () => {
    for (const v of ["0", "-5", "1.234,56", "1.999", "abc", ""]) {
      expect(amountString.safeParse(v).success, `valor: ${v}`).toBe(false);
    }
  });
});

describe("transactionInputSchema", () => {
  const base = {
    type: "expense",
    financialAccountId: UUID_A,
    categoryId: "",
    amount: "10,00",
    currency: "BRL",
    date: "2026-07-17",
    description: "Café",
  };

  it("aceita input válido", () => {
    expect(transactionInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita data que não existe (2026-13-40)", () => {
    expect(
      transactionInputSchema.safeParse({ ...base, date: "2026-13-40" }).success,
    ).toBe(false);
    expect(
      transactionInputSchema.safeParse({ ...base, date: "2026-02-30" }).success,
    ).toBe(false);
  });
});

describe("transferInputSchema", () => {
  const base = {
    fromAccountId: UUID_A,
    toAccountId: UUID_B,
    amount: "10,01",
    date: "2026-07-17",
    description: "Transferência",
  };

  it("aceita contas distintas", () => {
    expect(transferInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita mesma conta com erro no campo toAccountId", () => {
    const r = transferInputSchema.safeParse({ ...base, toAccountId: UUID_A });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(["toAccountId"]);
    }
  });
});
