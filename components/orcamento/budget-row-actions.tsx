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
  deleteBudgetOverrideAction,
  deleteBudgetTemplateAction,
} from "@/lib/actions/budgets";
import { BudgetFormDialog, type BudgetPreset } from "./budget-form-dialog";
import { LOADING_TEXT } from "@/lib/ui-text";
import type { BudgetRow } from "@/types/budget";
import type { CategoryNode } from "@/lib/db/queries/categories";

type Props = {
  row: BudgetRow;
  month: string;
  monthLabel: string;
  categories: CategoryNode[];
};

export function BudgetRowActions({ row, month, monthLabel, categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [deleteTemplateOpen, setDeleteTemplateOpen] = useState(false);

  const categoryLabel = row.categoryParentName
    ? `${row.categoryParentName} · ${row.categoryName}`
    : row.categoryName;

  const templatePreset: BudgetPreset = {
    categoryId: row.categoryId,
    categoryLabel,
    scope: "template",
    limit: row.templateLimit != null ? row.templateLimit.toFixed(2) : "",
  };

  const overridePreset: BudgetPreset = {
    categoryId: row.categoryId,
    categoryLabel,
    scope: "month",
    // Pré-preenche com o limite efetivo (override atual ou o padrão).
    limit: row.limit ? row.limit.toFixed(2) : "",
  };

  function removeOverride() {
    if (!row.overrideId) return;
    startTransition(async () => {
      const res = await deleteBudgetOverrideAction(row.overrideId!);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        row.templateId
          ? "Ajuste removido — voltou ao padrão"
          : "Ajuste removido",
      );
      router.refresh();
    });
  }

  function removeTemplate() {
    if (!row.templateId) return;
    startTransition(async () => {
      const res = await deleteBudgetTemplateAction(row.templateId!);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Orçamento padrão removido");
      setDeleteTemplateOpen(false);
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
            <DropdownMenuItem onClick={() => setTemplateOpen(true)}>
              {row.templateId ? "Editar padrão" : "Definir como padrão"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOverrideOpen(true)}>
              {row.overrideId ? "Editar ajuste deste mês" : "Ajustar só este mês"}
            </DropdownMenuItem>
            {row.overrideId || row.templateId ? <DropdownMenuSeparator /> : null}
            {row.overrideId ? (
              <DropdownMenuItem onClick={removeOverride}>
                Remover ajuste deste mês
              </DropdownMenuItem>
            ) : null}
            {row.templateId ? (
              <DropdownMenuItem
                onClick={() => setDeleteTemplateOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                Remover padrão
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <BudgetFormDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        month={month}
        monthLabel={monthLabel}
        categories={categories}
        preset={templatePreset}
      />
      <BudgetFormDialog
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        month={month}
        monthLabel={monthLabel}
        categories={categories}
        preset={overridePreset}
      />

      <AlertDialog open={deleteTemplateOpen} onOpenChange={setDeleteTemplateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover orçamento padrão?</AlertDialogTitle>
            <AlertDialogDescription>
              O limite padrão de “{categoryLabel}” será removido de todos os
              meses sem ajuste específico. Ajustes mensais já feitos permanecem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeTemplate}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? LOADING_TEXT.delete : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
