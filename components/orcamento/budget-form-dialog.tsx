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
import { cn } from "@/lib/utils";
import type { BudgetScope } from "@/types/budget";
import type { CategoryNode } from "@/lib/db/queries/categories";

/** Edição: categoria + escopo fixos. Criação: ambos livres. */
export type BudgetPreset = {
  categoryId: string;
  categoryLabel: string;
  scope: BudgetScope;
  limit: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string; // YYYY-MM-01
  monthLabel: string;
  categories: CategoryNode[];
  preset?: BudgetPreset;
};

export function BudgetFormDialog({
  open,
  onOpenChange,
  month,
  monthLabel,
  categories,
  preset,
}: Props) {
  const router = useRouter();
  const isEdit = !!preset;
  const [categoryId, setCategoryId] = useState(preset?.categoryId ?? "");
  const [scope, setScope] = useState<BudgetScope>(preset?.scope ?? "template");
  const [limit, setLimit] = useState(preset?.limit ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

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
    startTransition(async () => {
      const res = await upsertBudgetAction({
        categoryId,
        limit: limit.trim(),
        scope,
        month: scope === "month" ? month : undefined,
      });
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
            {isEdit
              ? scope === "template"
                ? "Editar orçamento padrão"
                : `Editar ajuste de ${monthLabel}`
              : "Novo orçamento"}
          </DialogTitle>
          <DialogDescription>
            {scope === "template"
              ? "O limite padrão vale para todos os meses, salvo ajuste pontual."
              : `Ajuste só para ${monthLabel}. Outros meses seguem o padrão.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="categoryId">Categoria</Label>
            {isEdit ? (
              <Input value={preset!.categoryLabel} disabled readOnly />
            ) : (
              <Select
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ?? "")}
                disabled={isPending}
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
            )}
            {errors.categoryId ? <FieldError msg={errors.categoryId} /> : null}
          </div>

          {!isEdit ? (
            <div className="grid gap-2">
              <Label>Aplicar a</Label>
              <div className="grid grid-cols-2 gap-2">
                <ScopeButton
                  active={scope === "template"}
                  onClick={() => setScope("template")}
                  disabled={isPending}
                  title="Todo mês"
                  hint="Limite padrão"
                />
                <ScopeButton
                  active={scope === "month"}
                  onClick={() => setScope("month")}
                  disabled={isPending}
                  title={`Apenas ${monthLabel}`}
                  hint="Ajuste pontual"
                />
              </div>
            </div>
          ) : null}

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
            {errors.month ? <FieldError msg={errors.month} /> : null}
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

function ScopeButton({
  active,
  onClick,
  disabled,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-input hover:bg-accent",
      )}
    >
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="text-sm text-destructive" role="alert">
      {msg}
    </p>
  );
}
