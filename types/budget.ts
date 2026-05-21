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

/** template = vale todo mês; month = ajuste pontual de um mês. */
export const BUDGET_SCOPES = ["template", "month"] as const;
export type BudgetScope = (typeof BUDGET_SCOPES)[number];

export const budgetInputSchema = z
  .object({
    categoryId: uuid,
    limit: limitAmount,
    scope: z.enum(BUDGET_SCOPES),
    month: monthIso.optional(),
  })
  .refine((d) => d.scope !== "month" || !!d.month, {
    message: "Mês obrigatório para ajuste mensal",
    path: ["month"],
  });

export type BudgetInput = z.infer<typeof budgetInputSchema>;

export type BudgetRow = {
  categoryId: string;
  categoryName: string;
  categoryParentName: string | null;
  isParent: boolean;
  /** Limite efetivo no mês (override se houver, senão template). */
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
  status: "ok" | "warning" | "exceeded";
  /** De onde vem o `limit`. */
  source: BudgetScope;
  /** Limite do template, se existir — pra comparar com o override. */
  templateLimit: number | null;
  templateId: string | null;
  overrideId: string | null;
};

export type BudgetSummary = {
  totalLimit: number;
  totalSpent: number;
  totalRemaining: number;
  percent: number;
};
