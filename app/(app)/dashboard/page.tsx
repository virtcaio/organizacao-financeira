import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { MonthlyEvolution } from "@/components/dashboard/monthly-evolution";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import {
  getBalancesByCurrency,
  getCategoryBreakdownBRL,
  getMonthlyEvolutionBRL,
  getMonthlyKpisBRL,
  getRecentTransactions,
} from "@/lib/db/queries/dashboard";
import { listFinancialAccountsAction } from "@/lib/actions/financial-accounts";
import { requireUserId } from "@/lib/auth-helpers";
import { auth } from "@/lib/auth";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const userId = await requireUserId();
  const session = await auth();
  const now = new Date();

  const [accounts, balances, kpis, breakdown, evolution, recent] = await Promise.all([
    listFinancialAccountsAction(),
    getBalancesByCurrency(userId),
    getMonthlyKpisBRL(userId, now),
    getCategoryBreakdownBRL(userId, now),
    getMonthlyEvolutionBRL(userId, 6, now),
    getRecentTransactions(userId, 5),
  ]);

  const hasAccount = accounts.some((a) => !a.archived);

  if (!hasAccount) {
    return <FirstStepsEmpty firstName={session?.user?.name?.split(" ")[0]} />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">
          Olá{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão geral das suas finanças.
        </p>
      </header>

      <KpiCards balances={balances} kpis={kpis} now={now} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBreakdown items={breakdown} />
        <MonthlyEvolution data={evolution} />
      </div>

      <RecentTransactions transactions={recent} />
    </div>
  );
}

function FirstStepsEmpty({ firstName }: { firstName?: string }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">
          Bem-vindo{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Vamos configurar seu app em dois passos.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Step
          number={1}
          title="Cadastre suas contas"
          description="Conta corrente, poupança, cartão de crédito, carteira ou corretora. Cada uma com saldo inicial e moeda."
          cta="Ir para Contas"
          href="/contas"
        />
        <Step
          number={2}
          title="Lance suas primeiras transações"
          description="Receitas e despesas. Use categorias hierárquicas pra organizar."
          cta="Ir para Transações"
          href="/transacoes"
          disabled
        />
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  description,
  cta,
  href,
  disabled,
}: {
  number: number;
  title: string;
  description: string;
  cta: string;
  href: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
      <div className="flex size-7 items-center justify-center rounded-full border text-xs font-medium text-muted-foreground">
        {number}
      </div>
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div>
        {disabled ? (
          <span className={buttonVariants({ variant: "outline" }) + " pointer-events-none opacity-50"}>
            {cta}
          </span>
        ) : (
          <Link href={href} className={buttonVariants()}>
            {cta}
          </Link>
        )}
      </div>
    </div>
  );
}
