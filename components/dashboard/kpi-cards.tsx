import { ArrowDownIcon, ArrowUpIcon, TrendingUpIcon, WalletIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { CurrencyBalance, MonthlyKpis } from "@/lib/db/queries/dashboard";

export function KpiCards({
  balances,
  kpis,
  now,
}: {
  balances: CurrencyBalance[];
  kpis: MonthlyKpis;
  now: Date;
}) {
  const brl = balances.find((b) => b.currency === "BRL");
  const others = balances.filter((b) => b.currency !== "BRL");

  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Saldo total (BRL)"
        value={formatCurrency(brl?.total ?? 0, "BRL")}
        hint={
          others.length
            ? `+ ${others
                .map((o) => formatCurrency(o.total, o.currency))
                .join(" · ")}`
            : "Soma de todas as contas em BRL"
        }
        icon={<WalletIcon className="size-4 text-muted-foreground" />}
      />
      <KpiCard
        title="Receitas do mês"
        value={formatCurrency(kpis.income, "BRL")}
        hint={monthLabel}
        valueClassName="text-income"
        icon={<ArrowUpIcon className="size-4 text-income" />}
      />
      <KpiCard
        title="Despesas do mês"
        value={formatCurrency(kpis.expense, "BRL")}
        hint={monthLabel}
        valueClassName="text-expense"
        icon={<ArrowDownIcon className="size-4 text-expense" />}
      />
      <KpiCard
        title="Resultado do mês"
        value={formatCurrency(kpis.net, "BRL")}
        hint={kpis.net >= 0 ? "Sobra positiva" : "Atenção: gastando mais que arrecadando"}
        valueClassName={kpis.net >= 0 ? "text-income" : "text-expense"}
        icon={<TrendingUpIcon className="size-4 text-muted-foreground" />}
      />
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
  valueClassName,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  valueClassName?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold tabular-nums ${valueClassName ?? ""}`}>
          {value}
        </p>
        <CardDescription className="mt-1 text-xs first-letter:uppercase">
          {hint}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
