"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tag } from "@/types/tag";

const ALL = "__all__";

export function TransactionTagFilter({
  tags,
  selectedTagId,
}: {
  tags: Tag[];
  selectedTagId: string | null;
}) {
  const router = useRouter();

  if (tags.length === 0) return null;

  const labelById = new Map(tags.map((t) => [t.id, t.name]));

  function onChange(value: string | null) {
    if (!value || value === ALL) {
      router.push("/transacoes");
    } else {
      router.push(`/transacoes?tag=${value}`);
    }
  }

  return (
    <Select value={selectedTagId ?? ALL} onValueChange={onChange}>
      <SelectTrigger className="w-44" aria-label="Filtrar por tag">
        <SelectValue>
          {(v: string) => (v === ALL ? "Todas as tags" : labelById.get(v) ?? "Tag")}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Todas as tags</SelectItem>
        {tags.map((tag) => (
          <SelectItem key={tag.id} value={tag.id}>
            {tag.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
