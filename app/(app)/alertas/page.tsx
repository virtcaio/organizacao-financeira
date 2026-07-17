import { requireUserId } from "@/lib/auth-helpers";
import { listAlerts } from "@/lib/db/queries/alerts";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertsList } from "@/components/alertas/alerts-list";

export const metadata = { title: "Alertas" };

export default async function AlertasPage() {
  const userId = await requireUserId();
  const alerts = await listAlerts(userId, 100);
  const unread = alerts.filter((a) => !a.readAt).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Alertas</h1>
        <p className="text-sm text-muted-foreground">
          Orçamentos em atenção ou estourados e recorrências chegando. Gerados
          uma vez ao dia.
        </p>
      </header>

      {alerts.length === 0 ? (
        <EmptyState
          variant="list"
          title="Nenhum alerta"
          description="Quando um orçamento passar de 80% do limite ou uma recorrência estiver perto de vencer, aparece aqui."
        />
      ) : (
        <AlertsList alerts={alerts} unreadCount={unread} />
      )}
    </div>
  );
}
