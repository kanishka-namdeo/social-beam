"use client";
import { useSession } from "next-auth/react";
import type { UserRole } from "@/lib/role-guard";

export function usePremium() {
  const { data: session, update } = useSession();
  const role = (session?.user as { role?: UserRole })?.role ?? 'FREE_USER';
  return {
    isPremium: role === 'PREMIUM_USER' || role === 'ADMIN',
    isAdmin: role === 'ADMIN',
    isFree: role === 'FREE_USER',
    role,
    refreshSession: () => update(),
  };
}
