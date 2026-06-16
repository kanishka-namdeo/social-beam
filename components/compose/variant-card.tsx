"use client";

import { Check, Sparkle } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const VARIANT_LABELS: Record<number, string> = {
  0: "Standard",
  1: "Shorter",
  2: "More Casual",
  3: "More Formal",
};

interface VariantCardProps {
  variantId: number;
  content: string;
  isComplete: boolean;
  isSelected: boolean;
  onSelect: (variantId: number, content: string) => void;
  className?: string;
}

export function VariantCard({ variantId, content, isComplete, isSelected, onSelect, className }: VariantCardProps) {
  const label = VARIANT_LABELS[variantId] ?? `Variant ${variantId}`;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-sm border bg-card p-4 hover-lift",
        isSelected
          ? "border-brand ring-2 ring-brand/20"
          : "border-border hover:bg-muted",
        className,
      )}
    >
      <div className="flex-between mb-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "gap-1 text-xs normal-case",
              isSelected ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground",
            )}
          >
            <Sparkle className="size-3" weight="fill" />
            {label}
          </Badge>
        </div>
        {isSelected && (
          <Check className="size-4 text-brand animate-[scale-in_150ms_ease-out]" weight="bold" />
        )}
      </div>

      <div className="flex-1 min-h-[80px]">
        {isComplete ? (
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {content}
          </p>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[90%]" />
            <Skeleton className="h-3 w-[75%]" />
          </div>
        )}
      </div>

      {isComplete && !isSelected && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelect(variantId, content)}
          className="mt-3 self-end gap-1.5 text-xs hover-scale"
        >
          <Check className="size-3.5" weight="bold" />
          Use this
        </Button>
      )}

      {isSelected && (
        <p className="text-xs text-brand mt-3 self-end flex items-center gap-1">
          <Check className="size-3" weight="bold" />
          Selected
        </p>
      )}
    </div>
  );
}
