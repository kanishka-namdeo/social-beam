"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkle, Megaphone, PencilSimple, Warning } from "@phosphor-icons/react/ssr";
import { BrandQuickEditDialog } from "./brand-quick-edit-dialog";

interface BrandContextIndicatorProps {
  brandContext: {
    businessName: string | null;
    tonePreset: string | null;
    voiceDescription?: string | null;
    bannedWords?: string[];
    audienceType?: string | null;
    interests?: string[];
    trainingStatus: string;
  } | null;
}

export function BrandContextIndicator({ brandContext }: BrandContextIndicatorProps) {
  const router = useRouter();
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  if (!brandContext) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            No brand context configured — AI will use default tone
          </span>
        </div>
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
          <a href="/settings/brand">
            <Sparkle className="size-3" weight="fill" />
            Set up brand
          </a>
        </Button>
      </div>
    );
  }

  const statusConfig = {
    trained: { label: "Trained", className: "bg-success/10 text-success border-success/20" },
    needs_refresh: { label: "Needs Refresh", className: "bg-warning/10 text-warning border-warning/20" },
    untrained: { label: "Untrained", className: "bg-muted text-muted-foreground" },
  };

  const status = statusConfig[brandContext.trainingStatus as keyof typeof statusConfig] ?? statusConfig.untrained;

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Sparkle className="size-3.5 text-brand" weight="fill" />
            <span className="text-xs font-medium text-foreground">
              {brandContext.businessName ?? "Brand"}
            </span>
          </div>
          {brandContext.tonePreset && (
            <Badge variant="outline" className="text-xs gap-1 normal-case tracking-normal">
              <Megaphone className="size-3" />
              {brandContext.tonePreset}
            </Badge>
          )}
          <Badge variant="outline" className={`text-xs ${status.className}`}>
            {status.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {brandContext.trainingStatus === "needs_refresh" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-warning"
              onClick={() => setQuickEditOpen(true)}
              aria-label="Review learning suggestions"
            >
              <Warning className="size-4" weight="fill" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setQuickEditOpen(true)}
            className="h-7 text-xs gap-1"
          >
            <PencilSimple className="size-3" />
            Quick edit
          </Button>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
            <a href="/settings/brand">View full profile</a>
          </Button>
        </div>
      </div>

      <BrandQuickEditDialog
        open={quickEditOpen}
        onOpenChange={setQuickEditOpen}
        brandContext={brandContext}
        onSave={() => router.refresh()}
      />
    </>
  );
}
