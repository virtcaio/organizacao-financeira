import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NewRecurringButton } from "@/components/recorrencias/new-recurring-button";
import { RecurringRowActions } from "@/components/recorrencias/recurring-row-actions";
import { listRecurringRulesAction } from "@/lib/actions/recurring";
import { listAccountsForPickerAction } from "@/lib/actions/transactions";
import { listCategoriesForUser } from "@/lib/db/queries/categories";
import { requireUserId } from "@/lib/auth-helpers";
import { formatCurrency, formatDate } from "@/lib/format";
import { describeFrequency } from "@/lib/recurring";

export const metadata = { title: "Recorrências" };

export default async function RecorrenciasPage() {
  const userId = await requireUserId();
  const [rules, accounts, categories] = await Promise.all([
    listRecurringRulesAction(),
    listAccountsForPickerAction(),
    listCategoriesForUser(userId),
  ]);

  const hasAccount = accounts.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Recorrências</h1>
          <p className="text-sm text-muted-foreground">
            Lançamentos automáticos — salário, aluguel, assinaturas.
          </p>
        </div>
        {hasAccount && rules.length > 0 ? (
          <NewRecurringButton accounts={accounts} categories={categories} />
        ) : null}
      </header>

      {!hasAccount ? (
        <EmptyState
          variant="list"
          title="Cadastre uma conta primeiro"
          description="Recorrências precisam de uma conta para lançar as transações."
          action={
            <Link href="/contas" className={buttonVariants()}>
              Ir para Contas
            </Link>
          }
        />
      ) : rules.length === 0 ? (
        <EmptyState
          variant="list"
          title="Nenhuma recorrência"
          description="Crie regras para lançar automaticamente o que se repete todo mês."
          action={
            <NewRecurringButton accounts={accounts} categories={categories} />
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Próxima</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => {
                const isIncome = r.type === "income";
                return (
                  <TableRow key={r.id} className={r.paused ? "opacity-60" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2">
                          {r.description}
                          {r.paused ? (
                            <Badge variant="secondary" className="text-xs font-normal">
                              Pausada
                            </Badge>
                          ) : null}
                        </span>
                        {r.categoryName ? (
                          <span className="text-xs text-muted-foreground">
                            {r.categoryName}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {describeFrequency(r.frequency, r.interval)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        isIncome ? "text-income" : "text-expense"
                      }`}
                    >
                      {isIncome ? "+ " : "− "}
                      {formatCurrency(r.amount, r.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.accountName}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {r.paused
                        ? "—"
                        : formatDate(r.nextRunAt, { day: "2-digit", month: "short" })}
                    </TableCell>
                    <TableCell>
                      <RecurringRowActions
                        rule={{
                          id: r.id,
                          type: r.type,
                          financialAccountId: r.financialAccountId,
                          categoryId: r.categoryId,
                          amount: r.amount,
                          description: r.description,
                          frequency: r.frequency,
                          interval: r.interval,
                          dayOfMonth: r.dayOfMonth,
                          startDate: r.nextRunAt,
                          endDate: r.endDate,
                        }}
                        paused={r.paused}
                        accounts={accounts}
                        categories={categories}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
