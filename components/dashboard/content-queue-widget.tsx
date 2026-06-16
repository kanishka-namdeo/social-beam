"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Queue, ArrowRight, CalendarDots } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives, getSizeConfig } from "@/lib/dashboard/widget-types";

interface QueuedPost {
  id: string;
  title: string | null;
  platforms: string[];
  scheduledAt: string;
  status: "draft" | "scheduled" | "publishing" | "published";
}

interface ContentQueueWidgetProps {
  posts: QueuedPost[];
  size?: WidgetSizeToken;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-post-draft/10 text-post-draft" },
  scheduled: { label: "Scheduled", className: "bg-post-queued/10 text-post-queued" },
  publishing: { label: "Publishing", className: "bg-post-publishing/10 text-post-publishing" },
  published: { label: "Published", className: "bg-post-published/10 text-post-published" },
};

const platformColors: Record<string, string> = {
  instagram: "bg-preview-instagram",
  facebook: "bg-preview-facebook",
  x: "bg-preview-x",
  linkedin: "bg-preview-linkedin",
  tiktok: "bg-preview-tiktok",
  pinterest: "bg-preview-pinterest",
};

export function ContentQueueWidget({ posts, size = "5x3" }: ContentQueueWidgetProps) {
  const { isWide, isTall, rows } = getSizeDerivatives(size);
  const sizeConfig = getSizeConfig(size);
  
  const maxPosts = sizeConfig.maxItems ?? (rows <= 2 && !isWide ? 2 : isTall ? 6 : isWide ? 4 : 3);
  const displayPosts = posts.slice(0, maxPosts);

  return (
    <BaseWidget
      size={size}
      isEmpty={posts.length === 0}
      emptyState={{
        icon: <Queue className="size-8" weight="light" />,
        message: "No posts in queue",
        cta: {
          label: "Create Post",
          href: "/dashboard/compose",
        },
      }}
      header={{
        title: "Content Queue",
        icon: <Queue className="size-4 text-brand" weight="bold" />,
        action: posts.length > 0 && (
          <Badge variant="secondary" className="text-micro rounded-sm">
            {posts.length} posts
          </Badge>
        ),
      }}
    >
      <div className={cn("grid gap-control", isWide ? "grid-cols-2" : "grid-cols-1")}>
        {displayPosts.map((post) => {
          const cfg = statusConfig[post.status] ?? statusConfig.draft;
          return (
            <div
              key={post.id}
              className="flex flex-col gap-control rounded-sm border border-subtle bg-surface-1 p-card hover:bg-surface-2 transition-colors"
            >
              <div className="flex items-start justify-between gap-control">
                <Link
                  href={`/dashboard/compose?postId=${post.id}`}
                  className="text-body font-medium text-foreground hover:text-brand truncate flex-1"
                >
                  {post.title ?? "Untitled Post"}
                </Link>
                <Badge
                  variant="outline"
                  className={cn("text-caption rounded-sm shrink-0", cfg.className)}
                >
                  {cfg.label}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-control">
                <div className="flex gap-tight">
                  {post.platforms.map((p) => (
                    <span
                      key={p}
                      className={cn(
                        "size-2 rounded-sm",
                        platformColors[p] ?? "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-control text-caption text-muted-foreground min-w-0">
                  <CalendarDots className="size-3 shrink-0" />
                  <span className="truncate tabular-nums">
                    {post.scheduledAt
                      ? formatDistanceToNow(new Date(post.scheduledAt), { addSuffix: true })
                      : "Not scheduled"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {posts.length > maxPosts && (
        <div className="mt-panel flex justify-end">
          <Link
            href="/dashboard/calendar"
            className="flex items-center gap-tight text-caption text-muted-foreground hover:text-foreground transition-colors"
          >
            View all {posts.length} posts
            <ArrowRight className="size-3" weight="bold" />
          </Link>
        </div>
      )}
    </BaseWidget>
  );
}
