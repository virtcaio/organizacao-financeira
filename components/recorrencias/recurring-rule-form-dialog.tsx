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
import {
  createRecurringRuleAction,
  updateRecurringRuleAction,
} from "@/lib/actions/recurring";
import { LOADING_TEXT } from "@/lib/ui-text";
import { todayIso } from "@/lib/date";
import {
  FREQUENCY_LABELS,
  FREQUENCY_UNIT,
  RECURRING_FREQUENCIES,
  type RecurringFrequency,
} from "@/lib/recurring";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from "@/types/transaction";
import type { AccountOption } from "@/components/transacoes/transaction-form-dialog";
import type { CategoryNode } from "@/lib/db/queries/categories";

export type RecurringDraft = {
  id: string;
  type: TransactionType;
  financialAccountId: string;
  categoryId: string | null;
  amount: string;
  description: string;
  frequency: RecurringFrequency;
  interval: number;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountOption[];
  categories: CategoryNode[];
  rule?: RecurringDraft;
};

export function RecurringRuleFormDialog({
  open,
  onOpenChange,
  accounts,
  categories,
  rule,
}: Props) {
  const router = useRouter();
  const isEdit = !!rule;
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [type, setType] = useState<TransactionType>(rule?.type ?? "expense");
  const [accountId, setAccountId] = useState(
    rule?.financialAccountId ?? accounts[0]?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? "");
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    rule?.frequency ?? "monthly",
  );

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const currency = selectedAccount?.currency ?? "BRL";

  const categoriesForType = useMemo(
    () => categories.filter((c) => c.kind === type),
    [categories, type],
  );

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
      categoryId,
      amount: String(form.get("amount") || ""),
      currency,
      description: String(form.get("description") || ""),
      frequency,
      interval: String(form.get("interval") || "1"),
      dayOfMonth:
        frequency === "monthly" && form.get("dayOfMonth")
          ? String(form.get("dayOfMonth"))
          : undefined,
      startDate: String(form.get("startDate") || todayIso()),
      endDate: form.get("endDate") ? String(form.get("endDate")) : undefined,
    };

    startTransition(async () => {
      const res = isEdit
        ? await updateRecurringRuleAction(rule!.id, input)
        : await createRecurringRuleAction(input);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Recorrência atualizada" : "Recorrência criada");
      onOpenChange(false);
      router.refresh();
    });
  }

  const [unitSingular, unitPlural] = FREQUENCY_UNIT[frequency];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar recorrência" : "Nova recorrência"}
          </DialogTitle>
          <DialogDescription>
            Lançamentos que se repetem — salário, aluguel, assinaturas. Geradas
            automaticamente na data.
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
              <Label htmlFor="frequency">Frequência</Label>
              <Select
                value={frequency}
                onValueChange={(v) => v && setFrequency(v as RecurringFrequency)}
                disabled={isPending}
              >
                <SelectTrigger id="frequency" className="w-full">
                  <SelectValue>
                    {(v: string) => FREQUENCY_LABELS[v as RecurringFrequency]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {RECURRING_FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {FREQUENCY_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <span className="ml-2 text-xs text-muted-foreground">
                      {a.currency}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.financialAccountId ? (
              <FieldError msg={errors.financialAccountId} />
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="categoryId">Categoria (opcional)</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "")}
              disabled={isPending}
            >
              <SelectTrigger id="categoryId" className="w-full">
                <SelectValue placeholder="Sem categoria">
                  {(v: string) => categoryLabelById.get(v) ?? "Sem categoria"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categoriesForType.map((parent) => (
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
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId ? <FieldError msg={errors.categoryId} /> : null}
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                name="description"
                defaultValue={rule?.description ?? ""}
                placeholder="Aluguel"
                required
                disabled={isPending}
              />
              {errors.description ? <FieldError msg={errors.description} /> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor ({currency})</Label>
              <Input
                id="amount"
                name="amount"
                type="text"
                inputMode="decimal"
                defaultValue={rule?.amount ?? ""}
                placeholder="0,00"
                required
                disabled={isPending}
              />
              {errors.amount ? <FieldError msg={errors.amount} /> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="interval">A cada</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="interval"
                  name="interval"
                  type="number"
                  min={1}
                  max={365}
                  defaultValue={rule?.interval ?? 1}
                  required
                  disabled={isPending}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {(rule?.interval ?? 1) > 1 ? unitPlural : unitSingular}
                </span>
              </div>
              {errors.interval ? <FieldError msg={errors.interval} /> : null}
            </div>
            {frequency === "monthly" ? (
              <div className="grid gap-2">
                <Label htmlFor="dayOfMonth">Dia do mês (opcional)</Label>
                <Input
                  id="dayOfMonth"
                  name="dayOfMonth"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={rule?.dayOfMonth ?? ""}
                  placeholder="dia da data de início"
                  disabled={isPending}
                />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="startDate">
                {isEdit ? "Próxima execução" : "Data de início"}
              </Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={rule?.startDate ?? todayIso()}
                required
                disabled={isPending}
              />
              {errors.startDate ? <FieldError msg={errors.startDate} /> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">Data final (opcional)</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={rule?.endDate ?? ""}
                disabled={isPending}
              />
              {errors.endDate ? <FieldError msg={errors.endDate} /> : null}
            </div>
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
              {isPending
                ? LOADING_TEXT.save
                : isEdit
                  ? "Salvar"
                  : "Criar recorrência"}
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
