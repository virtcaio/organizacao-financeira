import { z } from "zod";

export const TRANSACTION_TYPES = ["income", "expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Receita",
  expense: "Despesa",
};

const amountString = z
  .string()
  .trim()
  .transform((v) => v.replace(",", "."))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Valor inválido")
  .refine((v) => Number(v) > 0, "Valor precisa ser maior que zero");

const isoDate = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida");

const uuid = z.string().uuid("Identificador inválido");
const optionalUuid = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(z.string().uuid("Categoria inválida").optional());

export const transactionInputSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  financialAccountId: uuid,
  categoryId: optionalUuid,
  amount: amountString,
  currency: z.enum(["BRL", "USD", "EUR"]),
  date: isoDate,
  description: z.string().trim().min(1, "Descreva a transação").max(200),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;
