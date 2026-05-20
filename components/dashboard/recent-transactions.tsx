import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { RecentTransaction } from "@/lib/db/queries/dashboard";

export function RecentTransactions({ transactions }: { transactions: RecentTransaction[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Últimos lançamentos</CardTitle>
          <CardDescription>5 transações mais recentes.</CardDescription>
        </div>
        <Link
          href="/transacoes"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Ver todas <ArrowRightIcon className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma transação ainda.</p>
        ) : (
          <ul className="divide-y">
            {transactions.map((t) => {
              const isIncome = t.type === "income";
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(t.date, { day: "2-digit", month: "short" })} ·{" "}
                      {t.accountName}
                      {t.categoryName ? ` · ${t.categoryName}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium tabular-nums ${
                      isIncome ? "text-emerald-600" : ""
                    }`}
                  >
                    {isIncome ? "+ " : "− "}
                    {formatCurrency(t.amount, t.currency)}
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
