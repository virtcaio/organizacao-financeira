import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRightIcon } from "lucide-react";
import { NewTransactionButton } from "@/components/transacoes/new-transaction-button";
import { NewTransferButton } from "@/components/transacoes/new-transfer-button";
import { ReceiptCaptureButton } from "@/components/transacoes/receipt-capture-button";
import { TransactionRowActions } from "@/components/transacoes/transaction-row-actions";
import { TransferRowActions } from "@/components/transacoes/transfer-row-actions";
import { TransactionTagFilter } from "@/components/transacoes/transaction-tag-filter";
import { TagBadge } from "@/components/transacoes/tag-badge";
import type { TransferDraft } from "@/components/transacoes/transfer-form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  listTransactionsAction,
  listAccountsForPickerAction,
  type TransactionListItem,
} from "@/lib/actions/transactions";
import { listCategoriesForUser } from "@/lib/db/queries/categories";
import { listTagsForUser } from "@/lib/db/queries/tags";
import { requireUserId } from "@/lib/auth-helpers";
import { formatCurrency, formatDate } from "@/lib/format";
import { type TransactionType } from "@/types/transaction";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Transações" };

const TYPE_LABEL: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
  investment: "Investimento",
  adjustment: "Ajuste",
};

/** Monta o draft de edição de transferência cruzando as duas linhas do par. */
function buildTransferDraft(
  line: TransactionListItem,
  byId: Map<string, TransactionListItem>,
): TransferDraft | null {
  if (line.type !== "transfer" || !line.transferPairId) return null;
  const pair = byId.get(line.transferPairId);
  if (!pair) return null;
  const out = Number(line.amount) < 0 ? line : pair;
  const inc = Number(line.amount) < 0 ? pair : line;
  return {
    lineId: line.id,
    fromAccountId: out.accountId,
    toAccountId: inc.accountId,
    amount: Math.abs(Number(out.amount)).toFixed(2),
    date: line.date,
    description: line.description,
  };
}

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

  const byId = new Map(allTransactions.map((t) => [t.id, t]));
  const hasAccount = accounts.length > 0;
  const canTransfer = accounts.length >= 2;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Transações</h1>
          <p className="text-sm text-muted-foreground">
            Receitas, despesas e transferências registradas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TransactionTagFilter tags={tags} selectedTagId={filterTagId} />
          {hasAccount ? (
            <ReceiptCaptureButton
              accounts={accounts}
              categories={categories}
              tags={tags}
            />
          ) : null}
          {canTransfer ? <NewTransferButton accounts={accounts} /> : null}
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
                const isTransfer = t.type === "transfer";
                const amountNum = Number(t.amount);
                const isIncome = t.type === "income";
                const valueClass = isTransfer
                  ? "text-transfer"
                  : isIncome
                    ? "text-income"
                    : "text-expense";
                const sign = isTransfer
                  ? amountNum < 0
                    ? "− "
                    : "+ "
                  : isIncome
                    ? "+ "
                    : "− ";
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(t.date, { day: "2-digit", month: "short" })}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5">
                          {isTransfer ? (
                            <ArrowLeftRightIcon className="size-3.5 text-transfer" />
                          ) : null}
                          {t.description}
                        </span>
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
                      {isTransfer ? (
                        <Badge variant="outline">Transferência</Badge>
                      ) : t.categoryName ? (
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
                      className={`text-right tabular-nums font-medium ${valueClass}`}
                    >
                      {sign}
                      {formatCurrency(Math.abs(amountNum), t.currency)}
                    </TableCell>
                    <TableCell>
                      {isTransfer ? (
                        (() => {
                          const draft = buildTransferDraft(t, byId);
                          return draft ? (
                            <TransferRowActions transfer={draft} accounts={accounts} />
                          ) : null;
                        })()
                      ) : (
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
                      )}
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
            transactions.reduce<Record<string, number>>((acc, t) => {
              acc[t.type] = (acc[t.type] ?? 0) + 1;
              return acc;
            }, {}),
          )
            .map(([k, v]) => `${v} ${TYPE_LABEL[k] ?? k}${v > 1 ? "s" : ""}`)
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
