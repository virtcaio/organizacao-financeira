"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // digest identifica o erro nos logs da Vercel sem expor stack ao usuário
    console.error("Erro não tratado", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">Algo deu errado</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Ocorreu um erro inesperado ao carregar esta página. Seus dados estão
        seguros — tente novamente.
        {error.digest ? (
          <span className="mt-1 block text-xs">Código: {error.digest}</span>
        ) : null}
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
