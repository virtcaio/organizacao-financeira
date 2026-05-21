"use client";

import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { tagColorClass } from "./tag-badge";
import type { Tag } from "@/types/tag";

type Props = {
  allTags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function TagMultiSelect({ allTags, selectedIds, onChange, disabled }: Props) {
  if (allTags.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhuma tag criada.{" "}
        <Link href="/configuracoes" className="underline hover:text-foreground">
          Criar em Configurações
        </Link>
        .
      </p>
    );
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allTags.map((tag) => {
        const selected = selectedIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            disabled={disabled}
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity",
              tagColorClass(tag.color),
              selected ? "" : "opacity-40 hover:opacity-70",
            )}
          >
            {selected ? <CheckIcon className="size-3" /> : null}
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
