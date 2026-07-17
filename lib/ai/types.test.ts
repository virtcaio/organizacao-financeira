import { describe, expect, it } from "vitest";
import {
  categorizeImportedOutputSchema,
  importPdfOutputSchema,
  ocrReceiptOutputSchema,
} from "@/lib/ai/types";

const UUID = "3f0c8a1e-6b3f-4b6f-9a1e-000000000001";

describe("importPdfOutputSchema", () => {
  const tx = {
    date: "2026-07-10",
    description: "MERCADO LIVRE",
    amount: 129.9,
    category_id: null,
    category_name: null,
  };

  it("aceita payload válido com parcelas e metadata", () => {
    const r = importPdfOutputSchema.safeParse({
      transactions: [
        { ...tx, category_id: UUID, installment_seq: 2, installment_total: 10 },
      ],
      card_metadata: {
        issuer: "Nubank",
        closing_date: "2026-07-03",
        due_date: "2026-07-10",
        total_amount: 1234.56,
      },
    });
    expect(r.success).toBe(true);
  });

  it("rejeita amount zero/negativo", () => {
    for (const amount of [0, -50]) {
      const r = importPdfOutputSchema.safeParse({ transactions: [{ ...tx, amount }] });
      expect(r.success, `amount: ${amount}`).toBe(false);
    }
  });

  it("rejeita data que não existe — a IA já devolveu coisas como 2026-13-40", () => {
    const r = importPdfOutputSchema.safeParse({
      transactions: [{ ...tx, date: "2026-13-40" }],
    });
    expect(r.success).toBe(false);
  });
});

describe("ocrReceiptOutputSchema", () => {
  it("aceita date null (comprovante sem data legível)", () => {
    const r = ocrReceiptOutputSchema.safeParse({
      amount: 25.5,
      date: null,
      merchant: null,
      description: "Almoço",
      category_id: null,
      category_name: null,
    });
    expect(r.success).toBe(true);
  });
});

describe("categorizeImportedOutputSchema", () => {
  it("aceita sugestões com category_id null", () => {
    const r = categorizeImportedOutputSchema.safeParse({
      suggestions: [{ id: "FIT1", category_id: null, category_name: null }],
    });
    expect(r.success).toBe(true);
  });

  it("rejeita category_id que não é uuid", () => {
    const r = categorizeImportedOutputSchema.safeParse({
      suggestions: [{ id: "FIT1", category_id: "não-uuid", category_name: null }],
    });
    expect(r.success).toBe(false);
  });
});
