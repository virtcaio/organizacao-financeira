"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TITLE_BY_PATH: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/contas": "Contas",
  "/transacoes": "Transações",
  "/importar": "Importar",
  "/orcamento": "Orçamento",
  "/metas": "Metas",
  "/investimentos": "Investimentos",
  "/insights": "Insights",
  "/alertas": "Alertas",
  "/configuracoes": "Configurações",
};

export function SiteHeader() {
  const pathname = usePathname();
  const matched = Object.keys(TITLE_BY_PATH)
    .filter((p) => pathname === p || pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  const title = matched ? TITLE_BY_PATH[matched] : "Organização Financeira";

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  );
}
