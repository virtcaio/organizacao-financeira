import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { BudgetSummary } from "@/types/budget";

export function BudgetSummaryCards({ summary }: { summary: BudgetSummary }) {
  const { totalLimit, totalSpent, totalRemaining, percent } = summary;
  const remainingPositive = totalRemaining >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiCard
        title="Orçado"
        value={formatCurrency(totalLimit, "BRL")}
        hint="Soma dos limites do mês"
      />
      <KpiCard
        title="Gasto"
        value={formatCurrency(totalSpent, "BRL")}
        hint={`${Math.round(percent)}% do orçado`}
        valueClassName={percent >= 100 ? "text-expense" : undefined}
      />
      <KpiCard
        title={remainingPositive ? "Restante" : "Excedente"}
        value={formatCurrency(Math.abs(totalRemaining), "BRL")}
        hint={
          remainingPositive
            ? "Disponível pra usar"
            : "Estourou o orçamento total"
        }
        valueClassName={remainingPositive ? "text-income" : "text-expense"}
      />
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
  valueClassName,
}: {
  title: string;
  value: string;
  hint: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
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
