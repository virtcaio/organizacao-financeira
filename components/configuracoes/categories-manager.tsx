"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryFormDialog } from "./category-form-dialog";
import { CategoryRowActions } from "./category-row-actions";
import {
  CATEGORY_KINDS,
  CATEGORY_KIND_LABELS,
  type CategoryKind,
} from "@/types/category";
import type { CategoryAdminNode } from "@/lib/db/queries/categories";
import { cn } from "@/lib/utils";

export function CategoriesManager({
  tree,
}: {
  tree: CategoryAdminNode[];
}) {
  const [newOpen, setNewOpen] = useState(false);

  const byKind = useMemo(() => {
    const map: Record<CategoryKind, CategoryAdminNode[]> = {
      income: [],
      expense: [],
      investment: [],
      transfer: [],
    };
    for (const node of tree) {
      map[node.kind].push(node);
    }
    return map;
  }, [tree]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Categorias</CardTitle>
          <CardDescription>
            Seeds do sistema + suas categorias custom. Você pode arquivar
            qualquer uma, mas só edita e exclui as próprias.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <PlusIcon className="mr-1.5 size-3.5" />
          Nova
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {CATEGORY_KINDS.map((kind) => {
          const parents = byKind[kind];
          if (parents.length === 0) return null;
          return (
            <section key={kind}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {CATEGORY_KIND_LABELS[kind]}s
              </h3>
              <ul className="rounded-md border divide-y">
                {parents
                  .slice()
                  .sort((a, b) =>
                    a.name.localeCompare(b.name, "pt-BR"),
                  )
                  .map((parent) => (
                    <li key={parent.id}>
                      <CategoryRow
                        node={parent}
                        parentName={null}
                        allCategories={tree}
                        indent={0}
                      />
                      {parent.children
                        .slice()
                        .sort((a, b) =>
                          a.name.localeCompare(b.name, "pt-BR"),
                        )
                        .map((child) => (
                          <CategoryRow
                            key={child.id}
                            node={child}
                            parentName={parent.name}
                            allCategories={tree}
                            indent={1}
                          />
                        ))}
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
      </CardContent>

      <CategoryFormDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        allCategories={tree}
      />
    </Card>
  );
}

function CategoryRow({
  node,
  parentName,
  allCategories,
  indent,
}: {
  node: CategoryAdminNode;
  parentName: string | null;
  allCategories: CategoryAdminNode[];
  indent: 0 | 1;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2",
        node.archivedForUser ? "opacity-60" : "",
        indent === 1 ? "bg-muted/30 pl-10" : "",
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm">
        {node.icon ? (
          <span className="shrink-0 text-base leading-none">{node.icon}</span>
        ) : null}
        <span className="truncate">{node.name}</span>
        {!node.isEditable ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            Sistema
          </Badge>
        ) : null}
        {node.archivedForUser ? (
          <Badge variant="secondary" className="text-[10px] font-normal">
            Arquivada
          </Badge>
        ) : null}
      </div>
      <CategoryRowActions
        category={node}
        parentName={parentName}
        allCategories={allCategories}
      />
    </div>
  );
}
