import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NavItem } from "@/components/dashboard/sidebar-nav";
import { OfflineIndicator } from "@/components/dashboard/offline-indicator";
import { BrandLearningToastTrigger } from "@/components/dashboard/brand-learning-toast-trigger";
import { PushNotificationRegistrar } from "@/components/dashboard/push-notification-registrar";
import { SessionExpiryHandler } from "@/components/dashboard/session-expiry-handler";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";
import { PushNotificationProvider } from "@/lib/notifications/push-context";
import { InvisibleAIProvider } from "@/lib/invisible-ai-context";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/role-guard";
import { isOnboardingComplete } from "@/lib/onboarding";

const BASE_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "house" as const },
  { label: "Compose", href: "/compose", icon: "pencil-simple" as const },
  { label: "Templates", href: "/templates", icon: "note-pencil" as const },
  { label: "Campaigns", href: "/campaigns", icon: "megaphone" as const },
  { label: "Calendar", href: "/calendar", icon: "calendar" as const },
  { label: "Analytics", href: "/analytics", icon: "chart-bar" as const },
  { label: "Inbox", href: "/inbox", icon: "chat-circle" as const },
  { label: "Research", href: "/reddit/trending", icon: "magnifying-glass" as const },
  { label: "Media Library", href: "/media", icon: "image" as const },
  { label: "Data Sync", href: "/sync", icon: "arrow-clockwise" as const },
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

  // Ensure role is always present - fall back to DB if session role is missing
  let userRole = (user?.role as UserRole);
  if (!userRole && user.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    userRole = (dbUser?.role as UserRole) ?? 'FREE_USER';
  } else {
    userRole = userRole ?? 'FREE_USER';
  }

  // Admin-only nav item
  let navItems = userRole === 'ADMIN'
    ? [...BASE_NAV_ITEMS, { label: "Admin", href: "/admin", icon: "shield-check" as const }]
    : [...BASE_NAV_ITEMS];

  const onboardingDone = await isOnboardingComplete(user.id);
  if (!onboardingDone) {
    navItems.splice(1, 0, { label: "Setup", href: "/dashboard?setup=1", icon: "list-checks" as const });
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

  const brandContext = await prisma.brandContext.findUnique({
    where: { workspaceId },
    select: { trainingStatus: true, lastTrainedAt: true, businessName: true },
  });

  return (
    <SidebarProvider>
      <DashboardSidebar navItems={navItems} userName={userName} userEmail={userEmail} userRole={userRole} />
      <SidebarInset>
        <InvisibleAIProvider>
          <PushNotificationProvider>
            <PushNotificationRegistrar />
            <DashboardShell
              userName={userName}
              workspaceName={workspaceName}
              workspaceId={workspaceId!}
              brandContext={brandContext}
              userRole={userRole}
            />
            <OfflineIndicator />
            <BrandLearningToastTrigger />
            <SessionExpiryHandler />
            <WebVitalsReporter />
            <main className="flex-1 min-w-0 overflow-hidden p-4 lg:p-6 motion-safe:animate-[fade-in_200ms_ease-out]">
              {children}
            </main>
          </PushNotificationProvider>
        </InvisibleAIProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
