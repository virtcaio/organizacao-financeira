import type { CategoryNode } from "@/lib/db/queries/categories";

/**
 * System prompt pra categorizar uma lista de transações já parseadas
 * (OFX, CSV, etc.). A IA não parseia o arquivo — recebe a lista pronta
 * e devolve a categoria sugerida pra cada item, mantendo o `id` recebido.
 *
 * Mantido estável pra o prompt cache (`cache_control: ephemeral`).
 */
export function buildCategorizeImportedSystemPrompt(
  categories: CategoryNode[],
): string {
  // Inclui categorias de receita E despesa (extrato bancário tem ambos).
  const relevant = categories.filter(
    (c) => c.kind === "income" || c.kind === "expense",
  );

  const lines: string[] = [];
  lines.push(
    "Você é um assistente que sugere categorias para uma lista de transações bancárias brasileiras.",
    "",
    "## Sua tarefa",
    "Receba uma lista de transações com `id`, `description`, `amount` e `type` (income|expense).",
    "Devolva, para cada uma, a categoria mais provável do catálogo abaixo.",
    "",
    "## Regras",
    "1. Preserve o `id` exatamente como veio na entrada.",
    "2. Use o `category_id` exato do catálogo (UUID). Se nenhuma categoria couber, use `null`.",
    "3. Respeite o `type`: categorias de despesa para `expense`, de receita para `income`.",
    "4. Não invente categorias. Não confunda: aluguel ≠ moradia genérica se houver categoria específica.",
    "5. A ordem da resposta deve seguir a ordem da entrada.",
    "",
    "## Catálogo de categorias",
    "Use sempre o `id` exato. Agrupado por kind e por categoria-pai:",
    "",
  );

  for (const kind of ["income", "expense"] as const) {
    const ofKind = relevant.filter((c) => c.kind === kind);
    if (ofKind.length === 0) continue;
    lines.push(`### ${kind === "income" ? "Receitas" : "Despesas"}`, "");
    for (const parent of ofKind) {
      lines.push(`#### ${parent.icon ? `${parent.icon} ` : ""}${parent.name}`);
      if (parent.children.length === 0) {
        lines.push(`- id: ${parent.id} — ${parent.name}`);
      } else {
        for (const child of parent.children) {
          lines.push(`- id: ${child.id} — ${child.name}`);
        }
      }
      lines.push("");
    }
  }

  lines.push(
    "## Formato de saída",
    "Responda APENAS com JSON válido, sem markdown, sem comentários. Schema:",
    "",
    "```json",
    "{",
    '  "suggestions": [',
    "    {",
    '      "id": "string (igual ao recebido)",',
    '      "category_id": "uuid ou null",',
    '      "category_name": "string ou null"',
    "    }",
    "  ]",
    "}",
    "```",
  );

  return lines.join("\n");
}
