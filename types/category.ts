import { z } from "zod";

export const CATEGORY_KINDS = [
  "income",
  "expense",
  "investment",
  "transfer",
] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  income: "Receita",
  expense: "Despesa",
  investment: "Investimento",
  transfer: "Transferência",
};

const name = z
  .string()
  .trim()
  .min(1, "Dê um nome")
  .max(80, "Máximo 80 caracteres");

const icon = z.string().trim().max(8, "Ícone muito longo").optional();

const parentId = z.string().uuid("Categoria-mãe inválida").optional();

/**
 * Input pra criar categoria.
 * - Se `parentId` ausente: cria categoria-mãe, `kind` obrigatório.
 * - Se `parentId` presente: cria subcategoria, `kind` herda da mãe (ignorado se vier).
 */
export const categoryCreateSchema = z
  .object({
    name,
    icon,
    kind: z.enum(CATEGORY_KINDS).optional(),
    parentId,
  })
  .refine((d) => !!d.parentId || !!d.kind, {
    message: "Selecione o tipo (Receita / Despesa / etc.)",
    path: ["kind"],
  });

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

/** Update só permite editar nome e ícone. Kind e parent são imutáveis. */
export const categoryUpdateSchema = z.object({
  name,
  icon,
});

export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
