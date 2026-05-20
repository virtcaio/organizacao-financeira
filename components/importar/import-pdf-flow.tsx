"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  FileTextIcon,
  KeyIcon,
  Loader2Icon,
  SparklesIcon,
  UploadCloudIcon,
  WalletIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LOADING_TEXT } from "@/lib/ui-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ReviewRow, type DraftRow } from "./review-row";
import { useAnthropicKey } from "@/lib/ai/use-anthropic-key";
import { importPdfWithClaude } from "@/lib/ai/import-pdf";
import type { AccountOption } from "@/components/transacoes/transaction-form-dialog";
import type { CategoryNode } from "@/lib/db/queries/categories";
import type { ImportPdfOutput } from "@/lib/ai/types";
import { formatCurrency } from "@/lib/format";

type Step = "upload" | "processing" | "review";

export function ImportPdfFlow({
  accounts,
  categories,
}: {
  accounts: AccountOption[];
  categories: CategoryNode[];
}) {
  const router = useRouter();
  const { hasKey, loaded, key } = useAnthropicKey();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [aiMeta, setAiMeta] = useState<ImportPdfOutput["card_metadata"] | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const accountCurrency = useMemo(
    () => accounts.find((a) => a.id === accountId)?.currency ?? "BRL",
    [accounts, accountId],
  );

  const totalAmount = useMemo(
    () => rows.reduce((acc, r) => acc + (Number(r.amount.replace(",", ".")) || 0), 0),
    [rows],
  );

  // === Guards ============================================================
  if (!loaded) return null;

  if (!hasKey) {
    return (
      <Guard
        icon={<KeyIcon className="size-5" />}
        title="Configure sua chave da Anthropic primeiro"
        description="A importação por IA usa o modelo Claude. Cole sua chave em Configurações e volte aqui."
        ctaHref="/configuracoes"
        ctaLabel="Ir para Configurações"
      />
    );
  }

  if (accounts.length === 0) {
    return (
      <Guard
        icon={<WalletIcon className="size-5" />}
        title="Cadastre uma conta primeiro"
        description="As transações importadas precisam ser associadas a uma conta (cartão de crédito, por exemplo)."
        ctaHref="/contas"
        ctaLabel="Ir para Contas"
      />
    );
  }

  // === Handlers ==========================================================

  async function onUpload(file: File) {
    if (!key) return;
    setStep("processing");
    setErrorMsg(null);

    const result = await importPdfWithClaude({
      apiKey: key,
      file,
    });

    if (!result.ok) {
      setErrorMsg(result.error);
      setStep("upload");
      toast.error(result.error);
      return;
    }

    setAiMeta(result.data.card_metadata ?? null);
    setRows(
      result.data.transactions.map((t, i) => ({
        key: `${t.date}-${i}-${t.description}`,
        date: t.date,
        description: t.description,
        amount: t.amount.toFixed(2),
        categoryId: t.category_id,
        installmentSeq: t.installment_seq ?? null,
        installmentTotal: t.installment_total ?? null,
      })),
    );
    setStep("review");
    toast.success(
      `${result.data.transactions.length} transações extraídas (${result.tokensIn} tokens in / ${result.tokensOut} out)`,
    );
  }

  function updateRow(idx: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function reset() {
    setRows([]);
    setAiMeta(null);
    setFileName(null);
    setErrorMsg(null);
    setStep("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onSave() {
    if (rows.length === 0) return;
    startSaving(async () => {
      try {
        const res = await fetch("/api/transactions/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: rows.map((r) => ({
              type: "expense",
              financialAccountId: accountId,
              categoryId: r.categoryId,
              amount: r.amount.replace(",", "."),
              currency: accountCurrency as "BRL" | "USD" | "EUR",
              date: r.date,
              description: r.description,
              installmentSeq: r.installmentSeq,
              installmentTotal: r.installmentTotal,
              source: "pdf",
            })),
          }),
        });
        const body = (await res.json()) as {
          ok: boolean;
          inserted?: number;
          error?: string;
        };
        if (!res.ok || !body.ok) {
          toast.error(body.error ?? `Erro HTTP ${res.status}`);
          return;
        }
        toast.success(`${body.inserted} transações importadas.`);
        reset();
        router.push("/transacoes");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro de rede ao salvar.",
        );
      }
    });
  }

  // === Render ============================================================

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Importar fatura (PDF)</h1>
        <p className="text-sm text-muted-foreground">
          Envie um PDF de fatura de cartão de crédito. A IA extrai as transações e você
          revisa antes de gravar.
        </p>
      </header>

      {/* Account picker is sticky across the flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Conta destino</CardTitle>
          <CardDescription>
            As transações serão lançadas nesta conta (use o cartão correspondente).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="account">Conta</Label>
            <Select
              value={accountId}
              onValueChange={(v) => v && setAccountId(v)}
              disabled={step === "processing" || isSaving}
            >
              <SelectTrigger id="account">
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
          </div>
        </CardContent>
      </Card>

      {/* Step 2: upload */}
      {step === "upload" || step === "processing" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Selecione o PDF da fatura</CardTitle>
            <CardDescription>
              Máximo 20MB. Os dados do PDF são enviados direto do seu navegador para a
              Anthropic (sua chave, seu custo).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "processing" ? (
              <ProcessingState fileName={fileName} />
            ) : (
              <UploadDropzone
                inputRef={fileInputRef}
                onFile={(f) => {
                  setFileName(f.name);
                  void onUpload(f);
                }}
              />
            )}
            {errorMsg ? (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Step 3: review */}
      {step === "review" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. Revisar transações</CardTitle>
            <CardDescription>
              Edite categoria, valor ou descrição antes de salvar. Total agrupado abaixo.
              {aiMeta?.issuer ? ` Emissor detectado: ${aiMeta.issuer}.` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nada para importar.{" "}
                <button
                  className="underline underline-offset-4"
                  onClick={reset}
                >
                  Tentar outro PDF
                </button>
                .
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr>
                        <th className="text-left font-medium pb-2 w-32">Data</th>
                        <th className="text-left font-medium pb-2">Descrição</th>
                        <th className="text-left font-medium pb-2 w-56">Categoria</th>
                        <th className="text-right font-medium pb-2 w-28">Valor</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => (
                        <ReviewRow
                          key={r.key}
                          row={r}
                          categories={categories}
                          onChange={(patch) => updateRow(idx, patch)}
                          onRemove={() => removeRow(idx)}
                          disabled={isSaving}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{rows.length}</span>{" "}
                    transaç{rows.length === 1 ? "ão" : "ões"} ·{" "}
                    <span className="tabular-nums font-medium text-foreground">
                      {formatCurrency(totalAmount, accountCurrency)}
                    </span>
                    {aiMeta?.total_amount
                      ? ` (fatura: ${formatCurrency(aiMeta.total_amount, accountCurrency)})`
                      : ""}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={reset} disabled={isSaving}>
                      Cancelar
                    </Button>
                    <Button onClick={onSave} disabled={isSaving || rows.length === 0}>
                      {isSaving ? (
                        <>
                          <Loader2Icon className="mr-2 size-4 animate-spin" />
                          {LOADING_TEXT.save}
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="mr-2 size-4" />
                          Salvar {rows.length} transaç{rows.length === 1 ? "ão" : "ões"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function UploadDropzone({
  inputRef,
  onFile,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <label
      htmlFor="pdf-input"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
        dragging ? "border-primary bg-muted/30" : "border-border hover:bg-muted/30"
      }`}
    >
      <UploadCloudIcon className="size-8 text-muted-foreground" />
      <div className="text-sm">
        <span className="font-medium">Clique pra escolher</span> ou arraste o PDF aqui
      </div>
      <div className="text-xs text-muted-foreground">PDF até 20MB</div>
      <input
        id="pdf-input"
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

function ProcessingState({ fileName }: { fileName: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted/20 p-10 text-center">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      <div className="text-sm font-medium">Lendo a fatura com Claude…</div>
      {fileName ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileTextIcon className="size-3.5" /> {fileName}
        </div>
      ) : null}
      <p className="max-w-xs text-xs text-muted-foreground">
        Pode levar 15–40 segundos dependendo do tamanho do PDF.
      </p>
    </div>
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
