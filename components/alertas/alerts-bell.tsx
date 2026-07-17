"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BellIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { describeAlert } from "@/lib/alerts/format";
import { formatDate } from "@/lib/format";
import {
  markAlertReadAction,
  markAllAlertsReadAction,
} from "@/lib/actions/alerts";
import type { AlertListItem } from "@/types/alert";

export function AlertsBell({
  unreadCount,
  recent,
}: {
  unreadCount: number;
  recent: AlertListItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onOpenAlert(alert: AlertListItem, href: string | null) {
    startTransition(async () => {
      if (!alert.readAt) await markAlertReadAction(alert.id);
      if (href) router.push(href);
      router.refresh();
    });
  }

  function onMarkAll() {
    startTransition(async () => {
      const res = await markAllAlertsReadAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            disabled={isPending}
          >
            <BellIcon className="size-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white tabular-nums">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
            <span className="sr-only">
              Alertas{unreadCount > 0 ? ` (${unreadCount} não lidos)` : ""}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Alertas
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={onMarkAll}
              className="text-xs font-normal text-muted-foreground hover:text-foreground"
            >
              Marcar todas como lidas
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recent.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nenhum alerta por aqui.
          </div>
        ) : (
          <DropdownMenuGroup>
            {recent.map((a) => {
              const d = describeAlert(a.kind, a.payload);
              return (
                <DropdownMenuItem
                  key={a.id}
                  onClick={() => onOpenAlert(a, d.href)}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <span className="flex w-full items-center gap-2">
                    {!a.readAt ? (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-destructive"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`truncate text-sm ${a.readAt ? "text-muted-foreground" : "font-medium"}`}
                    >
                      {d.title}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {d.detail ? `${d.detail} · ` : ""}
                    {formatDate(a.createdAt, { day: "2-digit", month: "short" })}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/alertas" className="w-full justify-center text-sm">
              Ver todos
            </Link>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
