"use client";

import { useState, useTransition } from "react";
import { CheckCircle2Icon, KeyIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAnthropicKey } from "@/lib/ai/use-anthropic-key";
import { validateAnthropicKey } from "@/lib/ai/client";
import { maskApiKey } from "@/lib/ai/storage";

export function AnthropicKeyForm() {
  const { key, loaded, hasKey, save, clear } = useAnthropicKey();
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = input.trim();
    if (!value.startsWith("sk-ant-")) {
      toast.error("A chave precisa começar com `sk-ant-`.");
      return;
    }

    startTransition(async () => {
      const res = await validateAnthropicKey(value);
      if (!res.ok) {
        toast.error(`Chave inválida: ${res.error}`);
        return;
      }
      save(value);
      setInput("");
      toast.success("Chave salva e validada.");
    });
  }

  function onRemove() {
    clear();
    toast.success("Chave removida.");
  }

  if (!loaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Anthropic API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyIcon className="size-4" />
              Anthropic API Key (BYOK)
            </CardTitle>
            <CardDescription className="mt-1">
              Cole sua chave da Anthropic. Ela fica <strong>apenas no seu navegador</strong>{" "}
              (localStorage). Nunca enviamos para nosso servidor. As chamadas ao Claude saem
              direto do seu navegador.
            </CardDescription>
          </div>
          {hasKey ? (
            <Badge variant="secondary" className="shrink-0">
              <CheckCircle2Icon className="mr-1 size-3 text-emerald-600" />
              Conectada
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasKey ? (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Chave salva</p>
              <p className="mt-1 font-mono">{key ? maskApiKey(key) : ""}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onRemove}>
                <TrashIcon className="mr-2 size-4" />
                Remover chave
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSave} className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="apiKey">Sua chave</Label>
              <Input
                id="apiKey"
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="sk-ant-api03-..."
                autoComplete="off"
                spellCheck={false}
                disabled={isPending}
                required
              />
              <p className="text-xs text-muted-foreground">
                Crie a chave em{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  console.anthropic.com/settings/keys
                </a>
                .
              </p>
            </div>
            <Button type="submit" disabled={isPending || input.length < 10}>
              {isPending ? "Validando…" : "Salvar e validar"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
