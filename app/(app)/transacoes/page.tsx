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
import { TransactionTagFilter } from "@/components/transacoes/transaction-tag-filter";
import { TagBadge } from "@/components/transacoes/tag-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  listTransactionsAction,
  listAccountsForPickerAction,
} from "@/lib/actions/transactions";
import { listCategoriesForUser } from "@/lib/db/queries/categories";
import { listTagsForUser } from "@/lib/db/queries/tags";
import { requireUserId } from "@/lib/auth-helpers";
import { formatCurrency, formatDate } from "@/lib/format";
import { TRANSACTION_TYPE_LABELS, type TransactionType } from "@/types/transaction";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Transações" };

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const [allTransactions, accounts, categories, tags] = await Promise.all([
    listTransactionsAction(),
    listAccountsForPickerAction(),
    listCategoriesForUser(userId),
    listTagsForUser(userId),
  ]);

  const filterTagId =
    params.tag && tags.some((t) => t.id === params.tag) ? params.tag : null;
  const transactions = filterTagId
    ? allTransactions.filter((t) => t.tags.some((tag) => tag.id === filterTagId))
    : allTransactions;

  const hasAccount = accounts.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Transações</h1>
          <p className="text-sm text-muted-foreground">
            Receitas e despesas registradas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TransactionTagFilter tags={tags} selectedTagId={filterTagId} />
          {hasAccount ? (
            <NewTransactionButton
              accounts={accounts}
              categories={categories}
              tags={tags}
            />
          ) : null}
        </div>
      </header>

      {!hasAccount ? (
        <EmptyAccounts />
      ) : allTransactions.length === 0 ? (
        <EmptyTransactions accounts={accounts} categories={categories} tags={tags} />
      ) : transactions.length === 0 ? (
        <EmptyState
          variant="list"
          title="Nenhuma transação com essa tag"
          description="Tente outra tag ou limpe o filtro."
          action={
            <Link href="/transacoes" className={buttonVariants({ variant: "outline" })}>
              Limpar filtro
            </Link>
          }
        />
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
                <TableHead className="w-12">
                  <span className="sr-only">Ações</span>
                </TableHead>
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
                      <div className="flex flex-col gap-1">
                        <span>{t.description}</span>
                        {t.notes ? (
                          <span className="text-xs text-muted-foreground">{t.notes}</span>
                        ) : null}
                        {t.tags.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {t.tags.map((tag) => (
                              <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                            ))}
                          </span>
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
                          tagIds: t.tags.map((tag) => tag.id),
                        }}
                        accounts={accounts}
                        categories={categories}
                        tags={tags}
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
          {transactions.length} transaç{transactions.length === 1 ? "ão" : "ões"}
          {filterTagId ? " (filtrado)" : ""} ·{" "}
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
    <EmptyState
      variant="list"
      title="Cadastre uma conta primeiro"
      description="Você precisa ter ao menos uma conta para lançar transações."
      action={
        <Link href="/contas" className={buttonVariants()}>
          Ir para Contas
        </Link>
      }
    />
  );
}

function EmptyTransactions({
  accounts,
  categories,
  tags,
}: {
  accounts: Awaited<ReturnType<typeof listAccountsForPickerAction>>;
  categories: Awaited<ReturnType<typeof listCategoriesForUser>>;
  tags: Awaited<ReturnType<typeof listTagsForUser>>;
}) {
  return (
    <EmptyState
      variant="list"
      title="Nenhuma transação registrada"
      description="Comece lançando sua primeira receita ou despesa."
      action={
        <NewTransactionButton
          accounts={accounts}
          categories={categories}
          tags={tags}
        />
      }
    />
  );
}
