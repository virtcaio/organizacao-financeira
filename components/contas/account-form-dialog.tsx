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
import { LOADING_TEXT } from "@/lib/ui-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFinancialAccountAction,
  updateFinancialAccountAction,
} from "@/lib/actions/financial-accounts";
import {
  FINANCIAL_ACCOUNT_TYPES,
  FINANCIAL_ACCOUNT_TYPE_LABELS,
  SUPPORTED_CURRENCIES,
  type FinancialAccountType,
} from "@/types/financial-account";

type Account = {
  id: string;
  name: string;
  type: FinancialAccountType;
  currency: string;
  openingBalance: string;
};

type Props = {
  account?: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AccountFormDialog({ account, open, onOpenChange }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!account;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const form = new FormData(e.currentTarget);
    const input = {
      name: String(form.get("name") || ""),
      type: String(form.get("type") || "") as FinancialAccountType,
      currency: String(form.get("currency") || ""),
      openingBalance: String(form.get("openingBalance") || "0"),
    };

    startTransition(async () => {
      const res = isEdit
        ? await updateFinancialAccountAction(account!.id, input)
        : await createFinancialAccountAction(input);

      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Conta atualizada" : "Conta criada");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar conta" : "Nova conta"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados desta conta."
              : "Cadastre uma conta corrente, poupança, cartão, carteira ou corretora."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              defaultValue={account?.name ?? ""}
              placeholder="Itaú, Nubank, Carteira..."
              required
              disabled={isPending}
            />
            {errors.name ? <FieldError msg={errors.name} /> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Select name="type" defaultValue={account?.type ?? "checking"} disabled={isPending}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue>
                  {(value: string) =>
                    FINANCIAL_ACCOUNT_TYPE_LABELS[value as FinancialAccountType] ?? "Selecione"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {FINANCIAL_ACCOUNT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type ? <FieldError msg={errors.type} /> : null}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="openingBalance">Saldo inicial</Label>
              <Input
                id="openingBalance"
                name="openingBalance"
                defaultValue={account?.openingBalance ?? "0"}
                inputMode="decimal"
                placeholder="0,00"
                required
                disabled={isPending}
              />
              {errors.openingBalance ? <FieldError msg={errors.openingBalance} /> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select
                name="currency"
                defaultValue={account?.currency ?? "BRL"}
                disabled={isPending}
              >
                <SelectTrigger id="currency" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.currency ? <FieldError msg={errors.currency} /> : null}
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
              {isPending ? LOADING_TEXT.save : isEdit ? "Salvar" : "Criar conta"}
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
