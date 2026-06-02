"use client";

import { useMemo, useState } from "react";
import { format, isToday, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Image, MagnifyingGlass, CalendarDots, ArrowsDownUp, CheckCircle, WarningCircle, Spinner } from "@phosphor-icons/react/ssr";
import type { PostItem } from "./types";

interface ListViewProps {
  posts: PostItem[];
  connectedPlatforms: string[];
  onPreview: (postId: string) => void;
  onEdit: (postId: string) => void;
}

type SortField = "scheduledAt" | "title" | "status";
type SortDir = "asc" | "desc";

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-post-draft/10 text-post-draft border-post-draft/20",
    icon: <CalendarDots weight="bold" className="size-3" />,
  },
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-post-queued/10 text-post-queued border-post-queued/20",
    icon: <CalendarDots weight="bold" className="size-3" />,
  },
  PUBLISHING: {
    label: "Publishing",
    className: "bg-post-publishing/10 text-post-publishing border-post-publishing/20",
    icon: <Spinner weight="bold" className="size-3 animate-spin" />,
  },
  PUBLISHED: {
    label: "Published",
    className: "bg-post-published/10 text-post-published border-post-published/20",
    icon: <CheckCircle weight="bold" className="size-3" />,
  },
  FAILED: {
    label: "Failed",
    className: "bg-post-failed/10 text-post-failed border-post-failed/20",
    icon: <WarningCircle weight="bold" className="size-3" />,
  },
};

const platformColors: Record<string, string> = {
  instagram: "bg-preview-instagram",
  facebook: "bg-preview-facebook",
  x: "bg-preview-x",
  linkedin: "bg-preview-linkedin",
  tiktok: "bg-preview-tiktok",
  pinterest: "bg-preview-pinterest",
  threads: "bg-preview-threads",
  googleBusiness: "bg-preview-googleBusiness",
  youtube: "bg-preview-youtube",
  bluesky: "bg-preview-bluesky",
};

function SortIndicator({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ArrowsDownUp className="size-3 ml-1 opacity-40" />;
  return (
    <span className="ml-1 text-xs">
      {sortDir === "asc" ? "\u2191" : "\u2193"}
    </span>
  );
}

export function ListView({
  posts,
  connectedPlatforms,
  onPreview,
  onEdit,
}: ListViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("scheduledAt");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.title ?? "").toLowerCase().includes(q) ||
          (p.content ?? "").toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Platform filter
    if (platformFilter !== "all") {
      result = result.filter((p) => p.platforms.some((pl) => pl.platform === platformFilter));
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "scheduledAt") {
        const aDate = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const bDate = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        cmp = aDate - bDate;
      } else if (sortField === "title") {
        cmp = (a.title ?? "").localeCompare(b.title ?? "");
      } else if (sortField === "status") {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [posts, search, statusFilter, platformFilter, sortField, sortDir]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="PUBLISHING">Publishing</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>

        {connectedPlatforms.length > 0 && (
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {connectedPlatforms.map((p) => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-sm border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("title")}
              >
                Post <SortIndicator field="title" sortField={sortField} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("scheduledAt")}
              >
                Scheduled <SortIndicator field="scheduledAt" sortField={sortField} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("status")}
              >
                Status <SortIndicator field="status" sortField={sortField} sortDir={sortDir} />
              </TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead className="w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No posts found
                </TableCell>
              </TableRow>
            ) : (
              filteredPosts.map((post) => {
                const cfg = statusConfig[post.status] ?? statusConfig.DRAFT;
                const isOverdue = post.scheduledAt && isPast(new Date(post.scheduledAt)) && post.status === "DRAFT";

                return (
                  <TableRow key={post.id} className="cursor-pointer" onClick={() => onPreview(post.id)}>
                    <TableCell>
                      {post.media && post.media.length > 0 && (
                        <Image className="size-4 text-muted-foreground" weight="fill" alt="" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground truncate max-w-[300px]">
                          {post.title ?? "Untitled"}
                        </span>
                        {isOverdue && (
                          <span className="text-[0.625rem] text-destructive">Overdue</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {post.scheduledAt
                        ? isToday(new Date(post.scheduledAt))
                          ? `Today ${format(new Date(post.scheduledAt), "h:mm a")}`
                          : format(new Date(post.scheduledAt), "MMM d, h:mm a")
                        : "Not scheduled"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("normal-case gap-1", cfg.className)}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {post.platforms.map((p) => (
                          <span
                            key={p.platform}
                            className={cn(
                              "size-3 rounded-sm",
                              platformColors[p.platform] ?? "bg-muted",
                            )}
                            title={p.platform}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onPreview(post.id)}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onEdit(post.id)}
                        >
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Count */}
      <div className="text-xs text-muted-foreground">
        {filteredPosts.length} of {posts.length} posts
      </div>
    </div>
  );
}
