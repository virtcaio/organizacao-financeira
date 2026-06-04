/**
 * Helpers puros pra filtrar a lista de transações na /transacoes.
 * URL search params → TransactionFilters → applyFilters.
 */

import type { TransactionListItem } from "@/lib/actions/transactions";
import type { CategoryNode } from "@/lib/db/queries/categories";

export type TransactionFilters = {
  from?: string;        // YYYY-MM-DD inclusivo
  to?: string;          // YYYY-MM-DD inclusivo
  accountId?: string;
  categoryId?: string;
  q?: string;
  tagId?: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse + validação a partir de searchParams brutos.
 * Silenciosamente ignora valores inválidos (refs a IDs inexistentes, datas mal formadas).
 */
export function parseFilters(
  params: Record<string, string | undefined>,
  accounts: { id: string }[],
  categories: CategoryNode[],
  tags: { id: string }[],
): TransactionFilters {
  const out: TransactionFilters = {};

  // Datas
  const from = params.from;
  const to = params.to;
  const fromValid = typeof from === "string" && ISO_DATE.test(from);
  const toValid = typeof to === "string" && ISO_DATE.test(to);
  if (fromValid && toValid) {
    if (from <= to) {
      out.from = from;
      out.to = to;
    }
    // se from > to, ignora ambos
  } else if (fromValid) {
    out.from = from;
  } else if (toValid) {
    out.to = to;
  }

  // Conta
  if (params.account && accounts.some((a) => a.id === params.account)) {
    out.accountId = params.account;
  }

  // Categoria (aceita mãe ou sub; sem validação de archived — quem filtra é o user)
  if (params.category) {
    const known = flattenCategoryIds(categories);
    if (known.has(params.category)) {
      out.categoryId = params.category;
    }
  }

  // Busca textual
  if (typeof params.q === "string") {
    const trimmed = params.q.trim().slice(0, 100);
    if (trimmed.length > 0) {
      out.q = trimmed;
    }
  }

  // Tag (compat com filtro existente)
  if (params.tag && tags.some((t) => t.id === params.tag)) {
    out.tagId = params.tag;
  }

  return out;
}

function flattenCategoryIds(categories: CategoryNode[]): Set<string> {
  const ids = new Set<string>();
  for (const c of categories) {
    ids.add(c.id);
    for (const ch of c.children) ids.add(ch.id);
  }
  return ids;
}

/**
 * Conjunto de category ids que casam com o filtro.
 * Se for mãe: inclui ela + todas as subs. Se for sub: só ela.
 */
export function expandCategoryFilter(
  categoryId: string,
  categories: CategoryNode[],
): Set<string> {
  // É uma mãe?
  const asParent = categories.find((c) => c.id === categoryId);
  if (asParent) {
    const set = new Set<string>([asParent.id]);
    for (const ch of asParent.children) set.add(ch.id);
    return set;
  }
  // Senão é uma sub
  return new Set<string>([categoryId]);
}

export function hasAnyFilter(f: TransactionFilters): boolean {
  return (
    !!f.from ||
    !!f.to ||
    !!f.accountId ||
    !!f.categoryId ||
    !!f.q ||
    !!f.tagId
  );
}

/** Aplica filtros à lista já carregada. Preserva ordem. */
export function applyFilters(
  rows: TransactionListItem[],
  filters: TransactionFilters,
  categories: CategoryNode[],
): TransactionListItem[] {
  if (!hasAnyFilter(filters)) return rows;

  const catSet = filters.categoryId
    ? expandCategoryFilter(filters.categoryId, categories)
    : null;
  const qLower = filters.q?.toLowerCase();

  return rows.filter((r) => {
    if (filters.from && r.date < filters.from) return false;
    if (filters.to && r.date > filters.to) return false;
    if (filters.accountId && r.accountId !== filters.accountId) return false;
    if (catSet && (!r.categoryId || !catSet.has(r.categoryId))) return false;
    if (qLower && !r.description.toLowerCase().includes(qLower)) return false;
    if (filters.tagId && !r.tags.some((t) => t.id === filters.tagId)) return false;
    return true;
  });
}
