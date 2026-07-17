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
import { deleteTransactionAction } from "@/lib/actions/transactions";
import { LOADING_TEXT } from "@/lib/ui-text";
import {
  TransactionFormDialog,
  type AccountOption,
  type TransactionDraft,
} from "./transaction-form-dialog";
import type { CategoryNode } from "@/lib/db/queries/categories";
import type { Tag } from "@/types/tag";

export function TransactionRowActions({
  transaction,
  accounts,
  categories,
  tags,
  editable = true,
}: {
  transaction: TransactionDraft;
  accounts: AccountOption[];
  categories: CategoryNode[];
  tags: Tag[];
  /** false pra tipos que o form não suporta (adjustment/investment) — só excluir. */
  editable?: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onConfirmDelete() {
    startTransition(async () => {
      const res = await deleteTransactionAction(transaction.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Transação excluída");
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
            {editable ? (
              <>
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editable ? (
        <TransactionFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          accounts={accounts}
          categories={categories}
          tags={tags}
          transaction={transaction}
        />
      ) : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A transação será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                onConfirmDelete();
              }}
              disabled={isPending}
            >
              {isPending ? LOADING_TEXT.delete : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
