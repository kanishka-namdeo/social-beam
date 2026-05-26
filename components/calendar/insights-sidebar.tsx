"use client";

import { CalendarDots, Sparkle } from "@phosphor-icons/react/ssr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentGapAnalysis } from "./content-gap-analysis";
import { PostingFrequency } from "./posting-frequency";
import type { PostItem } from "./types";

interface InsightsSidebarProps {
  view: "month" | "week" | "day" | "list";
  filteredPosts: PostItem[];
  onComposeForSlot: (date: Date) => void;
}

export function InsightsSidebar({
  view,
  filteredPosts,
  onComposeForSlot,
}: InsightsSidebarProps) {
  return (
    <div
      className="flex h-full flex-col gap-4 overflow-y-auto p-3"
      aria-label="Calendar insights"
      role="region"
    >
      {/* AI tip banner — calendar views only */}
      {view !== "list" && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-lg bg-ai-surface/50 px-3 py-2.5 text-xs text-muted-foreground"
        >
          <Sparkle className="mt-0.5 size-3.5 shrink-0 text-brand" weight="fill" />
          <span>
            Click any post to preview. Drag between days to reschedule. Empty days with a{" "}
            <CalendarDots className="size-3 inline" /> icon are AI-suggested posting
            opportunities.
          </span>
        </div>
      )}

      {/* Content gap analysis — month view only */}
      {view === "month" && (
        <ContentGapAnalysis posts={filteredPosts} onComposeForSlot={onComposeForSlot} />
      )}

      {/* Posting frequency — month view only */}
      {view === "month" && <PostingFrequency posts={filteredPosts} />}

      {/* Empty state for sidebar when not month view and not list view */}
      {view !== "month" && view !== "list" && (
        <Card className="rounded-lg">
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
