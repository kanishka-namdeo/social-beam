"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  PencilSimple,
  Calendar,
  ChartBar,
  Robot,
  Image,
  SlidersHorizontal,
  RedditLogo,
  MagnifyingGlass,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type IconName =
  | "house"
  | "pencil-simple"
  | "calendar"
  | "chart-bar"
  | "robot"
  | "image"
  | "sliders-horizontal"
  | "reddit-logo"
  | "magnifying-glass";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

const KEYBOARD_SHORTCUTS: Record<string, string> = {
  "/dashboard": "G D",
  "/compose": "N",
  "/calendar": "C",
  "/analytics": "A",
  "/reddit/trending": "R",
  "/media": "M",
  "/settings": "S",
};

function getIconComponent(name: IconName): Icon {
  switch (name) {
    case "house": return House;
    case "pencil-simple": return PencilSimple;
    case "calendar": return Calendar;
    case "chart-bar": return ChartBar;
    case "robot": return Robot;
    case "image": return Image;
    case "sliders-horizontal": return SlidersHorizontal;
    case "reddit-logo": return RedditLogo;
    case "magnifying-glass": return MagnifyingGlass;
  }
}

interface SidebarNavProps {
  items: NavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const IconComponent = getIconComponent(item.icon);
        const shortcut = KEYBOARD_SHORTCUTS[item.href];

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={{
                children: (
                  <div className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {shortcut && (
                      <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {shortcut}
                      </kbd>
                    )}
                  </div>
                ),
                side: "right",
                align: "center",
              }}
              className={cn(
                "gap-3 rounded-md transition-all duration-200 ease-out",
                "hover:bg-accent",
                // Icon mode overrides
                "group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:p-0",
                "group-data-[collapsible=icon]:justify-center",
                "group-data-[collapsible=icon]:rounded-xl",
                // Active state: regular mode
                isActive && "bg-brand/10 border-l-2 border-brand text-brand",
                // Active state: icon mode
                isActive && "group-data-[collapsible=icon]:bg-brand/10 group-data-[collapsible=icon]:text-brand",
                isActive && "group-data-[collapsible=icon]:ring-1 group-data-[collapsible=icon]:ring-brand/30",
                // Hover state
                "group-data-[collapsible=icon]:hover:scale-105",
              )}
            >
              <Link href={item.href} className="group-data-[collapsible=icon]:justify-center">
                <IconComponent
                  weight={isActive ? "fill" : "regular"}
                  className={cn(
                    "transition-transform duration-200",
                    "group-data-[collapsible=icon]:size-5",
                    "group-data-[collapsible=icon]:group-hover:scale-110",
                    // Active icon gets brand color in icon mode
                    isActive && "group-data-[collapsible=icon]:text-brand",
                  )}
                />
                <span>{item.label}</span>
                {shortcut && (
                  <span className="ml-auto text-xs font-mono text-muted-foreground/50 group-data-[collapsible=icon]:hidden">
                    {shortcut}
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
