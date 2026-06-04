"use client";

import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SignOut, Sparkle } from "@phosphor-icons/react/ssr";
import { useSidebar } from "@/components/ui/sidebar";
import { RoleBadge } from "@/components/dashboard/role-badge";
import type { UserRole } from "@/lib/role-guard";
import Link from "next/link";

interface UserMenuProps {
  userName: string;
  userEmail?: string;
  userRole?: UserRole;
}

export function UserMenu({ userName, userEmail, userRole }: UserMenuProps) {
  const { state } = useSidebar();
  const isExpanded = state === "expanded";

  const handleSignOut = async () => {
    toast.success("Signed out successfully");
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={isExpanded
            ? "flex h-auto w-full items-start justify-start gap-3 rounded-sm border border-border bg-primary/10 px-3 py-2 text-left text-sm hover:bg-primary/20"
            : "flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-primary/10 text-sm font-semibold text-primary hover:bg-primary/20"
          }
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-primary/20 text-xs font-bold">
            {userName.charAt(0).toUpperCase()}
          </span>
          {isExpanded && (
            <div className="flex min-w-0 flex-1 flex-col items-start overflow-hidden">
              <span className="w-full truncate text-sm font-semibold text-foreground leading-tight">{userName}</span>
              {userEmail && (
                <span className="w-full truncate text-xs text-muted-foreground leading-tight">{userEmail}</span>
              )}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{userName}</span>
              {userRole && <RoleBadge role={userRole} size="sm" />}
            </div>
            {userEmail && (
              <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
            )}
          </div>
        </DropdownMenuLabel>
        {userRole === 'FREE_USER' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/billing" className="flex items-center gap-2 text-brand">
                <Sparkle className="size-4" weight="fill" />
                Upgrade to Premium
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
          className="cursor-pointer"
        >
          <SignOut className="size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
