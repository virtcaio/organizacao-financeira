"use client";

import { useState } from "react";
import { ArrowLeftIcon, CreditCardIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportPdfFlow } from "./import-pdf-flow";
import { ImportOfxFlow } from "./import-ofx-flow";
import type { AccountOption } from "@/components/transacoes/transaction-form-dialog";
import type { CategoryNode } from "@/lib/db/queries/categories";

type Mode = "pdf" | "ofx";

export function ImportHub({
  accounts,
  categories,
}: {
  accounts: AccountOption[];
  categories: CategoryNode[];
}) {
  const [mode, setMode] = useState<Mode | null>(null);

  if (mode) {
    return (
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode(null)}
          className="-ml-2"
        >
          <ArrowLeftIcon className="mr-2 size-4" />
          Outro tipo de importação
        </Button>
        {mode === "pdf" ? (
          <ImportPdfFlow accounts={accounts} categories={categories} />
        ) : (
          <ImportOfxFlow accounts={accounts} categories={categories} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Importar</h1>
        <p className="text-sm text-muted-foreground">
          Traga seus lançamentos de fora — escolha o formato.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChooserCard
          icon={<CreditCardIcon className="size-5" />}
          title="Fatura de cartão (PDF)"
          description="PDF da fatura do seu cartão de crédito. A IA lê o documento e extrai todas as compras, parcelas e categorias sugeridas."
          onClick={() => setMode("pdf")}
        />
        <ChooserCard
          icon={<FileTextIcon className="size-5" />}
          title="Extrato bancário (OFX)"
          description="Arquivo OFX do seu banco (Nubank, Itaú, Bradesco etc — quase todos exportam). Lê localmente; IA só sugere categorias."
          onClick={() => setMode("ofx")}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Importação por CSV virá numa próxima iteração — por enquanto, prefira OFX
        quando seu banco oferecer (formato padrão, mais robusto).
      </p>
    </div>
  );
}

function ChooserCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left hover:shadow-sm transition-shadow"
    >
      <Card className="h-full hover:border-primary/50 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </button>
  );
}
