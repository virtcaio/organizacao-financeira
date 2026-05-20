"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { upsertBudgetAction } from "@/lib/actions/budgets";
import { LOADING_TEXT } from "@/lib/ui-text";
import type { CategoryNode } from "@/lib/db/queries/categories";

export type BudgetDraft = {
  id?: string;
  categoryId: string;
  limit: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string; // YYYY-MM-01
  monthLabel: string; // pra título do dialog
  categories: CategoryNode[];
  budget?: BudgetDraft;
};

export function BudgetFormDialog({
  open,
  onOpenChange,
  month,
  monthLabel,
  categories,
  budget,
}: Props) {
  const router = useRouter();
  const isEdit = !!budget?.id;
  const [categoryId, setCategoryId] = useState<string>(budget?.categoryId ?? "");
  const [limit, setLimit] = useState<string>(budget?.limit ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // Só categorias de despesa fazem sentido pra orçamento
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.kind === "expense"),
    [categories],
  );

  const categoryLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const parent of expenseCategories) {
      map.set(parent.id, parent.name);
      for (const child of parent.children) {
        map.set(child.id, `${parent.name} · ${child.name}`);
      }
    }
    return map;
  }, [expenseCategories]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const input = {
      categoryId,
      month,
      limit: limit.trim(),
    };

    startTransition(async () => {
      const res = await upsertBudgetAction(input);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Orçamento atualizado" : "Orçamento criado");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar orçamento" : "Novo orçamento"}
          </DialogTitle>
          <DialogDescription>
            Defina um limite mensal por categoria — {monthLabel}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="categoryId">Categoria</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "")}
              disabled={isPending || isEdit}
            >
              <SelectTrigger id="categoryId" className="w-full">
                <SelectValue placeholder="Selecione a categoria">
                  {(v: string) => categoryLabelById.get(v) ?? "Selecione"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Nenhuma categoria de despesa.
                  </div>
                ) : (
                  expenseCategories.map((parent) => (
                    <SelectGroup key={parent.id}>
                      <SelectLabel>
                        {parent.icon ? `${parent.icon} ` : ""}
                        {parent.name}
                      </SelectLabel>
                      <SelectItem value={parent.id}>
                        {parent.name} (toda)
                      </SelectItem>
                      {parent.children.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.categoryId ? <FieldError msg={errors.categoryId} /> : null}
            {isEdit ? (
              <p className="text-xs text-muted-foreground">
                Pra mudar de categoria, exclua e crie um novo orçamento.
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="limit">Limite mensal (R$)</Label>
            <Input
              id="limit"
              name="limit"
              type="text"
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="500,00"
              required
              disabled={isPending}
            />
            {errors.limit ? <FieldError msg={errors.limit} /> : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose
              render={
                <Button type="button" variant="ghost" disabled={isPending}>
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? LOADING_TEXT.save : isEdit ? "Salvar" : "Criar orçamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="text-sm text-destructive" role="alert">
      {msg}
    </p>
  );
}
