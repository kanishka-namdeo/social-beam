"use client";

import Link from "next/link";
import { useState } from "react";
import { WorkspaceDropdown } from "@/components/dashboard/copyable-workspace-name";
import { ActivityDropdown } from "@/components/dashboard/activity-dropdown";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/dashboard/user-menu";
import { KeyboardShortcuts } from "@/components/dashboard/keyboard-shortcuts";
import { StatusRoleIndicator } from "@/components/dashboard/status-role-indicator";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBadge } from "@/components/dashboard/role-badge";
import { useSidebarPreference } from "@/lib/utils/sidebar-state";
import type { UserRole } from "@/lib/role-guard";

interface DashboardShellProps {
  userName: string;
  workspaceName: string;
  workspaceId: string;
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
  workspaceId,
  brandContext,
  userRole,
}: DashboardShellProps) {
  const { config } = useSidebarPreference();
  const isIconOnly = config.collapsible === "icon";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <KeyboardShortcuts />
      <CommandPalette />
      <header className="sticky top-0 z-sticky flex h-14 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {!isIconOnly && <SidebarTrigger className="-ml-1" />}
          <Link href="/dashboard" className="text-sm font-semibold text-foreground lg:hidden">
            SocialBeam
          </Link>
          <WorkspaceDropdown workspaceName={workspaceName} workspaceId={workspaceId} />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <StatusRoleIndicator role={userRole} brandContext={brandContext} />
          <ActivityDropdown />
          <NotificationBell />
          <button
            onClick={() => {
              const event = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                ctrlKey: true,
              });
              window.dispatchEvent(event);
            }}
            className="hidden lg:flex h-6 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-xs font-mono text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            aria-label="Open command palette"
            title="Open command palette (⌘K)"
          >
            <span className="leading-none">⌘</span>K
          </button>
          <UserMenu userName={userName} userEmail={undefined} userRole={userRole} />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex items-center justify-center h-9 w-9 rounded border border-border bg-background hover:bg-muted transition-colors"
            aria-label="Toggle mobile menu"
          >
            <svg
              className="size-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-14 z-40 bg-background/95 backdrop-blur-md overflow-y-auto">
          <nav className="flex flex-col gap-2 p-4">
            <MobileNavLink href="/dashboard" label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/compose" label="Compose" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/calendar" label="Calendar" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/analytics" label="Analytics" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/reddit/trending" label="Reddit Trending" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/media" label="Media Library" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink href="/settings" label="Settings" onClick={() => setMobileMenuOpen(false)} />
            <div className="border-t border-border my-2" />
            <div className="px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium">Role:</span> <RoleBadge role={userRole} size="sm" />
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

function MobileNavLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors"
    >
      {label}
    </Link>
  );
}
