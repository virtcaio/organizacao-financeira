import { requireUserId } from "@/lib/auth-helpers";
import { listCategoriesForUser } from "@/lib/db/queries/categories";
import { getBudgetsForMonth, getMonthlyBudgetSummary } from "@/lib/db/queries/budgets";
import { monthStartIso } from "@/lib/date";
import { formatCurrency } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { BudgetSummaryCards } from "@/components/orcamento/budget-summary";
import { BudgetProgressBar } from "@/components/orcamento/budget-progress-bar";
import { BudgetRowActions } from "@/components/orcamento/budget-row-actions";
import { NewBudgetButton } from "@/components/orcamento/new-budget-button";
import { BudgetMonthNav } from "@/components/orcamento/budget-month-nav";

export const metadata = { title: "Orçamento" };

const MONTH_RE = /^\d{4}-\d{2}-01$/;

function monthLabel(monthIso: string): string {
  const year = Number(monthIso.slice(0, 4));
  const month = Number(monthIso.slice(5, 7));
  const d = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export default async function OrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const month =
    params.month && MONTH_RE.test(params.month) ? params.month : monthStartIso();
  const label = monthLabel(month);

  const [rows, summary, categories] = await Promise.all([
    getBudgetsForMonth(userId, month),
    getMonthlyBudgetSummary(userId, month),
    listCategoriesForUser(userId),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Orçamento</h1>
          <p className="text-sm text-muted-foreground">
            Defina limites mensais por categoria e acompanhe o progresso.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BudgetMonthNav month={month} monthLabel={label} />
          {rows.length > 0 ? (
            <NewBudgetButton
              month={month}
              monthLabel={label}
              categories={categories}
            />
          ) : null}
        </div>
      </header>

      {rows.length > 0 ? <BudgetSummaryCards summary={summary} /> : null}

      {rows.length === 0 ? (
        <EmptyState
          variant="list"
          title="Nenhum orçamento neste mês"
          description={`Crie limites por categoria para acompanhar gastos em ${label}.`}
          action={
            <NewBudgetButton
              month={month}
              monthLabel={label}
              categories={categories}
            />
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="w-[40%]">Progresso</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">Limite</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{b.categoryName}</span>
                      {b.categoryParentName ? (
                        <span className="text-xs text-muted-foreground">
                          {b.categoryParentName}
                        </span>
                      ) : b.isParent ? (
                        <span className="text-xs text-muted-foreground">
                          Categoria (toda)
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <BudgetProgressBar percent={b.percent} status={b.status} />
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {Math.round(b.percent)}%
                        {b.status === "exceeded"
                          ? ` · excedeu em ${formatCurrency(Math.abs(b.remaining), "BRL")}`
                          : ` · restante ${formatCurrency(b.remaining, "BRL")}`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      b.status === "exceeded" ? "text-expense font-medium" : ""
                    }`}
                  >
                    {formatCurrency(b.spent, "BRL")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(b.limit, "BRL")}
                  </TableCell>
                  <TableCell>
                    <BudgetRowActions
                      budget={{
                        id: b.id,
                        categoryId: b.categoryId,
                        limit: b.limit.toFixed(2),
                      }}
                      month={month}
                      monthLabel={label}
                      categories={categories}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
