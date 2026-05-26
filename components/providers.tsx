"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ProvidersProps {
  children: React.ReactNode;
  session?: Session | null;
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session ?? undefined}>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster position="top-right" expand={false} richColors closeButton />
      </TooltipProvider>
    </SessionProvider>
  );
}
