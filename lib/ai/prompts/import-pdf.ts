import type { CategoryNode } from "@/lib/db/queries/categories";

/**
 * Builds the system prompt for importing a credit-card invoice PDF.
 * The category catalog is embedded so Claude can pick valid category_id values.
 *
 * This system prompt is intentionally stable so the Anthropic prompt cache
 * (`cache_control: { type: "ephemeral" }`) can hit on repeated calls.
 */
export function buildImportPdfSystemPrompt(categories: CategoryNode[]): string {
  // Only expense + transfer categories matter for a credit-card invoice.
  const expenseCats = categories.filter(
    (c) => c.kind === "expense" || c.kind === "transfer",
  );

  const lines: string[] = [];
  lines.push(
    "Você é um assistente que extrai transações de faturas de cartão de crédito brasileiras a partir de PDFs.",
    "",
    "## Sua tarefa",
    "Receba o PDF da fatura e devolva um JSON com a lista de transações encontradas.",
    "",
    "## Regras",
    "1. Ignore valores agregados como TOTAL, SUBTOTAL, SALDO ANTERIOR, PAGAMENTO RECEBIDO, ENCARGOS, IOF agregado.",
    "   Cada transação é uma LINHA de compra individual.",
    "2. Datas em formato ISO YYYY-MM-DD (use o ano vigente da fatura).",
    "3. Valor sempre positivo em REAIS, número decimal com ponto (ex.: 145.90).",
    "   - Se houver dólar/euro convertido, use o valor em REAIS já convertido.",
    "4. Identifique parcelamentos pela presença de '01/12', 'PARC 2/6', 'XX/YY' na descrição.",
    "   Use `installment_seq` e `installment_total` quando aplicável.",
    "5. Limpe a descrição: remova códigos de autorização e ruído. Mantenha o nome do estabelecimento.",
    "6. Categorize cada transação usando o catálogo abaixo. Use o `category_id` exato.",
    "   - Se nenhuma categoria couber, use `null` em ambos category_id e category_name.",
    "7. Devolva também `card_metadata` com emissor, datas de fechamento/vencimento e total da fatura, se disponíveis no PDF.",
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
    '  "transactions": [',
    "    {",
    '      "date": "YYYY-MM-DD",',
    '      "description": "string",',
    '      "amount": 0.00,',
    '      "category_id": "uuid ou null",',
    '      "category_name": "string ou null",',
    '      "installment_seq": null,',
    '      "installment_total": null,',
    '      "merchant_raw": "string ou null"',
    "    }",
    "  ],",
    '  "card_metadata": {',
    '    "issuer": "string ou null",',
    '    "closing_date": "YYYY-MM-DD ou null",',
    '    "due_date": "YYYY-MM-DD ou null",',
    '    "total_amount": 0.00',
    "  }",
    "}",
    "```",
  );

  return lines.join("\n");
}
