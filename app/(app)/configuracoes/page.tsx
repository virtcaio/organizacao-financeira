import { AnthropicKeyForm } from "@/components/configuracoes/anthropic-key-form";
import { TagsManager } from "@/components/configuracoes/tags-manager";
import { requireUserId } from "@/lib/auth-helpers";
import { listTagsForUser } from "@/lib/db/queries/tags";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const userId = await requireUserId();
  const tags = await listTagsForUser(userId);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Chave da Anthropic, tags e preferências da conta.
        </p>
      </header>
      <AnthropicKeyForm />
      <TagsManager initialTags={tags} />
    </div>
  );
}
