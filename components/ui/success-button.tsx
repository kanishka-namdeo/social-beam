"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Spinner } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

interface SuccessButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  onClick: () => Promise<void>;
  asChild?: boolean;
}

export function SuccessButton({ onClick, children, className, ...props }: SuccessButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  useEffect(() => {
    if (state === "success") {
      const timer = setTimeout(() => setState("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const handleClick = async () => {
    setState("loading");
    try {
      await onClick();
      setState("success");
    } catch {
      setState("idle");
    }
  };

  return (
    <Button
      className={cn(
        "transition-all duration-[var(--duration-slow)]",
        state === "success" && "bg-success hover:bg-success/90 text-white",
        className,
      )}
      onClick={handleClick}
      disabled={state === "loading"}
      {...props}
    >
      {state === "loading" ? (
        <Spinner className="size-4 animate-spin" weight="bold" />
      ) : state === "success" ? (
        <CheckCircle className="size-4" weight="bold" />
      ) : (
        children
      )}
    </Button>
  );
}
