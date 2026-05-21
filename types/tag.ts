import { z } from "zod";

/** Cores predefinidas pra tags. Chave salva no DB; UI mapeia pra classe. */
export const TAG_COLORS = [
  "slate",
  "red",
  "amber",
  "green",
  "blue",
  "violet",
  "pink",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export const tagInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome à tag")
    .max(64, "Máximo 64 caracteres"),
  color: z.enum(TAG_COLORS).optional(),
});

export type TagInput = z.infer<typeof tagInputSchema>;

export type Tag = {
  id: string;
  name: string;
  color: TagColor | null;
};
