import { AnthropicKeyForm } from "@/components/configuracoes/anthropic-key-form";

export const metadata = { title: "Configurações" };

export default function ConfiguracoesPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Chave da Anthropic e preferências da conta.
        </p>
      </header>
      <AnthropicKeyForm />
    </div>
  );
}
