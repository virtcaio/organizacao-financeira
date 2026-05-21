"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  deleteRecurringRuleAction,
  setRecurringRulePausedAction,
} from "@/lib/actions/recurring";
import { LOADING_TEXT } from "@/lib/ui-text";
import {
  RecurringRuleFormDialog,
  type RecurringDraft,
} from "./recurring-rule-form-dialog";
import type { AccountOption } from "@/components/transacoes/transaction-form-dialog";
import type { CategoryNode } from "@/lib/db/queries/categories";

type Props = {
  rule: RecurringDraft;
  paused: boolean;
  accounts: AccountOption[];
  categories: CategoryNode[];
};

export function RecurringRowActions({ rule, paused, accounts, categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function togglePaused() {
    startTransition(async () => {
      const res = await setRecurringRulePausedAction(rule.id, !paused);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(paused ? "Recorrência retomada" : "Recorrência pausada");
      router.refresh();
    });
  }

  function onConfirmDelete() {
    startTransition(async () => {
      const res = await deleteRecurringRuleAction(rule.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Recorrência excluída");
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Ações</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={togglePaused}>
              {paused ? "Retomar" : "Pausar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <RecurringRuleFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        accounts={accounts}
        categories={categories}
        rule={rule}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
            <AlertDialogDescription>
              A regra será removida e nenhuma transação futura será gerada. As
              transações já lançadas permanecem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? LOADING_TEXT.delete : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
