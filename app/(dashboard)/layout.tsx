import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NavItem } from "@/components/dashboard/sidebar-nav";
import { OfflineIndicator } from "@/components/dashboard/offline-indicator";
import { InvisibleAIProvider } from "@/lib/invisible-ai-context";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { redirect } from "next/navigation";
import { isOnboardingComplete } from "@/lib/db/onboarding";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "house" as const },
  { label: "Compose", href: "/compose", icon: "pencil-simple" as const },
  { label: "Calendar", href: "/calendar", icon: "calendar" as const },
  { label: "Analytics", href: "/analytics", icon: "chart-bar" as const },
  { label: "Inbox", href: "/inbox", icon: "chat-circle" as const },
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

  if (!user?.id || !user?.workspaceId) {
    redirect("/login");
  }

  if (!(await isOnboardingComplete(user.id))) {
    redirect("/onboarding");
  }

  const userName = user?.name ?? "User";
  const userEmail = user?.email as string | undefined;
  const workspaceId = user?.workspaceId as string | undefined;

  let workspaceName = "My Workspace";
  if (workspaceId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });
    if (workspace) {
      workspaceName = workspace.name;
    }
  }

  return (
    <SidebarProvider>
      <DashboardSidebar navItems={navItems} userName={userName} userEmail={userEmail} />
      <SidebarInset>
        <InvisibleAIProvider>
          <DashboardShell
            userName={userName}
            workspaceName={workspaceName}
          />
          <OfflineIndicator />
          <main className="flex-1 min-w-0 overflow-hidden p-4 lg:p-6 motion-safe:animate-[fade-in_200ms_ease-out]">
            {children}
          </main>
        </InvisibleAIProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
