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
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", opts ?? { dateStyle: "medium" }).format(d);
}
