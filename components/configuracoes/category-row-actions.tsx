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
  archiveCategoryAction,
  deleteCategoryAction,
  unarchiveCategoryAction,
} from "@/lib/actions/categories";
import { LOADING_TEXT } from "@/lib/ui-text";
import {
  CategoryFormDialog,
  type CategoryEditPreset,
} from "./category-form-dialog";
import { CATEGORY_KIND_LABELS } from "@/types/category";
import type { CategoryAdminNode } from "@/lib/db/queries/categories";

type Props = {
  category: CategoryAdminNode;
  parentName: string | null;
  allCategories: CategoryAdminNode[];
};

export function CategoryRowActions({ category, parentName, allCategories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleArchive() {
    startTransition(async () => {
      const res = await archiveCategoryAction(category.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Categoria arquivada");
      router.refresh();
    });
  }

  function handleUnarchive() {
    startTransition(async () => {
      const res = await unarchiveCategoryAction(category.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Categoria restaurada");
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteCategoryAction(category.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Categoria excluída");
      setDeleteOpen(false);
      router.refresh();
    });
  }

  const isCustom = category.isEditable;
  const isArchived = category.archivedForUser;

  const editPreset: CategoryEditPreset = {
    id: category.id,
    name: category.name,
    icon: category.icon,
    kindLabel: CATEGORY_KIND_LABELS[category.kind],
    parentLabel: parentName,
  };

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
          {isCustom && !isArchived ? (
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              Editar
            </DropdownMenuItem>
          ) : null}

          {!isArchived ? (
            <DropdownMenuItem onClick={handleArchive}>
              Arquivar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleUnarchive}>
              Restaurar
            </DropdownMenuItem>
          )}

          {isCustom ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                Excluir permanentemente
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {isCustom ? (
        <CategoryFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          allCategories={allCategories}
          preset={editPreset}
        />
      ) : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{category.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. Só funciona se a categoria não estiver em
              uso (sem transações, orçamentos ou recorrências). Caso esteja em
              uso, prefira arquivar.
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
