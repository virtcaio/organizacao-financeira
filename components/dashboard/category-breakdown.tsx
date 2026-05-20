"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { CategoryBreakdownItem } from "@/lib/db/queries/dashboard";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

export function CategoryBreakdown({ items }: { items: CategoryBreakdownItem[] }) {
  const total = items.reduce((acc, it) => acc + it.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoria</CardTitle>
        <CardDescription>Despesas do mês corrente em BRL.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma despesa neste mês ainda.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={items}
                    dataKey="total"
                    nameKey="categoryName"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    stroke="var(--background)"
                  >
                    {items.map((it) => (
                      <Cell
                        key={it.categoryId ?? it.categoryName}
                        fill={PALETTE[it.fillIndex % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      background: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => formatCurrency(Number(value ?? 0), "BRL")}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {items.slice(0, 6).map((it) => {
                const pct = total > 0 ? (it.total / total) * 100 : 0;
                return (
                  <li
                    key={it.categoryId ?? it.categoryName}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-sm"
                        style={{ background: PALETTE[it.fillIndex % PALETTE.length] }}
                      />
                      <span className="truncate">{it.categoryName}</span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      <span>{formatCurrency(it.total, "BRL")}</span>
                      <span className="text-xs text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
