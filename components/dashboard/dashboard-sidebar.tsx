"use client";

import { useEffect, useRef } from "react";
import { useSidebarPreference } from "@/lib/utils/sidebar-state";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import type { NavItem } from "@/components/dashboard/sidebar-nav";
import Link from "next/link";
import { Sparkle } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/dashboard/user-menu";

interface DashboardSidebarInnerProps {
  navItems: NavItem[];
  userName: string;
  userEmail?: string;
}

function DashboardSidebarInner({ navItems, userName, userEmail }: DashboardSidebarInnerProps) {
  const { config } = useSidebarPreference();
  const { setOpen } = useSidebar();
  const prevCollapsible = useRef(config.collapsible);

  // Only sync open state when the collapsible *mode* changes (e.g. user toggles
  // icon-only in Settings). After the initial sync the user can freely toggle.
  useEffect(() => {
    if (prevCollapsible.current !== config.collapsible) {
      if (config.collapsible === "icon") {
        setOpen(false);
      } else {
        setOpen(true);
      }
      prevCollapsible.current = config.collapsible;
    }
  }, [config.collapsible, setOpen]);

  return (
    <Sidebar collapsible={config.collapsible} className="border-r border-sidebar-border">
      <SidebarHeader className="relative">
        <div className={cn(
          "flex h-14 items-center px-3",
          "group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        )}>
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5",
              "text-sm font-semibold tracking-tight text-sidebar-foreground",
              "group-data-[collapsible=icon]:justify-center"
            )}
          >
            {/* Logo icon - always visible */}
            <div className={cn(
              "flex items-center justify-center bg-brand text-white transition-all duration-200",
              "h-8 w-8 rounded-sm",
              "group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:rounded-md",
              "group-data-[collapsible=icon]:hover:scale-105"
            )}>
              <Sparkle weight="fill" className="h-4 w-4" />
            </div>
            {/* Text hidden in icon mode */}
            <span className="group-data-[collapsible=icon]:hidden">SocialBeam</span>
          </Link>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-sidebar-border/50" />
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-3 group-data-[collapsible=icon]:gap-1">
        <SidebarNav items={navItems} />
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:p-3 group-data-[collapsible=icon]:items-center">
        <UserMenu userName={userName} userEmail={userEmail} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

interface DashboardSidebarProps {
  navItems: NavItem[];
  userName: string;
  userEmail?: string;
}

export function DashboardSidebar({ navItems, userName, userEmail }: DashboardSidebarProps) {
  return <DashboardSidebarInner navItems={navItems} userName={userName} userEmail={userEmail} />;
}
