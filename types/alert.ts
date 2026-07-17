export const ALERT_KINDS = [
  "budget_warning",
  "budget_exceeded",
  "bill_due",
  "invoice_closed",
  "goal_reached",
  "anomaly",
] as const;

export type AlertKind = (typeof ALERT_KINDS)[number];

export type AlertListItem = {
  id: string;
  kind: AlertKind;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};
