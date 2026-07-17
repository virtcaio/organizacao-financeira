"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { describeAlert } from "@/lib/alerts/format";
import { formatDate } from "@/lib/format";
import {
  deleteAlertAction,
  markAlertReadAction,
  markAllAlertsReadAction,
} from "@/lib/actions/alerts";
import type { AlertListItem } from "@/types/alert";

export function AlertsList({
  alerts,
  unreadCount,
}: {
  alerts: AlertListItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Algo deu errado");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 ? (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => run(() => markAllAlertsReadAction())}
          >
            <CheckIcon className="mr-2 size-3.5" />
            Marcar todas como lidas ({unreadCount})
          </Button>
        </div>
      ) : null}

      <ul className="divide-y rounded-lg border">
        {alerts.map((a) => {
          const d = describeAlert(a.kind, a.payload);
          return (
            <li
              key={a.id}
              className={`flex items-start justify-between gap-3 p-4 ${
                a.readAt ? "" : "bg-muted/30"
              }`}
            >
              <div className="min-w-0 space-y-0.5">
                <p className="flex items-center gap-2 text-sm">
                  {!a.readAt ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Novo
                    </Badge>
                  ) : null}
                  <span className={a.readAt ? "text-muted-foreground" : "font-medium"}>
                    {d.href ? (
                      <Link href={d.href} className="hover:underline underline-offset-4">
                        {d.title}
                      </Link>
                    ) : (
                      d.title
                    )}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {d.detail ? `${d.detail} · ` : ""}
                  {formatDate(a.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!a.readAt ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={isPending}
                    onClick={() => run(() => markAlertReadAction(a.id))}
                  >
                    <CheckIcon className="size-3.5" />
                    <span className="sr-only">Marcar como lido</span>
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  disabled={isPending}
                  onClick={() => run(() => deleteAlertAction(a.id))}
                >
                  <Trash2Icon className="size-3.5" />
                  <span className="sr-only">Excluir alerta</span>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
