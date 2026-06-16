"use client";

import { useState } from "react";
import { Sparkle, Lock } from "@phosphor-icons/react/ssr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentGapAnalysis } from "./content-gap-analysis";
import { PostingFrequency } from "./posting-frequency";
import type { PostItem } from "./types";
import { usePremium } from "@/hooks/use-premium";
import { FeatureGate } from "@/components/dashboard/feature-gate";

interface InsightsSidebarProps {
  view: "month" | "week" | "day" | "list";
  filteredPosts: PostItem[];
  onComposeForSlot: (date: Date) => void;
  platformContexts?: Array<{ platform: string; postingCadence: string | null }>;
  onAiFill?: (dates: Date[]) => void;
}

export function InsightsSidebar({
  view,
  filteredPosts,
  onComposeForSlot,
  platformContexts,
  onAiFill,
}: InsightsSidebarProps) {
  const { isPremium } = usePremium();

  return (
    <div
      className="flex h-full flex-col gap-4 overflow-y-auto p-3"
      aria-label="Calendar insights"
      role="region"
    >
      {/* Content gap analysis — month view only — AI feature */}
      {view === "month" && (
        isPremium ? (
          <ContentGapAnalysis posts={filteredPosts} onComposeForSlot={onComposeForSlot} platformContexts={platformContexts} onAiFill={onAiFill} />
        ) : (
          <ContentGapTeaser posts={filteredPosts} />
        )
      )}

      {/* Posting frequency — month view only */}
      {view === "month" && <PostingFrequency posts={filteredPosts} platformContexts={platformContexts} />}

      {/* Empty state for sidebar when not month view and not list view */}
      {view !== "month" && view !== "list" && (
        <Card className="rounded-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Stats</CardTitle>
            <CardDescription className="text-muted-foreground">
              {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""} in this
              period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Scheduled</span>
                <span className="font-medium text-foreground">
                  {filteredPosts.filter((p) => p.status === "SCHEDULED").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Published</span>
                <span className="font-medium text-foreground">
                  {filteredPosts.filter((p) => p.status === "PUBLISHED").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Draft</span>
                <span className="font-medium text-foreground">
                  {filteredPosts.filter((p) => p.status === "DRAFT").length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Teaser card showing summary count but gating the detailed gap list */
function ContentGapTeaser({ posts }: { posts: PostItem[] }) {
  const scheduled = posts.filter((p) => p.status === "SCHEDULED" || p.status === "DRAFT").length;
  const totalDeficit = Math.max(0, 5 - scheduled);

  return (
    <Card className="rounded-sm border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            <CardTitle className="text-sm font-medium tracking-tight">Weekly Content Analysis</CardTitle>
          </div>
          <Badge variant="outline" className="normal-case gap-1 text-warning border-warning">
            <Lock className="size-3" />
            Premium
          </Badge>
        </div>
        <CardDescription>
          {totalDeficit > 0
            ? `${totalDeficit} more post${totalDeficit > 1 ? "s" : ""} recommended this week`
            : "Your schedule looks great this week!"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-sm border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {scheduled} / 5 posts scheduled this week
        </div>
        <FeatureGate
          isPremium={false}
          featureName="AI Content Gaps"
          description="Get specific gap recommendations"
          variant="inline"
          className="mt-3"
        />
      </CardContent>
    </Card>
  );
}
