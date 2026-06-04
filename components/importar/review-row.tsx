"use client";

import { TrashIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractRulePattern } from "@/lib/categorization/apply";
import type { CategoryNode } from "@/lib/db/queries/categories";

export type DraftRow = {
  key: string;
  date: string;
  description: string;
  amount: string;
  categoryId: string | null;
  /** ID da regra que setou a categoria (pra incrementar hitCount no save). */
  ruleId: string | null;
  installmentSeq: number | null;
  installmentTotal: number | null;
};

export type RuleSuggestion = {
  pattern: string;
  categoryId: string;
};

export function ReviewRow({
  row,
  categories,
  onChange,
  onRemove,
  onCreateRule,
  disabled,
}: {
  row: DraftRow;
  categories: CategoryNode[];
  onChange: (patch: Partial<DraftRow>) => void;
  onRemove: () => void;
  onCreateRule?: (suggestion: RuleSuggestion) => void;
  disabled?: boolean;
}) {
  const expense = categories.filter((c) => c.kind === "expense");

  // Categoria original (no primeiro render) pra detectar mudança feita pelo user.
  // useState snapshot é o padrão idiomático — useRef.current não pode ser lido em render.
  const [originalCategoryId] = useState(row.categoryId);

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of expense) {
      map.set(p.id, p.name);
      for (const ch of p.children) {
        map.set(ch.id, `${p.name} · ${ch.name}`);
      }
    }
    return map;
  }, [expense]);

  const userChangedToValidCategory =
    !!onCreateRule &&
    row.categoryId !== null &&
    row.categoryId !== originalCategoryId &&
    !row.ruleId; // se já veio de regra, não oferece criar outra

  return (
    <tr className="border-t">
      <td className="py-2 pr-2">
        <Input
          type="date"
          value={row.date}
          onChange={(e) => onChange({ date: e.target.value })}
          disabled={disabled}
          className="h-8 text-xs"
        />
      </td>
      <td className="py-2 pr-2">
        <Input
          value={row.description}
          onChange={(e) => onChange({ description: e.target.value })}
          disabled={disabled}
          className="h-8 text-xs"
        />
        {row.installmentSeq && row.installmentTotal ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Parcela {row.installmentSeq}/{row.installmentTotal}
          </p>
        ) : null}
      </td>
      <td className="py-2 pr-2">
        <Select
          value={row.categoryId ?? ""}
          onValueChange={(v) => onChange({ categoryId: v && v !== "" ? v : null })}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Sem categoria">
              {(v: string) => labelById.get(v) ?? "Sem categoria"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {expense.map((parent) => (
              <SelectGroup key={parent.id}>
                <SelectLabel>{parent.name}</SelectLabel>
                {parent.children.length === 0 ? (
                  <SelectItem value={parent.id}>{parent.name}</SelectItem>
                ) : (
                  parent.children.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.name}
                    </SelectItem>
                  ))
                )}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {userChangedToValidCategory ? (
          <button
            type="button"
            className="mt-1 text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
            onClick={() =>
              onCreateRule!({
                pattern: extractRulePattern(row.description),
                categoryId: row.categoryId!,
              })
            }
            disabled={disabled}
          >
            Criar regra
          </button>
        ) : null}
      </td>
      <td className="py-2 pr-2 w-28">
        <Input
          inputMode="decimal"
          value={row.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          disabled={disabled}
          className="h-8 text-right tabular-nums text-xs"
        />
      </td>
      <td className="py-2 w-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onRemove}
          disabled={disabled}
        >
          <TrashIcon className="size-3.5" />
        </Button>
      </td>
    </tr>
  );
}
