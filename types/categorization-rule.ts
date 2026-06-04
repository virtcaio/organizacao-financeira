import { z } from "zod";

const pattern = z
  .string()
  .trim()
  .min(1, "Padrão obrigatório")
  .max(200, "Máximo 200 caracteres");

const categoryId = z.string().uuid("Categoria inválida");

const priority = z
  .number()
  .int("Prioridade deve ser inteira")
  .min(0, "Mínimo 0")
  .max(9999, "Máximo 9999")
  .optional();

export const ruleCreateSchema = z.object({
  pattern,
  categoryId,
  priority,
});

export type RuleCreateInput = z.infer<typeof ruleCreateSchema>;

export const ruleUpdateSchema = z.object({
  pattern: pattern.optional(),
  categoryId: categoryId.optional(),
  priority,
});

export type RuleUpdateInput = z.infer<typeof ruleUpdateSchema>;
