/**
 * Lógica pura de recorrência — cálculo da próxima data de execução.
 * Sem dependência de DB; testável isoladamente.
 */

export const RECURRING_FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;

export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

/** Unidade no singular/plural pra montar "a cada N ...". */
export const FREQUENCY_UNIT: Record<RecurringFrequency, [string, string]> = {
  daily: ["dia", "dias"],
  weekly: ["semana", "semanas"],
  monthly: ["mês", "meses"],
  yearly: ["ano", "anos"],
};

function isoOf(dateUtc: Date): string {
  return dateUtc.toISOString().slice(0, 10);
}

/**
 * Calcula a próxima data de execução (YYYY-MM-DD) a partir de `current`.
 *
 * - daily/weekly: soma intervalo de dias/semanas.
 * - monthly/yearly: avança meses/anos e fixa no `dayOfMonth` (ou no dia de
 *   `current`), com clamp pro último dia do mês quando o dia não existe
 *   (ex: dia 31 em fevereiro → 28/29).
 */
export function nextRunDate(
  current: string,
  frequency: RecurringFrequency,
  interval: number,
  dayOfMonth: number | null,
): string {
  const y = Number(current.slice(0, 4));
  const m = Number(current.slice(5, 7)); // 1-12
  const d = Number(current.slice(8, 10));
  const step = Math.max(1, interval);

  if (frequency === "daily") {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + step);
    return isoOf(dt);
  }

  if (frequency === "weekly") {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + step * 7);
    return isoOf(dt);
  }

  if (frequency === "monthly") {
    const totalMonths = m - 1 + step; // 0-based
    const targetYear = y + Math.floor(totalMonths / 12);
    const targetMonth = totalMonths % 12; // 0-based
    const desiredDay = dayOfMonth ?? d;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const day = Math.min(desiredDay, lastDay);
    return isoOf(new Date(Date.UTC(targetYear, targetMonth, day)));
  }

  // yearly
  const targetYear = y + step;
  const desiredDay = dayOfMonth ?? d;
  const lastDay = new Date(Date.UTC(targetYear, m, 0)).getUTCDate();
  const day = Math.min(desiredDay, lastDay);
  return isoOf(new Date(Date.UTC(targetYear, m - 1, day)));
}

/** Descrição legível: "A cada 2 meses", "Mensal", etc. */
export function describeFrequency(
  frequency: RecurringFrequency,
  interval: number,
): string {
  if (interval <= 1) return FREQUENCY_LABELS[frequency];
  const [, plural] = FREQUENCY_UNIT[frequency];
  return `A cada ${interval} ${plural}`;
}
