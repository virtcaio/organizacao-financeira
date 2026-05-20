"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signUpSchema } from "@/types/auth";

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string; field?: "name" | "email" | "password" | "confirmPassword" };

export async function registerUserAction(formData: FormData): Promise<RegisterResult> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first.message,
      field: first.path[0] as RegisterResult extends { field?: infer F } ? F : never,
    };
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing) {
    return { ok: false, error: "Já existe uma conta com este e-mail", field: "email" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    name,
    email: normalizedEmail,
    passwordHash,
  });

  return { ok: true };
}
