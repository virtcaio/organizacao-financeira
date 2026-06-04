"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { XIcon } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { TransactionFilters } from "@/lib/transactions/filter";
import type { CategoryNode } from "@/lib/db/queries/categories";
import type { AccountOption } from "@/components/transacoes/transaction-form-dialog";
import type { Tag } from "@/types/tag";

type Chip = { key: string; label: string; params: string[] };

export function ActiveFiltersChips({
  filters,
  accounts,
  categories,
  tags,
}: {
  filters: TransactionFilters;
  accounts: AccountOption[];
  categories: CategoryNode[];
  tags: Tag[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const chips: Chip[] = [];

  if (filters.from || filters.to) {
    const label =
      filters.from && filters.to
        ? `${formatDate(filters.from, { day: "2-digit", month: "short" })} → ${formatDate(filters.to, { day: "2-digit", month: "short" })}`
        : filters.from
          ? `Desde ${formatDate(filters.from, { day: "2-digit", month: "short" })}`
          : `Até ${formatDate(filters.to!, { day: "2-digit", month: "short" })}`;
    chips.push({ key: "period", label, params: ["from", "to"] });
  }

  if (filters.accountId) {
    const acct = accounts.find((a) => a.id === filters.accountId);
    if (acct) chips.push({ key: "account", label: acct.name, params: ["account"] });
  }

  if (filters.categoryId) {
    const name = findCategoryLabel(filters.categoryId, categories);
    if (name) chips.push({ key: "category", label: name, params: ["category"] });
  }

  if (filters.tagId) {
    const t = tags.find((t) => t.id === filters.tagId);
    if (t) chips.push({ key: "tag", label: `#${t.name}`, params: ["tag"] });
  }

  if (filters.q) {
    chips.push({ key: "q", label: `"${filters.q}"`, params: ["q"] });
  }

  if (chips.length === 0) return null;

  function removeChip(c: Chip) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const p of c.params) sp.delete(p);
    const qs = sp.toString();
    startTransition(() =>
      router.replace(qs ? `/transacoes?${qs}` : "/transacoes"),
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-active-chips>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => removeChip(c)}
          data-chip-key={c.key}
          className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs text-foreground hover:bg-muted"
        >
          <span>{c.label}</span>
          <XIcon className="size-3" />
        </button>
      ))}
    </div>
  );
}

function findCategoryLabel(id: string, cats: CategoryNode[]): string | null {
  for (const c of cats) {
    if (c.id === id) return c.name;
    for (const ch of c.children) {
      if (ch.id === id) return `${c.name} · ${ch.name}`;
    }
  }
  return null;
}
