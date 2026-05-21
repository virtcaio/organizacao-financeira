import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { MonthlyEvolution } from "@/components/dashboard/monthly-evolution";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { UpcomingRecurring } from "@/components/dashboard/upcoming-recurring";
import {
  getBalancesByCurrency,
  getCategoryBreakdownBRL,
  getMonthlyEvolutionBRL,
  getMonthlyKpisBRL,
  getRecentTransactions,
} from "@/lib/db/queries/dashboard";
import { getUpcomingRules } from "@/lib/db/queries/recurring";
import { listFinancialAccountsAction } from "@/lib/actions/financial-accounts";
import { requireUserId } from "@/lib/auth-helpers";
import { auth } from "@/lib/auth";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const userId = await requireUserId();
  const session = await auth();
  const now = new Date();

  const [accounts, balances, kpis, breakdown, evolution, recent, upcoming] =
    await Promise.all([
      listFinancialAccountsAction(),
      getBalancesByCurrency(userId),
      getMonthlyKpisBRL(userId, now),
      getCategoryBreakdownBRL(userId, now),
      getMonthlyEvolutionBRL(userId, 6, now),
      getRecentTransactions(userId, 5),
      getUpcomingRules(userId, 14),
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

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentTransactions transactions={recent} />
        <UpcomingRecurring rules={upcoming} />
      </div>
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

      <EmptyState
        variant="onboarding"
        steps={[
          {
            number: 1,
            title: "Cadastre suas contas",
            description:
              "Conta corrente, poupança, cartão de crédito, carteira ou corretora. Cada uma com saldo inicial e moeda.",
            action: (
              <Link href="/contas" className={buttonVariants()}>
                Ir para Contas
              </Link>
            ),
          },
          {
            number: 2,
            title: "Lance suas primeiras transações",
            description:
              "Receitas e despesas. Use categorias hierárquicas pra organizar.",
            action: (
              <span
                className={
                  buttonVariants({ variant: "outline" }) +
                  " pointer-events-none opacity-50"
                }
              >
                Ir para Transações
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
