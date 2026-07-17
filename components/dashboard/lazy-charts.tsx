"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Recharts pesa ~80-100KB gz — carregado sob demanda pra não entrar no
// first load do dashboard. ssr:false porque os gráficos só fazem sentido
// com medidas do client (ResponsiveContainer).
function ChartCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

export const CategoryBreakdownLazy = dynamic(
  () =>
    import("@/components/dashboard/category-breakdown").then(
      (m) => m.CategoryBreakdown,
    ),
  { ssr: false, loading: () => <ChartCardSkeleton /> },
);

export const MonthlyEvolutionLazy = dynamic(
  () =>
    import("@/components/dashboard/monthly-evolution").then(
      (m) => m.MonthlyEvolution,
    ),
  { ssr: false, loading: () => <ChartCardSkeleton /> },
);
