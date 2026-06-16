"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarDots, WarningCircle, CheckCircle, Spinner, ListDashes } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { useInvisibleAI } from "@/lib/invisible-ai-context";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

interface PostPlatform {
  platform: string;
  status: string;
  error?: string | null;
}

interface Post {
  id: string;
  title: string | null;
  status: string;
  confidence: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  platforms: PostPlatform[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string; icon?: React.ReactNode }> = {
  DRAFT: { label: "Draft", variant: "outline" },
  SCHEDULED: { label: "Scheduled", variant: "secondary", icon: <CalendarDots weight="bold" className="size-3" /> },
  PUBLISHING: { label: "Publishing", variant: "outline", className: "bg-post-publishing/10 text-post-publishing", icon: <Spinner weight="bold" className="size-3 animate-spin" /> },
  PUBLISHED: { label: "Published", variant: "outline", className: "bg-post-published/10 text-post-published", icon: <CheckCircle weight="bold" className="size-3" /> },
  FAILED: { label: "Failed", variant: "destructive", icon: <WarningCircle weight="bold" className="size-3" /> },
};

const confidenceConfig: Record<string, { label: string; className: string }> = {
  HIGH: { label: "High", className: "bg-ai-confidence-high/10 text-ai-confidence-high" },
  MEDIUM: { label: "Medium", className: "bg-ai-confidence-medium/10 text-ai-confidence-medium" },
  LOW: { label: "Low", className: "bg-ai-confidence-low/10 text-ai-confidence-low" },
};

const platformColors: Record<string, string> = {
  instagram: "bg-preview-instagram",
  facebook: "bg-preview-facebook",
  x: "bg-preview-x",
  linkedin: "bg-preview-linkedin",
  tiktok: "bg-preview-tiktok",
  pinterest: "bg-preview-pinterest",
};

interface RecentPostsListProps {
  posts: Post[];
  size?: WidgetSizeToken;
}

export function RecentPostsList({ posts, size = "5x3" }: RecentPostsListProps) {
  const { config } = useInvisibleAI();
  const { isWide, isTall } = getSizeDerivatives(size);
  const maxPosts = isTall ? (isWide ? 6 : 5) : 3;

  // Helper to determine the effective status from platform statuses
  const getEffectiveStatus = (post: Post) => {
    // If the post itself is published, return PUBLISHED
    if (post.status === "PUBLISHED") return "PUBLISHED";
    
    // If post status is not DRAFT, use it (SCHEDULED, PUBLISHING, FAILED)
    if (post.status !== "DRAFT") return post.status;
    
    // For DRAFT posts, check if any platform has a more advanced status
    const platformStatuses = post.platforms.map(p => p.status);
    
    // Priority order: FAILED > PUBLISHING > PUBLISHED > SCHEDULED > DRAFT
    if (platformStatuses.includes("FAILED")) return "FAILED";
    if (platformStatuses.includes("PUBLISHING")) return "PUBLISHING";
    if (platformStatuses.includes("PUBLISHED")) return "PUBLISHED";
    if (platformStatuses.includes("SCHEDULED")) return "SCHEDULED";
    
    return post.status;
  };

  const displayPosts = posts.slice(0, maxPosts);

  return (
    <BaseWidget
      size={size}
      isEmpty={posts.length === 0}
      emptyState={{
        icon: <ListDashes className="size-8" weight="light" />,
        message: "No posts yet",
        description: "Create your first post to get started.",
        cta: {
          label: "Create Post",
          href: "/dashboard/compose",
        },
      }}
      header={{
        title: "Recent Posts",
        icon: <ListDashes className="size-4" weight="bold" />,
      }}
    >
        <div className="space-y-section min-w-0">
        {/* Card layout for narrow widgets */}
        <div className={cn("space-y-control", isWide ? "hidden" : "block")}>
          {displayPosts.map((post) => {
            const effectiveStatus = getEffectiveStatus(post);
            const cfg = statusConfig[effectiveStatus] ?? statusConfig.DRAFT;
            return (
              <div
                key={post.id}
                className="rounded-sm border border-border/50 p-card hover:bg-muted/30 transition-colors min-w-0"
              >
                <Link href={`/dashboard/compose?postId=${post.id}`} className="font-medium text-foreground hover:underline line-clamp-2 block min-w-0">
                  {post.title ?? "Untitled"}
                </Link>
                <div className="flex items-center gap-control mt-2 min-w-0">
                  <div className="flex gap-1.5 shrink-0">
                    {post.platforms.map((p) => (
                      <span
                        key={p.platform}
                        className={`size-3 rounded-sm ${platformColors[p.platform] ?? "bg-muted"}`}
                      />
                    ))}
                  </div>
                  <Badge
                    variant={cfg.variant}
                    className={cn("text-micro gap-1 shrink-0", cfg.className)}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </Badge>
                  <span className="ml-auto text-caption text-muted-foreground tabular-nums shrink-0">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString()
                      : post.scheduledAt
                      ? new Date(post.scheduledAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table layout for wide widgets */}
        <div className={cn("overflow-x-auto", isWide ? "block" : "hidden")}>
          <Table className="min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Post</TableHead>
                <TableHead className="w-[15%]">Platforms</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                {config.showConfidence && <TableHead className="w-[12%]">Confidence</TableHead>}
                <TableHead className="w-[18%] text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPosts.map((post) => {
                const effectiveStatus = getEffectiveStatus(post);
                const cfg = statusConfig[effectiveStatus] ?? statusConfig.DRAFT;
                return (
                  <TableRow key={post.id} className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
                    <TableCell className="min-w-0 max-w-0">
                      <Link href={`/dashboard/compose?postId=${post.id}`} className="font-medium text-foreground hover:underline truncate block min-w-0" title={post.title ?? "Untitled"}>
                        {post.title ?? "Untitled"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {post.platforms.map((p) => (
                          p.error ? (
                            <TooltipProvider key={p.platform}>
                              <Tooltip>
                                <TooltipTrigger>
                                  <span
                                    className={`size-3 rounded-sm ${platformColors[p.platform] ?? "bg-muted"} ring-1 ring-destructive/50`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="mt-1 text-caption text-destructive">{p.error}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span
                              key={p.platform}
                              className={`size-3 rounded-sm ${platformColors[p.platform] ?? "bg-muted"}`}
                            />
                          )
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={cfg.variant}
                        className={cn("text-micro gap-1", cfg.className)}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    {config.showConfidence && (
                      <TableCell>
                        {post.confidence && confidenceConfig[post.confidence] ? (
                          <Badge
                            variant="outline"
                            className={`text-micro ${confidenceConfig[post.confidence].className}`}
                          >
                            {confidenceConfig[post.confidence].label}
                          </Badge>
                        ) : (
                          <span className="text-micro text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right text-caption text-muted-foreground tabular-nums whitespace-nowrap">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString()
                        : post.scheduledAt
                        ? new Date(post.scheduledAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        </div>
    </BaseWidget>
  );
}
