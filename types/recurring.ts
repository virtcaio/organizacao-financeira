import { z } from "zod";
import { RECURRING_FREQUENCIES } from "@/lib/recurring";
import { TRANSACTION_TYPES } from "@/types/transaction";

const uuid = z.string().uuid("Identificador inválido");

const optionalUuid = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(z.string().uuid("Categoria inválida").optional());

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

export const recurringRuleInputSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    financialAccountId: uuid,
    categoryId: optionalUuid,
    amount: amountString,
    currency: z.enum(["BRL", "USD", "EUR"]),
    description: z.string().trim().min(1, "Descreva a recorrência").max(200),
    frequency: z.enum(RECURRING_FREQUENCIES),
    interval: z.coerce.number().int().min(1, "Mínimo 1").max(365),
    dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
    startDate: isoDate,
    endDate: isoDate.optional(),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: "Data final deve ser depois do início",
    path: ["endDate"],
  });

export type RecurringRuleInput = z.infer<typeof recurringRuleInputSchema>;

export type RecurringRuleListItem = {
  id: string;
  type: "income" | "expense";
  financialAccountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  amount: string;
  currency: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  dayOfMonth: number | null;
  nextRunAt: string;
  endDate: string | null;
  paused: boolean;
};
