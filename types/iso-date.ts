import { z } from "zod";

/**
 * Valida que a string é uma data ISO YYYY-MM-DD que existe de verdade.
 * Regex sozinho aceitava "2026-13-40" — que passava pela borda (inclusive
 * vinda da IA) e estourava só no Postgres, com erro opaco.
 */
export function isRealIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Schema Zod reutilizável pra datas ISO reais. */
export const isoDateString = z
  .string()
  .trim()
  .refine(isRealIsoDate, "Data inválida");
