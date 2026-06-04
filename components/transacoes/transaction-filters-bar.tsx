"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  monthEndFromStart,
  monthEndIso,
  monthStartIso,
  monthStartIsoBack,
  todayIso,
} from "@/lib/date";
import { hasAnyFilter, type TransactionFilters } from "@/lib/transactions/filter";
import { formatDate } from "@/lib/format";
import type { CategoryNode } from "@/lib/db/queries/categories";
import type { AccountOption } from "@/components/transacoes/transaction-form-dialog";
import type { Tag } from "@/types/tag";

const ALL = "__all__";

export function TransactionFiltersBar({
  accounts,
  categories,
  tags,
  filters,
}: {
  accounts: AccountOption[];
  categories: CategoryNode[];
  tags: Tag[];
  filters: TransactionFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Busca local (debounce 300ms → router.replace).
  // Sync com filters.q (URL) pra refletir limpezas externas (chip X, "Limpar tudo").
  const [qLocal, setQLocal] = useState(filters.q ?? "");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQLocal(filters.q ?? "");
  }, [filters.q]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const next = qLocal.trim();
      if (next === (filters.q ?? "")) return;
      pushWith(searchParams, "q", next || null, router, startTransition);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal]);

  const onSelectAccount = (v: string | null) =>
    pushWith(searchParams, "account", !v || v === ALL ? null : v, router, startTransition);
  const onSelectCategory = (v: string | null) =>
    pushWith(searchParams, "category", !v || v === ALL ? null : v, router, startTransition);
  const onSelectTag = (v: string | null) =>
    pushWith(searchParams, "tag", !v || v === ALL ? null : v, router, startTransition);

  const periodLabel = describePeriod(filters);
  const showClearAll = hasAnyFilter(filters);

  // Mapas pra labels custom dos selects (UUID → nome)
  const accountLabel = new Map(accounts.map((a) => [a.id, a.name]));
  const tagLabel = new Map(tags.map((t) => [t.id, t.name]));
  const categoryLabel = new Map<string, string>();
  for (const c of categories) {
    categoryLabel.set(c.id, c.name);
    for (const ch of c.children) categoryLabel.set(ch.id, `${c.name} · ${ch.name}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Período */}
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" className="h-9">
              <CalendarIcon className="mr-2 size-3.5" />
              {periodLabel}
            </Button>
          }
        />
        <PopoverContent className="w-72 p-3 space-y-3" align="start">
          <PeriodShortcuts
            onPick={(from, to) => {
              const sp = new URLSearchParams(searchParams.toString());
              if (from) sp.set("from", from);
              else sp.delete("from");
              if (to) sp.set("to", to);
              else sp.delete("to");
              startTransition(() => router.replace(`/transacoes?${sp.toString()}`));
            }}
          />
          <CustomRange
            from={filters.from ?? ""}
            to={filters.to ?? ""}
            onChange={(from, to) => {
              const sp = new URLSearchParams(searchParams.toString());
              if (from) sp.set("from", from);
              else sp.delete("from");
              if (to) sp.set("to", to);
              else sp.delete("to");
              startTransition(() => router.replace(`/transacoes?${sp.toString()}`));
            }}
          />
        </PopoverContent>
      </Popover>

      {/* Conta */}
      {accounts.length > 1 ? (
        <Select value={filters.accountId ?? ALL} onValueChange={onSelectAccount}>
          <SelectTrigger className="h-9 w-40" aria-label="Filtrar por conta">
            <SelectValue placeholder="Conta">
              {(v: string) =>
                v === ALL ? "Todas as contas" : accountLabel.get(v) ?? "Conta"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as contas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {/* Categoria */}
      <Select value={filters.categoryId ?? ALL} onValueChange={onSelectCategory}>
        <SelectTrigger className="h-9 w-44" aria-label="Filtrar por categoria">
          <SelectValue placeholder="Categoria">
            {(v: string) =>
              v === ALL ? "Todas as categorias" : categoryLabel.get(v) ?? "Categoria"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as categorias</SelectItem>
          {categories.map((c) => (
            <SelectGroup key={c.id}>
              <SelectLabel>{c.name}</SelectLabel>
              <SelectItem value={c.id}>
                {c.name} (todas)
              </SelectItem>
              {c.children.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>
                  {ch.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {/* Tag */}
      {tags.length > 0 ? (
        <Select value={filters.tagId ?? ALL} onValueChange={onSelectTag}>
          <SelectTrigger className="h-9 w-36" aria-label="Filtrar por tag">
            <SelectValue placeholder="Tag">
              {(v: string) =>
                v === ALL ? "Todas as tags" : tagLabel.get(v) ?? "Tag"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as tags</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {/* Busca */}
      <div className="relative">
        <SearchIcon className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Buscar"
          placeholder="Buscar descrição"
          value={qLocal}
          onChange={(e) => setQLocal(e.target.value)}
          className="h-9 w-44 pl-7"
        />
      </div>

      {/* Limpar tudo */}
      {showClearAll ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground"
          onClick={() => startTransition(() => router.push("/transacoes"))}
        >
          <XIcon className="mr-1 size-3.5" />
          Limpar
        </Button>
      ) : null}
    </div>
  );
}

function PeriodShortcuts({
  onPick,
}: {
  onPick: (from: string, to: string) => void;
}) {
  const monthCurrent = monthStartIso();
  const monthPrev = monthStartIsoBack(1);
  const today = todayIso();
  const days30 = isoDaysBack(30);
  const days90 = isoDaysBack(90);

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <ShortcutBtn label="Mês atual" onClick={() => onPick(monthCurrent, monthEndIso())} />
      <ShortcutBtn
        label="Mês anterior"
        onClick={() => onPick(monthPrev, monthEndFromStart(monthPrev))}
      />
      <ShortcutBtn label="Últimos 30 dias" onClick={() => onPick(days30, today)} />
      <ShortcutBtn label="Últimos 90 dias" onClick={() => onPick(days90, today)} />
    </div>
  );
}

function ShortcutBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border px-2 py-1.5 text-xs hover:bg-accent"
    >
      {label}
    </button>
  );
}

function CustomRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-xs text-muted-foreground">Range customizado</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label htmlFor="from" className="text-[11px]">De</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => onChange(e.target.value, to)}
            className="h-8 text-xs"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="to" className="text-[11px]">Até</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => onChange(from, e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

function pushWith(
  current: URLSearchParams,
  key: string,
  value: string | null,
  router: ReturnType<typeof useRouter>,
  startTransition: ReturnType<typeof useTransition>[1],
) {
  const sp = new URLSearchParams(current.toString());
  if (value === null || value === "") sp.delete(key);
  else sp.set(key, value);
  const qs = sp.toString();
  startTransition(() =>
    router.replace(qs ? `/transacoes?${qs}` : "/transacoes"),
  );
}

function describePeriod(f: TransactionFilters): string {
  if (!f.from && !f.to) return "Período";
  if (f.from && f.to) {
    return `${formatDate(f.from, { day: "2-digit", month: "short" })} → ${formatDate(f.to, { day: "2-digit", month: "short" })}`;
  }
  if (f.from) return `Desde ${formatDate(f.from, { day: "2-digit", month: "short" })}`;
  return `Até ${formatDate(f.to!, { day: "2-digit", month: "short" })}`;
}

function isoDaysBack(days: number): string {
  const now = new Date();
  const back = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return todayIso(back);
}
