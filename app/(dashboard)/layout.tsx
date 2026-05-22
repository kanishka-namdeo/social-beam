import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Bell,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { MobileMenu } from "@/components/dashboard/mobile-menu";
import { Button } from "@/components/ui/button";
import type { NavItem } from "@/components/dashboard/sidebar-nav";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "house" as const },
  { label: "Compose", href: "/compose", icon: "pencil-simple" as const },
  { label: "Calendar", href: "/calendar", icon: "calendar" as const },
  { label: "Analytics", href: "/analytics", icon: "chart-bar" as const },
  { label: "Reddit Radar", href: "/dashboard/reddit/trending", icon: "reddit-logo" as const },
  { label: "Agent Panel", href: "/agents", icon: "robot" as const },
  { label: "Settings", href: "/dashboard/settings", icon: "sliders-horizontal" as const },
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
    <div className="grid min-h-screen grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr]">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center border-b border-border px-5">
          <Link href="/dashboard" className="text-sm font-semibold tracking-wider uppercase text-sidebar-foreground">
            SocialBeam
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <SidebarNav items={navItems} />
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex min-h-screen flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <MobileMenu navItems={navItems} />

            <Link href="/dashboard" className="text-sm font-semibold tracking-wider uppercase text-foreground lg:hidden">
              SocialBeam
            </Link>
            <span className="text-sm font-medium text-muted-foreground">
              {workspaceName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-5" weight="regular" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand" />
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
