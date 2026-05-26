import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NavItem } from "@/components/dashboard/sidebar-nav";
import { LowCreditBanner } from "@/components/dashboard/low-credit-banner";
import { OfflineIndicator } from "@/components/dashboard/offline-indicator";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "house" as const },
  { label: "Compose", href: "/compose", icon: "pencil-simple" as const },
  { label: "Calendar", href: "/calendar", icon: "calendar" as const },
  { label: "Analytics", href: "/analytics", icon: "chart-bar" as const },
  { label: "Research", href: "/reddit/trending", icon: "magnifying-glass" as const },
  { label: "Media Library", href: "/media", icon: "image" as const },
  { label: "Settings", href: "/settings", icon: "sliders-horizontal" as const },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rawSession = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = rawSession?.user as any;
  const userName = user?.name ?? "User";
  const workspaceId = user?.workspaceId as string | undefined;

  let workspaceName = "My Workspace";
  let creditBalance = 0;
  if (workspaceId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });
    if (workspace) {
      workspaceName = workspace.name;
    }

    const creditRecord = await prisma.aiCreditBalance.findFirst({
      where: { workspaceId },
      select: { balance: true },
    });
    creditBalance = creditRecord?.balance ?? 0;
  }

  return (
    <SidebarProvider>
      <DashboardSidebar navItems={navItems} />
      <SidebarInset>
        <DashboardShell
          userName={userName}
          workspaceName={workspaceName}
          creditBalance={creditBalance}
        />
        {creditBalance <= 3 && <LowCreditBanner />}
        <OfflineIndicator />
        <main className="flex-1 overflow-auto p-4 lg:p-6 motion-safe:animate-[fade-in_200ms_ease-out]">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
