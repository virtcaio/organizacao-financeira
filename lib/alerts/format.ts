/**
 * Descrição legível de um alerta a partir de kind + payload.
 * Puro e client-safe — usado pelo sino do header e pela página /alertas.
 */

import { formatCurrency, formatDate } from "@/lib/format";
import type { AlertKind } from "@/types/alert";

export type AlertDescription = {
  title: string;
  detail: string | null;
  href: string | null;
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function describeAlert(
  kind: AlertKind,
  payload: Record<string, unknown>,
): AlertDescription {
  switch (kind) {
    case "budget_warning": {
      const cat = str(payload.categoryName) ?? "categoria";
      const percent = num(payload.percent);
      return {
        title: `Orçamento de ${cat} em atenção`,
        detail:
          percent !== null
            ? `${percent}% do limite usado${str(payload.monthLabel) ? ` em ${payload.monthLabel}` : ""}`
            : null,
        href: "/orcamento",
      };
    }
    case "budget_exceeded": {
      const cat = str(payload.categoryName) ?? "categoria";
      const limit = num(payload.limit);
      const spent = num(payload.spent);
      return {
        title: `Orçamento de ${cat} estourado`,
        detail:
          limit !== null && spent !== null
            ? `${formatCurrency(spent)} gastos de um limite de ${formatCurrency(limit)}`
            : null,
        href: "/orcamento",
      };
    }
    case "bill_due": {
      const desc = str(payload.description) ?? "Recorrência";
      const amount = str(payload.amount) ?? num(payload.amount)?.toFixed(2);
      const currency = str(payload.currency) ?? "BRL";
      const due = str(payload.dueDate);
      return {
        title: `${desc} está chegando`,
        detail: [
          amount ? formatCurrency(amount, currency) : null,
          due ? `em ${formatDate(due, { day: "2-digit", month: "short" })}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
        href: "/recorrencias",
      };
    }
    case "invoice_closed":
      return { title: "Fatura fechada", detail: null, href: "/contas" };
    case "goal_reached":
      return { title: "Meta atingida", detail: null, href: "/metas" };
    case "anomaly":
      return {
        title: "Gasto fora do padrão detectado",
        detail: str(payload.description),
        href: "/transacoes",
      };
  }
}
