"use client";

import { useRef, useState } from "react";
import { CameraIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAnthropicKey } from "@/lib/ai/use-anthropic-key";
import { ocrReceiptWithClaude } from "@/lib/ai/ocr-receipt";
import {
  TransactionFormDialog,
  type AccountOption,
  type TransactionPrefill,
} from "./transaction-form-dialog";
import type { CategoryNode } from "@/lib/db/queries/categories";
import type { Tag } from "@/types/tag";

export function ReceiptCaptureButton({
  accounts,
  categories,
  tags,
}: {
  accounts: AccountOption[];
  categories: CategoryNode[];
  tags: Tag[];
}) {
  const { key, hasKey } = useAnthropicKey();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [prefill, setPrefill] = useState<TransactionPrefill | null>(null);
  const [receiptKey, setReceiptKey] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  function onPick() {
    if (!hasKey) {
      toast.info("Configure sua chave Anthropic em Configurações para usar o OCR.");
      return;
    }
    inputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reescolher o mesmo arquivo depois
    if (!file || !key) return;

    setProcessing(true);
    const res = await ocrReceiptWithClaude({ apiKey: key, file });
    setProcessing(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const d = res.data;
    setPrefill({
      type: "expense",
      amount: String(d.amount),
      date: d.date ?? undefined,
      description: d.description,
      categoryId: d.category_id ?? undefined,
    });
    setReceiptKey(res.receiptKey);
    setFormOpen(true);
    toast.success(
      d.merchant ? `Comprovante lido — ${d.merchant}` : "Comprovante lido — confira os dados.",
    );
  }

  return (
    <>
      <Button variant="outline" onClick={onPick} disabled={processing}>
        {processing ? (
          <>
            <Loader2Icon className="mr-2 size-4 animate-spin" />
            Lendo…
          </>
        ) : (
          <>
            <CameraIcon className="mr-2 size-4" />
            Foto
          </>
        )}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      {prefill ? (
        <TransactionFormDialog
          key={receiptKey ?? JSON.stringify(prefill)}
          open={formOpen}
          onOpenChange={setFormOpen}
          accounts={accounts}
          categories={categories}
          tags={tags}
          prefill={prefill}
          receiptKey={receiptKey ?? undefined}
        />
      ) : null}
    </>
  );
}
