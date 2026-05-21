import Link from "next/link";
import { ArrowRightIcon, RepeatIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { RecurringRuleListItem } from "@/types/recurring";

export function UpcomingRecurring({ rules }: { rules: RecurringRuleListItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Próximas contas</CardTitle>
          <CardDescription>Recorrências dos próximos 14 dias.</CardDescription>
        </div>
        <Link
          href="/recorrencias"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Ver todas <ArrowRightIcon className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma conta recorrente nos próximos 14 dias.
          </p>
        ) : (
          <ul className="divide-y">
            {rules.map((r) => {
              const isIncome = r.type === "income";
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm flex items-center gap-1.5">
                      <RepeatIcon className="size-3.5 text-muted-foreground" />
                      {r.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.nextRunAt, { day: "2-digit", month: "short" })}
                      {" · "}
                      {r.accountName}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium tabular-nums ${
                      isIncome ? "text-income" : "text-expense"
                    }`}
                  >
                    {isIncome ? "+ " : "− "}
                    {formatCurrency(r.amount, r.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
