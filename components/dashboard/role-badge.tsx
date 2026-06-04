"use client";

import { Sparkle, ShieldCheck } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/role-guard";

interface RoleBadgeProps {
  role: UserRole;
  size?: "sm" | "md";
  className?: string;
}

const roleConfig: Record<UserRole, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  FREE_USER: { label: "Free", variant: "secondary" },
  PREMIUM_USER: { label: "Premium", variant: "default" },
  ADMIN: { label: "Admin", variant: "destructive" },
};

export function RoleBadge({ role, size = "sm", className }: RoleBadgeProps) {
  const config = roleConfig[role] ?? roleConfig.FREE_USER;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        size === "sm" ? "text-micro px-1.5 py-0" : "text-xs px-2 py-0.5",
        "font-medium tracking-tight",
        role === "PREMIUM_USER" && "bg-brand text-white border-brand/30",
        role === "ADMIN" && "flex items-center gap-1",
        className,
      )}
    >
      {role === "PREMIUM_USER" && <Sparkle className="size-3" weight="fill" />}
      {role === "ADMIN" && <ShieldCheck className="size-3" weight="fill" />}
      {config.label}
    </Badge>
  );
}
