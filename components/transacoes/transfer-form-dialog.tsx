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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTransferAction, updateTransferAction } from "@/lib/actions/transactions";
import { LOADING_TEXT } from "@/lib/ui-text";
import { todayIso } from "@/lib/date";
import type { AccountOption } from "./transaction-form-dialog";

export type TransferDraft = {
  lineId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  date: string;
  description: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountOption[];
  transfer?: TransferDraft;
};

export function TransferFormDialog({ open, onOpenChange, accounts, transfer }: Props) {
  const router = useRouter();
  const isEdit = !!transfer;
  const [fromId, setFromId] = useState(transfer?.fromAccountId ?? accounts[0]?.id ?? "");
  const [toId, setToId] = useState(
    transfer?.toAccountId ?? accounts[1]?.id ?? "",
  );
  const [amount, setAmount] = useState(transfer?.amount ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const accountLabel = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? "Selecione";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const form = new FormData(e.currentTarget);
    const input = {
      fromAccountId: fromId,
      toAccountId: toId,
      amount: String(form.get("amount") || ""),
      date: String(form.get("date") || todayIso()),
      description: String(form.get("description") || ""),
    };

    startTransition(async () => {
      const res = isEdit
        ? await updateTransferAction(transfer!.lineId, input)
        : await createTransferAction(input);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Transferência atualizada" : "Transferência criada");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar transferência" : "Nova transferência"}
          </DialogTitle>
          <DialogDescription>
            Move saldo entre duas contas suas. Não conta como receita nem despesa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="fromAccountId">Conta de origem</Label>
            <Select
              value={fromId}
              onValueChange={(v) => setFromId(v ?? "")}
              disabled={isPending || isEdit}
            >
              <SelectTrigger id="fromAccountId" className="w-full">
                <SelectValue>{(v: string) => accountLabel(v)}</SelectValue>
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="toAccountId">Conta de destino</Label>
            <Select
              value={toId}
              onValueChange={(v) => setToId(v ?? "")}
              disabled={isPending || isEdit}
            >
              <SelectTrigger id="toAccountId" className="w-full">
                <SelectValue>{(v: string) => accountLabel(v)}</SelectValue>
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
            {errors.toAccountId ? <FieldError msg={errors.toAccountId} /> : null}
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                name="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500,00"
                required
                disabled={isPending}
              />
              {errors.amount ? <FieldError msg={errors.amount} /> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={transfer?.date ?? todayIso()}
                required
                disabled={isPending}
              />
              {errors.date ? <FieldError msg={errors.date} /> : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              name="description"
              defaultValue={transfer?.description ?? ""}
              placeholder="Reserva de emergência"
              required
              disabled={isPending}
            />
            {errors.description ? <FieldError msg={errors.description} /> : null}
          </div>

          {isEdit ? (
            <p className="text-xs text-muted-foreground">
              Pra mudar as contas, exclua e crie uma nova transferência.
            </p>
          ) : null}

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
                  : "Criar transferência"}
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
