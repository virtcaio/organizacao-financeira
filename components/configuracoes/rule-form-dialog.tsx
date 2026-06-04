"use client";

import { useState, useTransition } from "react";
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
import {
  createRuleAction,
  updateRuleAction,
} from "@/lib/actions/categorization-rules";
import { LOADING_TEXT } from "@/lib/ui-text";
import { CATEGORY_KIND_LABELS, CATEGORY_KINDS } from "@/types/category";
import type { CategoryNode } from "@/lib/db/queries/categories";

export type RuleEditPreset = {
  id: string;
  pattern: string;
  categoryId: string;
  priority: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Árvore plana de categorias visíveis pro user. */
  categories: CategoryNode[];
  /** Quando passado: modo edição. */
  preset?: RuleEditPreset;
  /** Pré-preenche pattern/categoryId no modo criar (atalho do review). */
  presetCreate?: { pattern?: string; categoryId?: string };
};

export function RuleFormDialog({
  open,
  onOpenChange,
  categories,
  preset,
  presetCreate,
}: Props) {
  const router = useRouter();
  const isEdit = !!preset;

  const [pattern, setPattern] = useState(
    preset?.pattern ?? presetCreate?.pattern ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    preset?.categoryId ?? presetCreate?.categoryId ?? "",
  );
  const [priority, setPriority] = useState(String(preset?.priority ?? 100));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // Flatten categorias por kind, expandindo mãe+filhos
  const flatByKind: Record<string, { id: string; label: string }[]> = {
    income: [],
    expense: [],
    investment: [],
    transfer: [],
  };
  for (const c of categories) {
    flatByKind[c.kind].push({
      id: c.id,
      label: `${c.icon ? `${c.icon} ` : ""}${c.name}`,
    });
    for (const child of c.children) {
      flatByKind[c.kind].push({
        id: child.id,
        label: `   ${c.name} · ${child.name}`,
      });
    }
  }

  const labelById = new Map<string, string>();
  for (const list of Object.values(flatByKind)) {
    for (const c of list) labelById.set(c.id, c.label.trim());
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const priorityNum = Number(priority);
    if (Number.isNaN(priorityNum)) {
      setErrors({ priority: "Prioridade inválida" });
      return;
    }

    startTransition(async () => {
      const res = isEdit
        ? await updateRuleAction(preset!.id, {
            pattern: pattern.trim(),
            categoryId,
            priority: priorityNum,
          })
        : await createRuleAction({
            pattern: pattern.trim(),
            categoryId,
            priority: priorityNum,
          });

      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Regra atualizada" : "Regra criada");
      onOpenChange(false);
      setPattern("");
      setCategoryId("");
      setPriority("100");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar regra" : "Nova regra"}
          </DialogTitle>
          <DialogDescription>
            Se a descrição da transação contém o padrão (case-insensitive),
            a categoria é atribuída automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="pattern">Padrão</Label>
            <Input
              id="pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="uber eats"
              required
              disabled={isPending}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Substring case-insensitive. Ex: "uber" casa "UBER *TRIP 123".
            </p>
            {errors.pattern ? <FieldError msg={errors.pattern} /> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="categoryId">Categoria</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "")}
              disabled={isPending}
            >
              <SelectTrigger id="categoryId" className="w-full">
                <SelectValue placeholder="Selecione a categoria">
                  {(v: string) => labelById.get(v) ?? "Selecione"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_KINDS.map((k) => {
                  const list = flatByKind[k];
                  if (list.length === 0) return null;
                  return (
                    <SelectGroup key={k}>
                      <SelectLabel>{CATEGORY_KIND_LABELS[k]}</SelectLabel>
                      {list.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.categoryId ? <FieldError msg={errors.categoryId} /> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Input
              id="priority"
              type="number"
              min={0}
              max={9999}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={isPending}
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">
              Menor = aplica primeiro. Default 100.
            </p>
            {errors.priority ? <FieldError msg={errors.priority} /> : null}
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
              {isPending ? LOADING_TEXT.save : isEdit ? "Salvar" : "Criar regra"}
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
