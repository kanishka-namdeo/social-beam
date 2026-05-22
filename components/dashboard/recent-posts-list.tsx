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
import { CalendarDots, WarningCircle, CheckCircle, Spinner } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

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
  instagram: "bg-chart-1",
  facebook: "bg-chart-2",
  x: "bg-chart-3",
  linkedin: "bg-chart-4",
  tiktok: "bg-chart-5",
  pinterest: "bg-chart-1",
};

interface RecentPostsListProps {
  posts: Post[];
}

export function RecentPostsList({ posts }: RecentPostsListProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No posts yet. Create your first post to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Post</TableHead>
            <TableHead>Platforms</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => {
            const cfg = statusConfig[post.status] ?? statusConfig.DRAFT;
            return (
              <TableRow key={post.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link href={`/dashboard/compose?postId=${post.id}`} className="font-medium text-foreground hover:underline">
                    {post.title ?? "Untitled"}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    {post.platforms.map((p) => (
                      <TooltipProvider key={p.platform}>
                        <Tooltip>
                          <TooltipTrigger>
                            <span
                              className={`size-2.5 rounded-full ${platformColors[p.platform] ?? "bg-muted"}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs capitalize">{p.platform}</p>
                            {p.error && (
                              <p className="mt-1 text-xs text-destructive">{p.error}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
    </div>
  );
}
