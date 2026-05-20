import { z } from "zod";

export const FINANCIAL_ACCOUNT_TYPES = [
  "checking",
  "savings",
  "credit_card",
  "cash",
  "broker",
] as const;

export type FinancialAccountType = (typeof FINANCIAL_ACCOUNT_TYPES)[number];

export const FINANCIAL_ACCOUNT_TYPE_LABELS: Record<FinancialAccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  credit_card: "Cartão de crédito",
  cash: "Carteira (dinheiro)",
  broker: "Corretora / Broker",
};

export const SUPPORTED_CURRENCIES = ["BRL", "USD", "EUR"] as const;

const amountString = z
  .string()
  .trim()
  .transform((v) => v.replace(",", "."))
  .refine((v) => /^-?\d+(\.\d{1,2})?$/.test(v), "Valor monetário inválido");

export const financialAccountInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80, "Nome muito longo"),
  type: z.enum(FINANCIAL_ACCOUNT_TYPES),
  currency: z.enum(SUPPORTED_CURRENCIES),
  openingBalance: amountString,
});

export type FinancialAccountInput = z.infer<typeof financialAccountInputSchema>;
