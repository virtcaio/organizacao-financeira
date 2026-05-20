/**
 * Timezone-safe date helpers.
 *
 * Datas no app são strings ISO `YYYY-MM-DD` representando o dia no fuso
 * do usuário (default America/Sao_Paulo). Operações que dependem de "hoje"
 * ou de boundaries de mês devem usar estes helpers — nunca `new Date()` +
 * `getMonth()` direto, que em ambientes UTC (Vercel) causa off-by-one no
 * fim do mês.
 *
 * Referência: bug #10.
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Sao_Paulo";

/** Retorna YYYY-MM-DD no fuso do app pra um instante (default: agora). */
export function todayIso(at: Date = new Date()): string {
  // en-CA garante formato YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Primeiro dia do mês contendo `at`, no fuso do app. */
export function monthStartIso(at: Date = new Date()): string {
  return `${todayIso(at).slice(0, 8)}01`;
}

/** Último dia do mês contendo `at`, no fuso do app. */
export function monthEndIso(at: Date = new Date()): string {
  const today = todayIso(at);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  // Math UTC pra calcular last day — não depende de fuso porque só usa year+month.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${today.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

/** Primeiro dia do mês N meses antes do mês contendo `at`. */
export function monthStartIsoBack(monthsBack: number, at: Date = new Date()): string {
  const today = todayIso(at);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  let targetMonth = month - monthsBack;
  let targetYear = year;
  while (targetMonth <= 0) {
    targetMonth += 12;
    targetYear -= 1;
  }
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
}
