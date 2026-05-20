import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewAccountButton } from "@/components/contas/new-account-button";
import { AccountRowActions } from "@/components/contas/account-row-actions";
import { listFinancialAccountsAction } from "@/lib/actions/financial-accounts";
import {
  FINANCIAL_ACCOUNT_TYPE_LABELS,
  type FinancialAccountType,
} from "@/types/financial-account";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Contas" };

export default async function ContasPage() {
  const accounts = await listFinancialAccountsAction();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contas</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre suas contas, cartões e carteiras.
          </p>
        </div>
        <NewAccountButton />
      </header>

      {accounts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Saldo inicial</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id} className={a.archived ? "opacity-60" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {a.name}
                      {a.archived ? (
                        <Badge variant="secondary" className="text-xs">
                          Arquivada
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {FINANCIAL_ACCOUNT_TYPE_LABELS[a.type as FinancialAccountType]}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(a.openingBalance, a.currency)}
                  </TableCell>
                  <TableCell>
                    <AccountRowActions
                      account={{
                        id: a.id,
                        name: a.name,
                        type: a.type as FinancialAccountType,
                        currency: a.currency,
                        openingBalance: a.openingBalance,
                        archived: a.archived,
                      }}
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

function EmptyState() {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <h2 className="font-medium">Nenhuma conta cadastrada</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Comece criando sua primeira conta.
      </p>
      <div className="mt-6 flex justify-center">
        <NewAccountButton />
      </div>
    </div>
  );
}
