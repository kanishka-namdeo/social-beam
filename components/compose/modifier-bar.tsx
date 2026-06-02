"use client";

import { Spinner } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MODIFIERS = [
  { key: "shorten", label: "— Shorten", description: "Make it ~30% shorter" },
  { key: "expand", label: "+ Expand", description: "Add ~30% more detail" },
  { key: "casual", label: "More Casual", description: "Relaxed, conversational" },
  { key: "formal", label: "More Formal", description: "Professional, polished" },
] as const;

export type ModifierKey = (typeof MODIFIERS)[number]["key"];

interface ModifierBarProps {
  onModify: (modifier: ModifierKey) => void;
  isModifying: boolean;
  activeModifier: ModifierKey | null;
  className?: string;
}

export function ModifierBar({ onModify, isModifying, activeModifier, className }: ModifierBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {MODIFIERS.map((m) => (
        <Button
          key={m.key}
          type="button"
          variant="outline"
          size="sm"
          disabled={isModifying}
          onClick={() => onModify(m.key)}
          className={cn(
            "gap-1.5 text-xs normal-case hover-scale transition-all",
            activeModifier === m.key && "border-brand bg-brand/5 text-brand",
          )}
          title={m.description}
        >
          {isModifying && activeModifier === m.key ? (
            <>
              <Spinner className="size-3 animate-spin" weight="bold" />
              Modifying...
            </>
          ) : (
            m.label
          )}
        </Button>
      ))}
    </div>
  );
}
