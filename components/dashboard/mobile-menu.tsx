"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { List, SignOut } from "@phosphor-icons/react/ssr";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import type { NavItem } from "@/components/dashboard/sidebar-nav";

interface MobileMenuProps {
  navItems: NavItem[];
  userName?: string;
}

export function MobileMenu({ navItems, userName }: MobileMenuProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

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
        <Separator className="my-2" />
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground truncate">
            {userName ?? "User"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <SignOut className="size-4 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
