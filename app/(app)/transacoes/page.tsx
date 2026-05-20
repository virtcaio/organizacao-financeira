import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewTransactionButton } from "@/components/transacoes/new-transaction-button";
import { TransactionRowActions } from "@/components/transacoes/transaction-row-actions";
import {
  listTransactionsAction,
  listAccountsForPickerAction,
} from "@/lib/actions/transactions";
import { listCategoriesForUser } from "@/lib/db/queries/categories";
import { requireUserId } from "@/lib/auth-helpers";
import { formatCurrency, formatDate } from "@/lib/format";
import { TRANSACTION_TYPE_LABELS, type TransactionType } from "@/types/transaction";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Transações" };

export default async function TransacoesPage() {
  const userId = await requireUserId();
  const [transactions, accounts, categories] = await Promise.all([
    listTransactionsAction(),
    listAccountsForPickerAction(),
    listCategoriesForUser(userId),
  ]);

  const hasAccount = accounts.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transações</h1>
          <p className="text-sm text-muted-foreground">
            Receitas e despesas registradas.
          </p>
        </div>
        {hasAccount ? (
          <NewTransactionButton accounts={accounts} categories={categories} />
        ) : null}
      </header>

      {!hasAccount ? (
        <EmptyAccounts />
      ) : transactions.length === 0 ? (
        <EmptyTransactions accounts={accounts} categories={categories} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const isIncome = t.type === "income";
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(t.date, { day: "2-digit", month: "short" })}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{t.description}</span>
                        {t.notes ? (
                          <span className="text-xs text-muted-foreground">{t.notes}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.categoryName ? (
                        <span>
                          {t.categoryParentName ? (
                            <span className="text-xs text-muted-foreground/70">
                              {t.categoryParentName} ·{" "}
                            </span>
                          ) : null}
                          {t.categoryName}
                        </span>
                      ) : (
                        <Badge variant="outline">Sem categoria</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.accountName}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        isIncome ? "text-income" : "text-expense"
                      }`}
                    >
                      {isIncome ? "+ " : "− "}
                      {formatCurrency(t.amount, t.currency)}
                    </TableCell>
                    <TableCell>
                      <TransactionRowActions
                        transaction={{
                          id: t.id,
                          type: t.type as TransactionType,
                          financialAccountId: t.accountId,
                          categoryId: t.categoryId,
                          amount: t.amount,
                          currency: t.currency,
                          date: t.date,
                          description: t.description,
                          notes: t.notes,
                        }}
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

      {transactions.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {transactions.length} transaç{transactions.length === 1 ? "ão" : "ões"} ·{" "}
          {Object.entries(
            transactions.reduce<Record<TransactionType, number>>(
              (acc, t) => {
                acc[t.type as TransactionType] =
                  (acc[t.type as TransactionType] ?? 0) + 1;
                return acc;
              },
              {} as Record<TransactionType, number>,
            ),
          )
            .map(([k, v]) => `${v} ${TRANSACTION_TYPE_LABELS[k as TransactionType]}${v > 1 ? "s" : ""}`)
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function EmptyAccounts() {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <h2 className="font-medium">Cadastre uma conta primeiro</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Você precisa ter ao menos uma conta para lançar transações.
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/contas" className={buttonVariants()}>
          Ir para Contas
        </Link>
      </div>
    </div>
  );
}

function EmptyTransactions({
  accounts,
  categories,
}: {
  accounts: Awaited<ReturnType<typeof listAccountsForPickerAction>>;
  categories: Awaited<ReturnType<typeof listCategoriesForUser>>;
}) {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <h2 className="font-medium">Nenhuma transação registrada</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Comece lançando sua primeira receita ou despesa.
      </p>
      <div className="mt-6 flex justify-center">
        <NewTransactionButton accounts={accounts} categories={categories} />
      </div>
    </div>
  );
}
