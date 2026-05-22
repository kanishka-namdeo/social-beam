"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  House,
  PencilSimple,
  Calendar,
  ChartBar,
  Robot,
  Image,
  SlidersHorizontal,
  RedditLogo,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";

export type IconName =
  | "house"
  | "pencil-simple"
  | "calendar"
  | "chart-bar"
  | "robot"
  | "image"
  | "sliders-horizontal"
  | "reddit-logo";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

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
  }
}

interface SidebarNavProps {
  items: NavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const IconComponent = getIconComponent(item.icon);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <IconComponent className="size-4" weight={isActive ? "fill" : "regular"} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
