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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDots, WarningCircle, CheckCircle, Spinner } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { useInvisibleAI } from "@/lib/invisible-ai-context";

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
}

export function RecentPostsList({ posts }: RecentPostsListProps) {
  const { config } = useInvisibleAI();

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

  if (posts.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
            <CalendarDots className="size-4" weight="bold" />
            Recent Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-sm border border-dashed border-border p-empty text-center">
            <p className="text-sm text-muted-foreground">No posts yet. Create your first post to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
          <CalendarDots className="size-4" weight="bold" />
          Recent Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Post</TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead>Status</TableHead>
              {config.showConfidence && <TableHead>Confidence</TableHead>}
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => {
              const effectiveStatus = getEffectiveStatus(post);
              const cfg = statusConfig[effectiveStatus] ?? statusConfig.DRAFT;
              return (
                <TableRow key={post.id} className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
                  <TableCell>
                    <Link href={`/dashboard/compose?postId=${post.id}`} className="font-medium text-foreground hover:underline">
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
                                  className={`size-2.5 rounded-sm ${platformColors[p.platform] ?? "bg-muted"} ring-1 ring-destructive/50`}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="mt-1 text-xs text-destructive">{p.error}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span
                            key={p.platform}
                            className={`size-2.5 rounded-sm ${platformColors[p.platform] ?? "bg-muted"}`}
                          />
                        )
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={cfg.variant}
                      className={cn("text-xs gap-1", cfg.className)}
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
                          className={`text-xs ${confidenceConfig[post.confidence].className}`}
                        >
                          {confidenceConfig[post.confidence].label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right text-xs text-muted-foreground">
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
      </CardContent>
    </Card>
  );
}
