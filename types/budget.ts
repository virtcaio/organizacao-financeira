import { z } from "zod";

const uuid = z.string().uuid("Categoria inválida");

const monthIso = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}-01$/.test(v), "Mês inválido (esperado YYYY-MM-01)");

const limitAmount = z
  .string()
  .trim()
  .transform((v) => v.replace(",", "."))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Valor inválido")
  .refine((v) => Number(v) > 0, "Valor precisa ser maior que zero");

export const budgetInputSchema = z.object({
  categoryId: uuid,
  month: monthIso,
  limit: limitAmount,
});

export type BudgetInput = z.infer<typeof budgetInputSchema>;

export type BudgetRow = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryParentName: string | null;
  isParent: boolean;
  limit: number;
  spent: number;
  remaining: number;
  percent: number; // 0..200+ (clamp na UI se precisar)
  status: "ok" | "warning" | "exceeded";
};

export type BudgetSummary = {
  totalLimit: number;
  totalSpent: number;
  totalRemaining: number;
  percent: number;
};
