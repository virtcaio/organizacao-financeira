import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres"),
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Nome muito curto").max(80),
    email: z.string().email("E-mail inválido"),
    password: z
      .string()
      .min(8, "Senha precisa ter pelo menos 8 caracteres")
      .max(128, "Senha longa demais")
      .refine(
        (v) => /[a-zA-Z]/.test(v) && /\d/.test(v),
        "Use ao menos uma letra e um número",
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
