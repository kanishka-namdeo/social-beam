"use client";

import Link from "next/link";
import { CopyableWorkspaceName } from "@/components/dashboard/copyable-workspace-name";
import { AIStatusIndicator } from "@/components/dashboard/ai-status-indicator";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/dashboard/user-menu";
import { KeyboardShortcuts } from "@/components/dashboard/keyboard-shortcuts";
import { BrandStatusPill } from "@/components/dashboard/brand-status-pill";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBadge } from "@/components/dashboard/role-badge";
import type { UserRole } from "@/lib/role-guard";

interface DashboardShellProps {
  userName: string;
  workspaceName: string;
  brandContext: {
    trainingStatus: string | null;
    lastTrainedAt: Date | null;
    businessName: string | null;
  } | null;
  userRole: UserRole;
}

export function DashboardShell({
  userName,
  workspaceName,
  brandContext,
  userRole,
}: DashboardShellProps) {
  return (
    <>
      <KeyboardShortcuts />
      <header className="sticky top-0 z-sticky flex h-14 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <Link href="/dashboard" className="text-sm font-semibold text-foreground lg:hidden">
            SocialBeam
          </Link>
          <CopyableWorkspaceName workspaceName={workspaceName} />
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <BrandStatusPill brandContext={brandContext} />
          <RoleBadge role={userRole} />
          <AIStatusIndicator />
          <NotificationBell />
          <kbd className="hidden h-6 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-xs font-mono text-muted-foreground lg:flex">
            <span className="leading-none">⌘</span>K
          </kbd>
          <UserMenu userName={userName} userEmail={undefined} userRole={userRole} />
        </div>
      </header>
    </>
  );
}
