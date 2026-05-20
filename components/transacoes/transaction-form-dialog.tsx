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
import { Textarea } from "@/components/ui/textarea";
import { LOADING_TEXT } from "@/lib/ui-text";
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
  createTransactionAction,
  updateTransactionAction,
} from "@/lib/actions/transactions";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from "@/types/transaction";
import type { CategoryNode } from "@/lib/db/queries/categories";

export type AccountOption = {
  id: string;
  name: string;
  currency: string;
  type: string;
};

export type TransactionDraft = {
  id: string;
  type: TransactionType;
  financialAccountId: string;
  categoryId: string | null;
  amount: string;
  currency: string;
  date: string;
  description: string;
  notes: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountOption[];
  categories: CategoryNode[];
  transaction?: TransactionDraft;
};

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  accounts,
  categories,
  transaction,
}: Props) {
  const router = useRouter();
  const isEdit = !!transaction;
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [accountId, setAccountId] = useState<string>(
    transaction?.financialAccountId ?? accounts[0]?.id ?? "",
  );

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const defaultCurrency = selectedAccount?.currency ?? "BRL";

  const categoriesForType = useMemo(() => {
    return categories.filter((c) => c.kind === type);
  }, [categories, type]);

  const categoryLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const parent of categoriesForType) {
      map.set(parent.id, parent.name);
      for (const child of parent.children) {
        map.set(child.id, `${parent.name} · ${child.name}`);
      }
    }
    return map;
  }, [categoriesForType]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const form = new FormData(e.currentTarget);

    const input = {
      type,
      financialAccountId: accountId,
      categoryId: String(form.get("categoryId") || ""),
      amount: String(form.get("amount") || ""),
      currency: defaultCurrency,
      date: String(form.get("date") || todayIso()),
      description: String(form.get("description") || ""),
      notes: String(form.get("notes") || ""),
    };

    startTransition(async () => {
      const res = isEdit
        ? await updateTransactionAction(transaction!.id, input)
        : await createTransactionAction(input);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Transação atualizada" : "Transação criada");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar transação" : "Nova transação"}</DialogTitle>
          <DialogDescription>
            Registre uma receita ou despesa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => v && setType(v as TransactionType)}
                disabled={isPending}
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue>
                    {(v: string) => TRANSACTION_TYPE_LABELS[v as TransactionType]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRANSACTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={transaction?.date ?? todayIso()}
                required
                disabled={isPending}
              />
              {errors.date ? <FieldError msg={errors.date} /> : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="financialAccountId">Conta</Label>
            <Select
              value={accountId}
              onValueChange={(v) => setAccountId(v ?? "")}
              disabled={isPending}
            >
              <SelectTrigger id="financialAccountId" className="w-full">
                <SelectValue>
                  {(v: string) => accounts.find((a) => a.id === v)?.name ?? "Selecione"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    <span className="ml-2 text-xs text-muted-foreground">{a.currency}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.financialAccountId ? (
              <FieldError msg={errors.financialAccountId} />
            ) : null}
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                name="description"
                defaultValue={transaction?.description ?? ""}
                placeholder="Supermercado Pão de Açúcar"
                required
                disabled={isPending}
              />
              {errors.description ? <FieldError msg={errors.description} /> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor ({defaultCurrency})</Label>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                defaultValue={transaction?.amount ?? ""}
                placeholder="0,00"
                required
                disabled={isPending}
              />
              {errors.amount ? <FieldError msg={errors.amount} /> : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="categoryId">Categoria</Label>
            <Select
              name="categoryId"
              defaultValue={transaction?.categoryId ?? ""}
              disabled={isPending}
            >
              <SelectTrigger id="categoryId" className="w-full">
                <SelectValue placeholder="Selecione a categoria">
                  {(value: string) => categoryLabelById.get(value) ?? "Selecione a categoria"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categoriesForType.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Nenhuma categoria para este tipo.
                  </div>
                ) : (
                  categoriesForType.map((parent) => (
                    <SelectGroup key={parent.id}>
                      <SelectLabel>
                        {parent.icon ? `${parent.icon} ` : ""}
                        {parent.name}
                      </SelectLabel>
                      {parent.children.length === 0 ? (
                        <SelectItem value={parent.id}>{parent.name}</SelectItem>
                      ) : (
                        parent.children.map((child) => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.categoryId ? <FieldError msg={errors.categoryId} /> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={transaction?.notes ?? ""}
              disabled={isPending}
            />
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
              {isPending ? LOADING_TEXT.save : isEdit ? "Salvar" : "Criar transação"}
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
