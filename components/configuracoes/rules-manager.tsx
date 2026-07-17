"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RuleFormDialog } from "./rule-form-dialog";
import { RuleRowActions } from "./rule-row-actions";
import { CATEGORY_KIND_LABELS } from "@/types/category";
import type { RuleRow } from "@/lib/db/queries/categorization-rules";
import type { CategoryNode } from "@/lib/db/queries/categories";

export function RulesManager({
  rules,
  categories,
}: {
  rules: RuleRow[];
  categories: CategoryNode[];
}) {
  const [newOpen, setNewOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Regras de categorização</CardTitle>
          <CardDescription>
            Quando a descrição contém o padrão, a categoria é atribuída automaticamente
            — antes da IA, poupando tokens.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <PlusIcon className="mr-1.5 size-3.5" />
          Nova regra
        </Button>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <EmptyState
            title="Nenhuma regra ainda"
            description="Crie aqui ou a partir das correções no review de importação (OFX/PDF)."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium pb-2">Padrão</th>
                  <th className="text-left font-medium pb-2 w-48">Categoria</th>
                  <th className="text-right font-medium pb-2 w-20">Prio</th>
                  <th className="text-right font-medium pb-2 w-16">Hits</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rules.map((r) => (
                  <tr key={r.id} data-rule-id={r.id} data-rule-pattern={r.pattern}>
                    <td className="py-2 pr-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {r.pattern}
                      </code>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-col gap-0.5">
                        <span>{r.categoryName}</span>
                        <Badge variant="outline" className="w-fit text-[10px] font-normal">
                          {CATEGORY_KIND_LABELS[r.categoryKind]}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.priority}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                      {r.hitCount}
                    </td>
                    <td className="py-2">
                      <RuleRowActions
                        preset={{
                          id: r.id,
                          pattern: r.pattern,
                          categoryId: r.categoryId,
                          priority: r.priority,
                        }}
                        patternLabel={r.pattern}
                        categories={categories}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <RuleFormDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        categories={categories}
      />
    </Card>
  );
}
