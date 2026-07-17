import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { AlertsBell } from "@/components/alertas/alerts-bell";
import { countUnreadAlerts, listAlerts } from "@/lib/db/queries/alerts";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.email || !session.user.id) redirect("/login");

  const user = {
    name: session.user.name ?? null,
    email: session.user.email,
  };

  const [unreadCount, recentAlerts] = await Promise.all([
    countUnreadAlerts(session.user.id),
    listAlerts(session.user.id, 8),
  ]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader
          actions={<AlertsBell unreadCount={unreadCount} recent={recentAlerts} />}
        />
        <main className="flex flex-1 flex-col p-4 md:p-6">{children}</main>
      </SidebarInset>
      <Toaster richColors closeButton />
    </SidebarProvider>
  );
}
