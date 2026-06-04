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
  ChatCircle,
  Lock,
  CreditCard,
  ShieldCheck,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/role-guard";

export type IconName =
  | "house"
  | "pencil-simple"
  | "calendar"
  | "chart-bar"
  | "robot"
  | "image"
  | "sliders-horizontal"
  | "reddit-logo"
  | "magnifying-glass"
  | "chat-circle"
  | "credit-card"
  | "shield-check";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  premiumOnly?: boolean;
}

const KEYBOARD_SHORTCUTS: Record<string, string> = {
  "/dashboard": "G D",
  "/compose": "N",
  "/calendar": "C",
  "/analytics": "A",
  "/inbox": "I",
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
    case "chat-circle": return ChatCircle;
    case "credit-card": return CreditCard;
    case "shield-check": return ShieldCheck;
  }
}

interface SidebarNavProps {
  items: NavItem[];
  userRole?: UserRole;
}

export function SidebarNav({ items, userRole }: SidebarNavProps) {
  const pathname = usePathname();
  const isPremium = userRole === 'PREMIUM_USER' || userRole === 'ADMIN';

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
                      <kbd className="rounded bg-muted px-1.5 py-0.5 text-micro font-mono text-muted-foreground">
                        {shortcut}
                      </kbd>
                    )}
                  </div>
                ),
                side: "right",
                align: "center",
              }}
              className={cn(
                "gap-3 transition-all duration-normal ease-decelerate",
                "hover:bg-accent/50 hover:translate-x-0.5",
                // Icon mode overrides: square icon buttons with soft rounding
                "group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:p-0",
                "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center",
                "group-data-[collapsible=icon]:rounded-md",
                "group-data-[collapsible=icon]:hover:translate-x-0 group-data-[collapsible=icon]:hover:bg-brand/10 group-data-[collapsible=icon]:hover:text-brand",
                // Active state: sharp left border indicator, no rounded pill
                isActive && "border-l-2 border-brand bg-accent text-foreground font-medium rounded-none",
                // Active state: icon mode — solid brand tint with clean edges
                isActive && "group-data-[collapsible=icon]:bg-brand/15 group-data-[collapsible=icon]:text-brand group-data-[collapsible=icon]:border-l-brand",
              )}
            >
              <Link href={item.href} className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                <IconComponent
                  weight={isActive ? "fill" : "regular"}
                  className="size-4 shrink-0 transition-transform duration-normal group-data-[collapsible=icon]:size-5 group-data-[collapsible=icon]:group-hover:scale-110"
                />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                {item.premiumOnly && !isPremium && (
                  <Lock
                    weight="fill"
                    className="ml-auto size-3.5 text-muted-foreground/50 group-data-[collapsible=icon]:hidden"
                  />
                )}
                {shortcut && item.href !== "/compose" && item.href !== "/calendar" ? null : shortcut && (
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
