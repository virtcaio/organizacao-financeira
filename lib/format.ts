export const SUPPORTED_CURRENCIES = ["BRL", "USD", "EUR"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

const FORMATTERS = new Map<string, Intl.NumberFormat>();

function formatter(currency: string): Intl.NumberFormat {
  let fmt = FORMATTERS.get(currency);
  if (!fmt) {
    fmt = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    FORMATTERS.set(currency, fmt);
  }
  return fmt;
}

export function formatCurrency(value: string | number, currency: string = "BRL"): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return formatter(currency).format(0);
  return formatter(currency).format(n);
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  // Strings ISO YYYY-MM-DD são parseadas explicitamente pra evitar a
  // ambiguidade de `new Date("YYYY-MM-DD")` (que vira UTC midnight e pode
  // exibir o dia anterior em fusos negativos). Formatamos em UTC pra
  // preservar o componente "dia" que veio do DB. Ver lib/date.ts e bug #10.
  let d: Date;
  let timeZone: string | undefined;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    d = new Date(Date.UTC(year, month - 1, day));
    timeZone = "UTC";
  } else {
    d = typeof date === "string" ? new Date(date) : date;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    ...(timeZone ? { timeZone } : {}),
    ...(opts ?? { dateStyle: "medium" }),
  }).format(d);
}
