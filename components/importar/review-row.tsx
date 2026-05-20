"use client";

import { TrashIcon } from "lucide-react";
import { useMemo } from "react";
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
import type { CategoryNode } from "@/lib/db/queries/categories";

export type DraftRow = {
  key: string;
  date: string;
  description: string;
  amount: string;
  categoryId: string | null;
  installmentSeq: number | null;
  installmentTotal: number | null;
};

export function ReviewRow({
  row,
  categories,
  onChange,
  onRemove,
  disabled,
}: {
  row: DraftRow;
  categories: CategoryNode[];
  onChange: (patch: Partial<DraftRow>) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const expense = categories.filter((c) => c.kind === "expense");

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
