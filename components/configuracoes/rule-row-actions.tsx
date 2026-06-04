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
import { deleteRuleAction } from "@/lib/actions/categorization-rules";
import { LOADING_TEXT } from "@/lib/ui-text";
import { RuleFormDialog, type RuleEditPreset } from "./rule-form-dialog";
import type { CategoryNode } from "@/lib/db/queries/categories";

type Props = {
  preset: RuleEditPreset;
  patternLabel: string;
  categories: CategoryNode[];
};

export function RuleRowActions({ preset, patternLabel, categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteRuleAction(preset.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Regra excluída");
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}>
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span className="sr-only">Ações</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RuleFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        categories={categories}
        preset={preset}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra "{patternLabel}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A regra deixa de aplicar nas próximas importações. Transações já
              salvas não são afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
