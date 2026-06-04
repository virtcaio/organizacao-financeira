import { AnthropicKeyForm } from "@/components/configuracoes/anthropic-key-form";
import { TagsManager } from "@/components/configuracoes/tags-manager";
import { CategoriesManager } from "@/components/configuracoes/categories-manager";
import { requireUserId } from "@/lib/auth-helpers";
import { listTagsForUser } from "@/lib/db/queries/tags";
import { listAllCategoriesForUser } from "@/lib/db/queries/categories";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const userId = await requireUserId();
  const [tags, categoryTree] = await Promise.all([
    listTagsForUser(userId),
    listAllCategoriesForUser(userId),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Chave da Anthropic, categorias, tags e preferências da conta.
        </p>
      </header>
      <AnthropicKeyForm />
      <CategoriesManager tree={categoryTree} />
      <TagsManager initialTags={tags} />
    </div>
  );
}
