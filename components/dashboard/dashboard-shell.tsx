"use client";

import Link from "next/link";
import { CopyableWorkspaceName } from "@/components/dashboard/copyable-workspace-name";
import { AIStatusIndicator } from "@/components/dashboard/ai-status-indicator";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { CreditIndicator } from "@/components/dashboard/credit-indicator";
import { UserMenu } from "@/components/dashboard/user-menu";
import { KeyboardShortcuts } from "@/components/dashboard/keyboard-shortcuts";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface DashboardShellProps {
  userName: string;
  workspaceName: string;
  creditBalance: number;
}

export function DashboardShell({
  userName,
  workspaceName,
  creditBalance,
}: DashboardShellProps) {
  return (
    <>
      <KeyboardShortcuts />
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <Link href="/dashboard" className="text-sm font-semibold text-foreground lg:hidden">
            SocialBeam
          </Link>
          <CopyableWorkspaceName workspaceName={workspaceName} />
        </div>
        <div className="flex items-center gap-3">
          <AIStatusIndicator />
          <NotificationBell />
          <CreditIndicator balance={creditBalance} />
          <kbd className="hidden h-6 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-xs font-mono text-muted-foreground lg:flex">
            <span className="leading-none">⌘</span>K
          </kbd>
          <UserMenu userName={userName} userEmail={undefined} />
        </div>
      </header>
    </>
  );
}
