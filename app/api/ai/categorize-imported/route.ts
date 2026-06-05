import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  buildAnthropicForRequest,
  DEFAULT_MODEL,
  sanitizeForLog,
} from "@/lib/ai/server";
import { buildCategorizeImportedSystemPrompt } from "@/lib/ai/prompts/categorize-imported";
import { categorizeImportedOutputSchema } from "@/lib/ai/types";
import { listCategoriesForUser } from "@/lib/db/queries/categories";
import { listRulesForApply } from "@/lib/db/queries/categorization-rules";
import { applyRulesToItems } from "@/lib/categorization/apply";
import {
  canonicalJson,
  findAiRunCache,
  hashInput,
  saveAiRun,
} from "@/lib/ai/dedup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(128),
        description: z.string().min(1).max(300),
        amount: z.number(),
        type: z.enum(["income", "expense"]),
      }),
    )
    .min(1)
    .max(500),
});

function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((b): b is { type: "text"; text: string } => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }
  const userId = session.user.id;

  const apiKey = req.headers.get("x-anthropic-key")?.trim();
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { ok: false, error: "Chave Anthropic ausente. Configure em /configuracoes." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const parsedReq = requestSchema.safeParse(body);
  if (!parsedReq.success) {
    return NextResponse.json(
      {
        ok: false,
        error: `Entrada inválida: ${parsedReq.error.issues[0]?.message ?? "desconhecida"}`,
      },
      { status: 400 },
    );
  }

  const categories = await listCategoriesForUser(userId);

  // Pre-pass: aplica regras locais antes da IA pra poupar tokens.
  const rules = await listRulesForApply(userId);
  const { matched, unmatched } = applyRulesToItems(parsedReq.data.items, rules);

  const catLabelById = new Map<string, string>();
  for (const c of categories) {
    catLabelById.set(c.id, c.name);
    for (const ch of c.children) catLabelById.set(ch.id, ch.name);
  }

  // 100% matched? Resposta direta sem chamar IA.
  if (unmatched.length === 0) {
    const idToInput = new Map(parsedReq.data.items.map((i, idx) => [i.id, idx]));
    const suggestions = matched
      .map((m) => ({
        id: m.id,
        category_id: m.categoryId,
        category_name: catLabelById.get(m.categoryId) ?? null,
        rule_id: m.ruleId,
        _idx: idToInput.get(m.id) ?? 0,
      }))
      .sort((a, b) => a._idx - b._idx)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ _idx, ...rest }) => rest);
    return NextResponse.json({
      ok: true,
      data: { suggestions },
      tokensIn: 0,
      tokensOut: 0,
      cacheReads: 0,
      cacheCreations: 0,
    });
  }

  // Cache key: lista unmatched normalizada (id, description, amount, type),
  // ordenada por id em JSON canônico. Garante que mesma "pergunta lógica" bate.
  const cacheKeyItems = unmatched
    .map((u) => ({
      id: u.id,
      description: u.description,
      amount: u.amount,
      type: u.type,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const inputHash = hashInput(canonicalJson(cacheKeyItems));

  const cached = await findAiRunCache(userId, "categorize_csv", inputHash);
  if (cached) {
    const reparsed = categorizeImportedOutputSchema.safeParse(cached);
    if (reparsed.success) {
      return NextResponse.json({
        ok: true,
        data: {
          suggestions: mergeSuggestions(
            parsedReq.data.items,
            matched,
            reparsed.data.suggestions,
            catLabelById,
          ),
        },
        tokensIn: 0,
        tokensOut: 0,
        cacheReads: 0,
        cacheCreations: 0,
        cached: true,
      });
    }
  }

  const system = buildCategorizeImportedSystemPrompt(categories);
  const client = buildAnthropicForRequest(apiKey);

  const userPayload = JSON.stringify({ items: unmatched });

  let response;
  try {
    response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Categorize as transações abaixo. Preserve o "id" exatamente. Responda apenas com JSON.\n\n${userPayload}`,
            },
          ],
        },
      ],
    });
  } catch (err: unknown) {
    const message = sanitizeForLog(
      err instanceof Error ? err.message : "Erro desconhecido na chamada da IA.",
    );
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  const text = extractText(response.content as Array<{ type: string; text?: string }>);
  if (!text) {
    return NextResponse.json({ ok: false, error: "Resposta vazia da IA." }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    return NextResponse.json(
      { ok: false, error: "A IA não respondeu em JSON válido." },
      { status: 502 },
    );
  }

  const result = categorizeImportedOutputSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        error: `Schema inesperado: ${result.error.issues[0]?.message ?? "desconhecido"}`,
      },
      { status: 502 },
    );
  }

  // Salva no cache antes do merge — chave já considera só `unmatched`.
  await saveAiRun({
    userId,
    kind: "categorize_csv",
    inputHash,
    output: result.data,
    tokensIn: response.usage?.input_tokens ?? 0,
    tokensOut: response.usage?.output_tokens ?? 0,
  });

  const mergedSuggestions = mergeSuggestions(
    parsedReq.data.items,
    matched,
    result.data.suggestions,
    catLabelById,
  );

  return NextResponse.json({
    ok: true,
    data: { suggestions: mergedSuggestions },
    tokensIn: response.usage?.input_tokens ?? 0,
    tokensOut: response.usage?.output_tokens ?? 0,
    cacheReads: response.usage?.cache_read_input_tokens ?? 0,
    cacheCreations: response.usage?.cache_creation_input_tokens ?? 0,
  });
}

type Suggestion = {
  id: string;
  category_id: string | null;
  category_name: string | null;
  rule_id?: string | null;
};

type MatchedItem = {
  id: string;
  categoryId: string;
  ruleId: string;
};

/**
 * Merge: regras (matched) + sugestões da IA, preservando ordem do input original.
 * Reusado tanto no path da IA quanto no path do cache hit.
 */
function mergeSuggestions(
  inputItems: Array<{ id: string }>,
  matched: MatchedItem[],
  aiSuggestions: Suggestion[],
  catLabelById: Map<string, string>,
): Suggestion[] {
  const aiById = new Map(aiSuggestions.map((s) => [s.id, s]));
  const matchedById = new Map(matched.map((m) => [m.id, m]));
  return inputItems.map((item) => {
    const r = matchedById.get(item.id);
    if (r) {
      return {
        id: item.id,
        category_id: r.categoryId,
        category_name: catLabelById.get(r.categoryId) ?? null,
        rule_id: r.ruleId,
      };
    }
    const a = aiById.get(item.id);
    return {
      id: item.id,
      category_id: a?.category_id ?? null,
      category_name: a?.category_name ?? null,
      rule_id: null,
    };
  });
}
