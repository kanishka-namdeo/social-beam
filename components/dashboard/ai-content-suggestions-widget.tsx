"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkle, ArrowRight, ThumbsUp, Copy, Check } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

interface ContentSuggestion {
  id: string;
  title: string;
  description: string;
  platform: string;
  confidence: "high" | "medium" | "low";
  estimatedEngagement: number;
}

interface AIContentSuggestionsWidgetProps {
  suggestions: ContentSuggestion[];
  isLoading?: boolean;
  size?: WidgetSizeToken;
}

const confidenceConfig = {
  high: { label: "High", className: "bg-alert-success text-success border-alert-success-border" },
  medium: { label: "Medium", className: "bg-alert-warning text-warning border-alert-warning-border" },
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
};

export function AIContentSuggestionsWidget({
  suggestions,
  isLoading,
  size = "5x3",
}: AIContentSuggestionsWidgetProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isCompact, isWide } = getSizeDerivatives(size);
  const maxSuggestions = isCompact ? (isWide ? 3 : 2) : (isWide ? 5 : 3);
  const displaySuggestions = suggestions.slice(0, maxSuggestions);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = (suggestion: ContentSuggestion) => {
    navigator.clipboard.writeText(`${suggestion.title}\n\n${suggestion.description}`);
    setCopiedId(suggestion.id);
    toast.success("Copied to clipboard");
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <BaseWidget
      size={size as WidgetSizeToken}
      isEmpty={suggestions.length === 0}
      emptyState={{
        icon: <Sparkle weight="light" />,
        message: "No suggestions yet",
        description: "Connect more accounts to get personalized content ideas.",
        cta: {
          label: "Create Post",
          href: "/dashboard/compose",
        },
      }}
      header={{
        title: "AI Content Suggestions",
        icon: <Sparkle weight="fill" />,
        action: suggestions.length > 0 ? (
          <Badge variant="secondary" className="text-micro rounded-sm">
            {suggestions.length} ideas
          </Badge>
        ) : undefined,
      }}
      isLoading={isLoading}
      className="border-ai-surface bg-ai-surface border-l-2 border-l-brand"
    >
        <>
        <div className={cn("grid gap-section", isWide ? "grid-cols-2" : "grid-cols-1")}>
          {displaySuggestions.map((suggestion) => {
            const cfg = confidenceConfig[suggestion.confidence];
            return (
              <div
                key={suggestion.id}
                className="flex flex-col gap-control rounded-sm border border-subtle bg-surface-1 p-card hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-start justify-between gap-control">
                  <h4 className="text-body font-medium text-foreground line-clamp-2 flex-1">
                    {suggestion.title}
                  </h4>
                  <Badge
                    variant="outline"
                    className={cn("text-caption rounded-sm shrink-0", cfg.className)}
                  >
                    {cfg.label}
                  </Badge>
                </div>

                <p className="text-caption text-muted-foreground line-clamp-2">
                  {suggestion.description}
                </p>

                <div className="flex items-center justify-between gap-control mt-auto pt-control">
                <div className="flex items-center gap-control min-w-0">
                  <span className="text-caption text-muted-foreground capitalize truncate">
                    {suggestion.platform}
                  </span>
                  <span className="text-caption text-muted-foreground tabular-nums whitespace-nowrap">
                    Est. {(suggestion.estimatedEngagement * 100).toFixed(1)}% engagement
                  </span>
                </div>

                  <div className="flex items-center gap-tight">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleCopy(suggestion)}
                    >
                      {copiedId === suggestion.id ? (
                        <Check className="size-3 text-success" weight="bold" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon-xs" asChild>
                      <Link href={`/dashboard/compose?idea=${suggestion.id}`}>
                        <ArrowRight className="size-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {suggestions.length > maxSuggestions && (
          <div className="mt-panel flex justify-end">
            <Link
              href="/dashboard/ideas"
              className="flex items-center gap-tight text-caption text-muted-foreground hover:text-foreground transition-colors"
            >
              View all suggestions
              <ArrowRight className="size-3" weight="bold" />
            </Link>
          </div>
        )}
        </>
    </BaseWidget>
  );
}
