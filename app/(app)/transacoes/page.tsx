import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRightIcon, PaperclipIcon } from "lucide-react";
import { NewTransactionButton } from "@/components/transacoes/new-transaction-button";
import { NewTransferButton } from "@/components/transacoes/new-transfer-button";
import { ReceiptCaptureButton } from "@/components/transacoes/receipt-capture-button";
import { TransactionRowActions } from "@/components/transacoes/transaction-row-actions";
import { TransferRowActions } from "@/components/transacoes/transfer-row-actions";
import { TransactionFiltersBar } from "@/components/transacoes/transaction-filters-bar";
import { ActiveFiltersChips } from "@/components/transacoes/active-filters-chips";
import { TagBadge } from "@/components/transacoes/tag-badge";
import {
  expandCategoryFilter,
  hasAnyFilter,
  parseFilters,
} from "@/lib/transactions/filter";
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
import { amountDisplay, formatCurrency, formatDate } from "@/lib/format";
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
  pairById: Map<string, { accountId: string; amount: string }>,
): TransferDraft | null {
  if (line.type !== "transfer" || !line.transferPairId) return null;
  const pair = pairById.get(line.transferPairId);
  if (!pair) return null;
  const lineIsOut = Number(line.amount) < 0;
  return {
    lineId: line.id,
    fromAccountId: lineIsOut ? line.accountId : pair.accountId,
    toAccountId: lineIsOut ? pair.accountId : line.accountId,
    amount: Math.abs(Number(line.amount)).toFixed(2),
    date: line.date,
    description: line.description,
  };
}

const PAGE_SIZE = 50;

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    tag?: string;
    from?: string;
    to?: string;
    account?: string;
    category?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const [accounts, categories, tags] = await Promise.all([
    listAccountsForPickerAction(),
    listCategoriesForUser(userId),
    listTagsForUser(userId),
  ]);

  const filters = parseFilters(params, accounts, categories, tags);
  const anyFilter = hasAnyFilter(filters);
  const page = Math.max(Number(params.page) || 1, 1);

  const { rows: transactions, pairs, totalFiltered, totalAll } =
    await listTransactionsAction({
      filters: {
        from: filters.from,
        to: filters.to,
        accountId: filters.accountId,
        categoryIds: filters.categoryId
          ? Array.from(expandCategoryFilter(filters.categoryId, categories))
          : undefined,
        q: filters.q,
        tagId: filters.tagId,
      },
      page,
      pageSize: PAGE_SIZE,
    });

  const totalPages = Math.max(Math.ceil(totalFiltered / PAGE_SIZE), 1);
  const pairById = new Map<string, { accountId: string; amount: string }>();
  for (const t of transactions) pairById.set(t.id, { accountId: t.accountId, amount: t.amount });
  for (const p of pairs) pairById.set(p.id, { accountId: p.accountId, amount: p.amount });
  const hasAccount = accounts.length > 0;
  const canTransfer = accounts.length >= 2;

  const pageHref = (n: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && k !== "page") sp.set(k, v);
    }
    if (n > 1) sp.set("page", String(n));
    const qs = sp.toString();
    return qs ? `/transacoes?${qs}` : "/transacoes";
  };

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

      {hasAccount && totalAll > 0 ? (
        <div className="space-y-2">
          <TransactionFiltersBar
            accounts={accounts}
            categories={categories}
            tags={tags}
            filters={filters}
          />
          <ActiveFiltersChips
            filters={filters}
            accounts={accounts}
            categories={categories}
            tags={tags}
          />
        </div>
      ) : null}

      {!hasAccount ? (
        <EmptyAccounts />
      ) : totalAll === 0 ? (
        <EmptyTransactions accounts={accounts} categories={categories} tags={tags} />
      ) : transactions.length === 0 ? (
        <EmptyState
          variant="list"
          title="Nenhuma transação com esses filtros"
          description="Ajuste os filtros ou limpe tudo pra ver todas as transações."
          action={
            <Link href="/transacoes" className={buttonVariants({ variant: "outline" })}>
              Limpar filtros
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
                const { sign, valueClass } = amountDisplay(t.type, amountNum);
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
                          {t.receiptKey ? (
                            <a
                              href={`/api/receipts/view?key=${encodeURIComponent(t.receiptKey)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ver comprovante"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <PaperclipIcon className="size-3.5" />
                            </a>
                          ) : null}
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
                          const draft = buildTransferDraft(t, pairById);
                          return draft ? (
                            <TransferRowActions transfer={draft} accounts={accounts} />
                          ) : null;
                        })()
                      ) : (
                        <TransactionRowActions
                          editable={t.type === "income" || t.type === "expense"}
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
                            receiptKey: t.receiptKey,
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {totalFiltered} transaç{totalFiltered === 1 ? "ão" : "ões"}
            {anyFilter ? " (filtrado)" : ""} ·{" "}
            {Object.entries(
              transactions.reduce<Record<string, number>>((acc, t) => {
                acc[t.type] = (acc[t.type] ?? 0) + 1;
                return acc;
              }, {}),
            )
              .map(([k, v]) => `${v} ${TYPE_LABEL[k] ?? k}${v > 1 ? "s" : ""}`)
              .join(" · ")}
            {totalPages > 1 ? " nesta página" : ""}
          </p>
          {totalPages > 1 ? (
            <nav
              className="flex items-center gap-2 text-xs"
              aria-label="Paginação"
            >
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Anterior
                </Link>
              ) : null}
              <span className="text-muted-foreground tabular-nums">
                Página {page} de {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Próxima
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
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
