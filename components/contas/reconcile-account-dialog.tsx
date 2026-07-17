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
import { reconcileAccountAction } from "@/lib/actions/financial-accounts";
import { LOADING_TEXT } from "@/lib/ui-text";
import { todayIso } from "@/lib/date";
import { normalizeAmountInput } from "@/types/amount";
import { formatCurrency } from "@/lib/format";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    id: string;
    name: string;
    currency: string;
    computedBalance: string;
  };
};

const AMOUNT_RE = /^-?\d+(\.\d{1,2})?$/;

export function ReconcileAccountDialog({ open, onOpenChange, account }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [realBalance, setRealBalance] = useState("");
  const [date, setDate] = useState(todayIso());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentBalance = Number(account.computedBalance);
  const realNumeric = useMemo(() => {
    const normalized = normalizeAmountInput(realBalance);
    if (!normalized || !AMOUNT_RE.test(normalized)) return null;
    return Number(normalized);
  }, [realBalance]);

  const delta = useMemo(() => {
    if (realNumeric === null) return null;
    return Number((realNumeric - currentBalance).toFixed(2));
  }, [realNumeric, currentBalance]);

  const canSubmit =
    !isPending && delta !== null && Math.abs(delta) >= 0.005;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const res = await reconcileAccountAction({
        accountId: account.id,
        realBalance: normalizeAmountInput(realBalance),
        date,
      });
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      const applied = res.data.delta;
      if (applied === 0) {
        toast.info("Saldos coincidem — nenhum ajuste foi criado.");
      } else {
        toast.success(
          `Saldo conciliado — ajuste de ${formatCurrency(applied.toFixed(2), account.currency)}.`,
        );
      }
      onOpenChange(false);
      setRealBalance("");
      setDate(todayIso());
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conciliar saldo</DialogTitle>
          <DialogDescription>
            Informe o saldo real (do banco ou cartão). A diferença vira uma
            transação tipo &ldquo;Ajuste&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-1.5 rounded-md border bg-muted/30 p-3">
            <span className="text-xs text-muted-foreground">
              Saldo atual no app ({account.name})
            </span>
            <span className="text-lg font-medium tabular-nums">
              {formatCurrency(account.computedBalance, account.currency)}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="realBalance">Saldo real ({account.currency})</Label>
              <Input
                id="realBalance"
                inputMode="decimal"
                value={realBalance}
                onChange={(e) => setRealBalance(e.target.value)}
                placeholder="0,00"
                required
                disabled={isPending}
                autoFocus
              />
              {errors.realBalance ? <FieldError msg={errors.realBalance} /> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isPending}
              />
              {errors.date ? <FieldError msg={errors.date} /> : null}
            </div>
          </div>

          {delta !== null ? (
            <div
              className={
                Math.abs(delta) < 0.005
                  ? "rounded-md border border-muted bg-muted/30 p-3 text-sm text-muted-foreground"
                  : delta > 0
                    ? "rounded-md border border-income/30 bg-income/5 p-3 text-sm"
                    : "rounded-md border border-expense/30 bg-expense/5 p-3 text-sm"
              }
            >
              {Math.abs(delta) < 0.005 ? (
                <>Saldos coincidem — nada a ajustar.</>
              ) : (
                <>
                  Diferença:{" "}
                  <span className="font-medium tabular-nums">
                    {delta > 0 ? "+" : ""}
                    {formatCurrency(delta.toFixed(2), account.currency)}
                  </span>{" "}
                  vira uma transação &ldquo;Ajuste&rdquo;.
                </>
              )}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose
              render={
                <Button type="button" variant="ghost" disabled={isPending}>
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" disabled={!canSubmit}>
              {isPending ? LOADING_TEXT.save : "Conciliar"}
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
