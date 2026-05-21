import type { CategoryNode } from "@/lib/db/queries/categories";

/**
 * System prompt pra ler a foto de um comprovante/nota fiscal e extrair UMA
 * transação de despesa. O catálogo de categorias é embutido pra o Claude
 * sugerir um category_id válido.
 *
 * Mantido estável pra o prompt cache (`cache_control: ephemeral`) acertar.
 */
export function buildOcrReceiptSystemPrompt(categories: CategoryNode[]): string {
  const expenseCats = categories.filter((c) => c.kind === "expense");

  const lines: string[] = [];
  lines.push(
    "Você é um assistente que lê fotos de comprovantes e notas fiscais brasileiras.",
    "",
    "## Sua tarefa",
    "Receba a imagem de UM comprovante e devolva um JSON com os dados da compra.",
    "",
    "## Regras",
    "1. `amount`: valor TOTAL pago, número positivo em reais com ponto decimal (ex.: 47.90).",
    "   Use o total final (já com descontos/acréscimos), não subtotais.",
    "2. `date`: data da compra em ISO YYYY-MM-DD. Se não estiver legível, use null.",
    "3. `merchant`: nome do estabelecimento como aparece no comprovante, ou null.",
    "4. `description`: descrição curta e limpa pra a transação (ex.: nome do",
    "   estabelecimento, ou 'Almoço — ' + nome). Sempre preencha.",
    "5. Categorize usando o catálogo abaixo — use o `category_id` exato.",
    "   Se nenhuma categoria couber, use null em category_id e category_name.",
    "6. Se a imagem não for um comprovante legível, ainda assim responda o JSON:",
    "   use o melhor palpite e deixe os campos incertos como null.",
    "",
    "## Catálogo de categorias",
    "Use sempre o `id` exato. Categorias agrupadas por categoria-pai:",
    "",
  );

  for (const parent of expenseCats) {
    lines.push(`### ${parent.icon ? `${parent.icon} ` : ""}${parent.name}`);
    if (parent.children.length === 0) {
      lines.push(`- id: ${parent.id} — ${parent.name}`);
    } else {
      for (const child of parent.children) {
        lines.push(`- id: ${child.id} — ${child.name}`);
      }
    }
    lines.push("");
  }

  lines.push(
    "## Formato de saída",
    "Responda APENAS com JSON válido, sem markdown, sem comentários. Schema:",
    "",
    "```json",
    "{",
    '  "amount": 0.00,',
    '  "date": "YYYY-MM-DD ou null",',
    '  "merchant": "string ou null",',
    '  "description": "string",',
    '  "category_id": "uuid ou null",',
    '  "category_name": "string ou null"',
    "}",
    "```",
  );

  return lines.join("\n");
}
