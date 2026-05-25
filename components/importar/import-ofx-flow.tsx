"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  Loader2Icon,
  SparklesIcon,
  TrashIcon,
  UploadCloudIcon,
  WalletIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LOADING_TEXT } from "@/lib/ui-text";
import { formatCurrency } from "@/lib/format";
import { useAnthropicKey } from "@/lib/ai/use-anthropic-key";
import { categorizeImportedWithClaude } from "@/lib/ai/categorize-imported";
import type { AccountOption } from "@/components/transacoes/transaction-form-dialog";
import type { CategoryNode } from "@/lib/db/queries/categories";
import type { OfxStatement, OfxTransaction } from "@/lib/ofx/parse";

type Step = "upload" | "processing" | "review";

type DraftRow = {
  fitid: string;
  date: string;
  description: string;
  amount: string; // valor absoluto positivo
  type: "income" | "expense";
  categoryId: string | null;
};

export function ImportOfxFlow({
  accounts,
  categories,
}: {
  accounts: AccountOption[];
  categories: CategoryNode[];
}) {
  const router = useRouter();
  const { key } = useAnthropicKey();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [statement, setStatement] = useState<OfxStatement | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [aiBusy, setAiBusy] = useState(false);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId],
  );
  const currency = selectedAccount?.currency ?? "BRL";

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const r of rows) {
      const n = Number(r.amount.replace(",", ".")) || 0;
      if (r.type === "income") income += n;
      else expense += n;
    }
    return { income, expense, net: income - expense };
  }, [rows]);

  if (accounts.length === 0) {
    return (
      <Guard
        icon={<WalletIcon className="size-5" />}
        title="Cadastre uma conta primeiro"
        description="Importar OFX precisa de uma conta cadastrada — escolha qual conta o extrato representa."
        ctaHref="/contas"
        ctaLabel="Ir para Contas"
      />
    );
  }

  function onPick() {
    fileInputRef.current?.click();
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);
    setStep("processing");
    setStatement(null);
    setRows([]);

    const formData = new FormData();
    formData.append("file", file);

    let parsed: OfxStatement | null = null;
    try {
      const res = await fetch("/api/import/ofx", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setErrorMsg(body.error ?? `Erro HTTP ${res.status}`);
        setStep("upload");
        return;
      }
      parsed = body.data as OfxStatement;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro de rede.");
      setStep("upload");
      return;
    }

    setStatement(parsed);
    setRows(
      parsed.transactions.map((t: OfxTransaction) => ({
        fitid: t.fitid,
        date: t.date,
        description: t.description,
        amount: t.amount.toFixed(2),
        type: t.type,
        categoryId: null,
      })),
    );
    setStep("review");

    // Auto-categoriza com IA se a chave estiver disponível
    if (key && parsed.transactions.length > 0) {
      setAiBusy(true);
      const res = await categorizeImportedWithClaude({
        apiKey: key,
        items: parsed.transactions.map((t) => ({
          id: t.fitid,
          description: t.description,
          amount: t.amount,
          type: t.type,
        })),
      });
      setAiBusy(false);
      if (res.ok) {
        const byId = new Map(res.data.suggestions.map((s) => [s.id, s.category_id]));
        setRows((prev) =>
          prev.map((r) => ({ ...r, categoryId: byId.get(r.fitid) ?? null })),
        );
        toast.success("Categorias sugeridas pela IA.");
      } else {
        toast.error(`Categorização falhou: ${res.error}`);
      }
    }
  }

  function updateRow(fitid: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.fitid === fitid ? { ...r, ...patch } : r)));
  }

  function removeRow(fitid: string) {
    setRows((prev) => prev.filter((r) => r.fitid !== fitid));
  }

  function onSave() {
    if (!accountId) {
      toast.error("Escolha uma conta.");
      return;
    }
    if (rows.length === 0) {
      toast.error("Nada para importar.");
      return;
    }
    startSaving(async () => {
      const payload = {
        rows: rows.map((r) => ({
          type: r.type,
          financialAccountId: accountId,
          categoryId: r.categoryId,
          amount: r.amount,
          currency,
          date: r.date,
          description: r.description,
          notes: null,
          source: "ofx" as const,
          sourceRef: r.fitid,
        })),
      };
      try {
        const res = await fetch("/api/transactions/bulk", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!res.ok || !body.ok) {
          toast.error(body.error ?? `Erro HTTP ${res.status}`);
          return;
        }
        const { inserted, skipped } = body as { inserted: number; skipped: number };
        if (skipped > 0) {
          toast.success(
            `${inserted} transações importadas · ${skipped} já existiam (ignoradas)`,
          );
        } else {
          toast.success(`${inserted} transações importadas.`);
        }
        router.push("/transacoes");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro de rede.");
      }
    });
  }

  function reset() {
    setStep("upload");
    setStatement(null);
    setRows([]);
    setFileName(null);
    setErrorMsg(null);
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Importar extrato (OFX)</h1>
        <p className="text-sm text-muted-foreground">
          Sobe o arquivo OFX do seu banco; o app lê localmente e a IA sugere
          categorias.
        </p>
      </header>

      {step === "upload" ? (
        <Card>
          <CardHeader>
            <CardTitle>Selecione conta e arquivo</CardTitle>
            <CardDescription>
              Quase todo banco exporta OFX no internet banking (Extrato → Exportar).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="account">Conta de destino</Label>
              <Select
                value={accountId}
                onValueChange={(v) => setAccountId(v ?? "")}
              >
                <SelectTrigger id="account" className="w-full">
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
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx,application/x-ofx,application/octet-stream"
                className="hidden"
                onChange={onFileChosen}
              />
              <Button onClick={onPick}>
                <UploadCloudIcon className="mr-2 size-4" />
                Selecionar arquivo .ofx
              </Button>
              {fileName ? (
                <p className="mt-2 text-xs text-muted-foreground">{fileName}</p>
              ) : null}
            </div>
            {errorMsg ? (
              <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
                <AlertCircleIcon className="size-4" />
                {errorMsg}
              </p>
            ) : null}
            {!key ? (
              <p className="text-xs text-muted-foreground">
                Sem chave Anthropic configurada — você pode importar mesmo assim,
                só não terá categorização automática.{" "}
                <Link href="/configuracoes" className="underline hover:text-foreground">
                  Configurar
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : step === "processing" ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-12">
            <Loader2Icon className="size-5 animate-spin" />
            <span className="text-sm">Lendo o OFX…</span>
          </CardContent>
        </Card>
      ) : (
        <>
          {statement ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {statement.account.isCreditCard ? "Fatura" : "Extrato"} detectado
                </CardTitle>
                <CardDescription>
                  {statement.account.accountId
                    ? `Conta ${statement.account.accountId}`
                    : "Conta sem identificação"}
                  {statement.account.bankId ? ` · Banco ${statement.account.bankId}` : ""}
                  {" · "}
                  {statement.startDate && statement.endDate
                    ? `${statement.startDate} → ${statement.endDate}`
                    : `${rows.length} transações`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Entradas:</span>{" "}
                  <span className="font-medium text-income tabular-nums">
                    {formatCurrency(totals.income, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Saídas:</span>{" "}
                  <span className="font-medium text-expense tabular-nums">
                    {formatCurrency(totals.expense, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Saldo:</span>{" "}
                  <span
                    className={`font-medium tabular-nums ${
                      totals.net >= 0 ? "text-income" : "text-expense"
                    }`}
                  >
                    {formatCurrency(totals.net, currency)}
                  </span>
                </div>
                {aiBusy ? (
                  <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2Icon className="size-3 animate-spin" />
                    Categorizando com IA…
                  </span>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {aiBusy ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm"
            >
              <Loader2Icon className="size-4 animate-spin text-primary" />
              <span>
                <strong className="font-medium">Categorizando com IA…</strong>{" "}
                <span className="text-muted-foreground">
                  As categorias ficam bloqueadas até a IA terminar. Você pode
                  editar a descrição e a data normalmente.
                </span>
              </span>
            </div>
          ) : null}

          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 w-32">Data</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2 w-20">Tipo</th>
                  <th className="px-3 py-2 w-56">Categoria</th>
                  <th className="px-3 py-2 w-28 text-right">Valor</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <OfxRow
                    key={r.fitid}
                    row={r}
                    categories={categories}
                    onChange={(patch) => updateRow(r.fitid, patch)}
                    onRemove={() => removeRow(r.fitid)}
                    disabled={isSaving}
                    aiBusy={aiBusy}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={reset} disabled={isSaving}>
              Trocar arquivo
            </Button>
            <Button
              onClick={onSave}
              disabled={isSaving || aiBusy || rows.length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  {LOADING_TEXT.save}
                </>
              ) : aiBusy ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Aguardando IA…
                </>
              ) : (
                <>
                  <SparklesIcon className="mr-2 size-4" />
                  Importar {rows.length}{" "}
                  {rows.length === 1 ? "transação" : "transações"}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function OfxRow({
  row,
  categories,
  onChange,
  onRemove,
  disabled,
  aiBusy,
}: {
  row: DraftRow;
  categories: CategoryNode[];
  onChange: (patch: Partial<DraftRow>) => void;
  onRemove: () => void;
  disabled?: boolean;
  aiBusy?: boolean;
}) {
  const filtered = useMemo(
    () => categories.filter((c) => c.kind === row.type),
    [categories, row.type],
  );
  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of filtered) {
      map.set(p.id, p.name);
      for (const ch of p.children) map.set(ch.id, `${p.name} · ${ch.name}`);
    }
    return map;
  }, [filtered]);

  return (
    <tr className="border-t">
      <td className="px-3 py-2">
        <Input
          type="date"
          value={row.date}
          onChange={(e) => onChange({ date: e.target.value })}
          disabled={disabled}
          className="h-8 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <Input
          value={row.description}
          onChange={(e) => onChange({ description: e.target.value })}
          disabled={disabled}
          className="h-8 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <Badge variant={row.type === "income" ? "secondary" : "outline"} className="text-[10px]">
          {row.type === "income" ? "Entrada" : "Saída"}
        </Badge>
      </td>
      <td className="px-3 py-2">
        {aiBusy ? (
          <div className="flex h-8 items-center gap-1.5 rounded-md border border-dashed border-primary/30 bg-primary/5 px-2 text-xs text-muted-foreground">
            <Loader2Icon className="size-3 animate-spin text-primary" />
            Categorizando…
          </div>
        ) : (
          <Select
            value={row.categoryId ?? ""}
            onValueChange={(v) => onChange({ categoryId: v && v !== "" ? v : null })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue placeholder="Sem categoria">
                {(v: string) => labelById.get(v) ?? "Sem categoria"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filtered.map((parent) => (
                <SelectGroup key={parent.id}>
                  <SelectLabel>{parent.name}</SelectLabel>
                  {parent.children.length === 0 ? (
                    <SelectItem value={parent.id}>{parent.name}</SelectItem>
                  ) : (
                    parent.children.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        {ch.name}
                      </SelectItem>
                    ))
                  )}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>
      <td
        className={`px-3 py-2 text-right tabular-nums text-xs ${
          row.type === "income" ? "text-income" : "text-expense"
        }`}
      >
        {row.type === "income" ? "+ " : "− "}
        {row.amount}
      </td>
      <td className="px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onRemove}
          disabled={disabled}
        >
          <TrashIcon className="size-3.5" />
        </Button>
      </td>
    </tr>
  );
}

function Guard({
  icon,
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={ctaHref} className={buttonVariants()}>
          {ctaLabel}
        </Link>
      </CardContent>
    </Card>
  );
}
