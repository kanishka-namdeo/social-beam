"use client";

import Link from "next/link";
import { List } from "@phosphor-icons/react/ssr";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import type { NavItem } from "@/components/dashboard/sidebar-nav";

interface MobileMenuProps {
  navItems: NavItem[];
}

export function MobileMenu({ navItems }: MobileMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <List className="size-5" weight="bold" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-14 items-center border-b border-border px-5">
          <Link href="/dashboard" className="text-sm font-semibold tracking-wider uppercase text-sidebar-foreground">
            SocialBeam
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          <SidebarNav items={navItems} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
