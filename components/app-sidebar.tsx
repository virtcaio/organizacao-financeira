"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboardIcon,
  WalletIcon,
  ArrowLeftRightIcon,
  PiggyBankIcon,
  TargetIcon,
  TrendingUpIcon,
  SparklesIcon,
  BellIcon,
  SettingsIcon,
  CoinsIcon,
  UploadIcon,
} from "lucide-react";
import { NavMain, type NavMainItem } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const PRIMARY_ITEMS: NavMainItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
  { title: "Contas", url: "/contas", icon: <WalletIcon /> },
  { title: "Transações", url: "/transacoes", icon: <ArrowLeftRightIcon /> },
  { title: "Importar", url: "/importar", icon: <UploadIcon /> },
  { title: "Orçamento", url: "/orcamento", icon: <PiggyBankIcon /> },
];

const SECONDARY_ITEMS: NavMainItem[] = [
  { title: "Metas", url: "/metas", icon: <TargetIcon /> },
  { title: "Investimentos", url: "/investimentos", icon: <TrendingUpIcon /> },
  { title: "Insights (IA)", url: "/insights", icon: <SparklesIcon /> },
  { title: "Alertas", url: "/alertas", icon: <BellIcon /> },
];

const FOOTER_ITEMS: NavMainItem[] = [
  { title: "Configurações", url: "/configuracoes", icon: <SettingsIcon /> },
];

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string | null; email: string };
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/dashboard" />}
            >
              <CoinsIcon className="size-5!" />
              <span className="text-base font-semibold">Organização Financeira</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={PRIMARY_ITEMS} />
        <SidebarGroup>
          <SidebarGroupLabel>Mais</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMain items={SECONDARY_ITEMS} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <NavMain items={FOOTER_ITEMS} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
