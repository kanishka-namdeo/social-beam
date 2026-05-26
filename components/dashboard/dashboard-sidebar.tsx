"use client";

import { useEffect } from "react";
import { useSidebarPreference } from "@/lib/utils/sidebar-state";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import type { NavItem } from "@/components/dashboard/sidebar-nav";
import Link from "next/link";
import { Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface DashboardSidebarInnerProps {
  navItems: NavItem[];
}

function DashboardSidebarInner({ navItems }: DashboardSidebarInnerProps) {
  const { config } = useSidebarPreference();
  const { open, setOpen } = useSidebar();

  // When icon mode is enabled, ensure sidebar is "collapsed" (open=false)
  // so the shadcn sidebar shrinks to icon rail instead of going offcanvas
  useEffect(() => {
    if (config.collapsible === "icon" && open) {
      setOpen(false);
    }
    if (config.collapsible !== "icon" && !open) {
      setOpen(true);
    }
  }, [config.collapsible, open, setOpen]);

  return (
    <Sidebar variant={config.variant} collapsible={config.collapsible}>
      <SidebarHeader>
        <div className={cn(
          "flex h-14 items-center px-3",
          "group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        )}>
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5",
              "text-sm font-semibold text-sidebar-foreground",
              "group-data-[collapsible=icon]:justify-center"
            )}
          >
            {/* Logo icon - always visible, enhanced in icon mode */}
            <div className={cn(
              "flex items-center justify-center rounded-lg bg-brand text-white transition-all duration-200",
              "h-8 w-8",
              "group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9",
              "group-data-[collapsible=icon]:shadow-sm group-data-[collapsible=icon]:shadow-brand/20",
              "group-data-[collapsible=icon]:hover:scale-105 group-data-[collapsible=icon]:hover:shadow-md group-data-[collapsible=icon]:hover:shadow-brand/30"
            )}>
              <Sparkle weight="fill" className="h-4 w-4" />
            </div>
            {/* Text hidden in icon mode */}
            <span className="group-data-[collapsible=icon]:hidden">SocialBeam</span>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-2">
        <SidebarNav items={navItems} />
      </SidebarContent>
    </Sidebar>
  );
}

interface DashboardSidebarProps {
  navItems: NavItem[];
}

export function DashboardSidebar({ navItems }: DashboardSidebarProps) {
  return <DashboardSidebarInner navItems={navItems} />;
}
