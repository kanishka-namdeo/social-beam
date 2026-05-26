"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  TrendUp,
  ChatText,
  Eye,
  CheckCircle,
  XCircle,
  ArrowClockwise,
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ActionHandoffDialog } from "./action-handoff-dialog";
import type { TrendingPost } from "@/lib/reddit/types";
import { getRelevanceBadgeClass, getRelevanceLabel, isAiAnalysisFailed } from "@/lib/reddit/types";
import { getActionIcon } from "@/lib/reddit/ui-helpers";

const POSTS_PER_PAGE = 20;

type SortField = "relevance" | "upvotes" | "comments" | "date";
type SortDirection = "asc" | "desc";
type RelevanceFilter = "all" | "high" | "medium" | "low";
type SentimentFilter = "all" | "positive" | "neutral" | "controversial";

interface TrendingTableProps {
  posts: TrendingPost[];
  hours: number;
}

function getSentimentBadgeClass(sentiment: string | null | undefined): string {
  switch (sentiment) {
    case "positive":
      return "bg-success/10 text-success border-success/20";
    case "controversial":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted/10 text-muted-foreground border-muted/20";
  }
}

function getRiskBadgeClass(risk: string | null | undefined): string {
  switch (risk) {
    case "high":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "medium":
      return "bg-warning/10 text-warning border-warning/20";
    default:
      return "bg-success/10 text-success border-success/20";
  }
}

export function TrendingTable({ posts, hours }: TrendingTableProps) {
  const [selectedPost, setSelectedPost] = useState<TrendingPost | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("relevance");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [relevanceFilter, setRelevanceFilter] = useState<RelevanceFilter>("all");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDismissed, setShowDismissed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [actingPostId, setActingPostId] = useState<string | null>(null);
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(new Set());
  const [localActed, setLocalActed] = useState<Set<string>>(new Set());

  const handleActionClick = useCallback((post: TrendingPost) => {
    setSelectedPost(post);
    setDialogOpen(true);
  }, []);

  const handlePostAction = useCallback(async (postId: string, action: "dismiss" | "undo-dismiss" | "mark-acted" | "unmark-acted") => {
    setActingPostId(postId);
    try {
      const res = await fetch(`/api/reddit/trending/${postId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "Failed to update post");
        return;
      }
      const json = await res.json();
      if (action === "dismiss") {
        setLocalDismissed((prev) => new Set(prev).add(postId));
        toast.success("Post dismissed");
      } else if (action === "undo-dismiss") {
        setLocalDismissed((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        toast.success("Post restored");
      } else if (action === "mark-acted") {
        setLocalActed((prev) => new Set(prev).add(postId));
        toast.success("Marked as acted on");
      } else if (action === "unmark-acted") {
        setLocalActed((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        toast.success("Unmarked");
      }
      if (selectedPost?.id === postId) {
        setSelectedPost((prev) => prev ? { ...prev, ...json.data } : null);
      }
    } catch {
      toast.error("Failed to update post");
    } finally {
      setActingPostId(null);
    }
  }, [selectedPost]);

  const filteredAndSortedPosts = useMemo(() => {
    const filtered = posts.filter((p) => {
      const isDismissed = localDismissed.has(p.id) || (p.dismissedAt != null);
      if (!showDismissed && isDismissed) return false;
      if (relevanceFilter !== "all" && p.relevanceScore != null) {
        if (relevanceFilter === "high" && p.relevanceScore < 0.7) return false;
        if (relevanceFilter === "medium" && (p.relevanceScore < 0.4 || p.relevanceScore >= 0.7)) return false;
        if (relevanceFilter === "low" && p.relevanceScore >= 0.4) return false;
      }
      if (sentimentFilter !== "all" && p.sentiment !== sentimentFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !(p.relevanceReason?.toLowerCase().includes(q))) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "relevance":
          comparison = (a.relevanceScore ?? 0) - (b.relevanceScore ?? 0);
          break;
        case "upvotes":
          comparison = a.upvotes - b.upvotes;
          break;
        case "comments":
          comparison = a.commentCount - b.commentCount;
          break;
        case "date":
          comparison = new Date(a.scrapedAt ?? a.id).getTime() - new Date(b.scrapedAt ?? b.id).getTime();
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

    return filtered;
  }, [posts, localDismissed, showDismissed, relevanceFilter, sentimentFilter, searchQuery, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredAndSortedPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );

  const dismissedCount = posts.filter((p) => localDismissed.has(p.id) || p.dismissedAt != null).length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Trending Posts</CardTitle>
              <CardDescription>
                {filteredAndSortedPosts.length} of {posts.length} posts from the last {hours} hours
                {dismissedCount > 0 && ` (${dismissedCount} dismissed)`}
              </CardDescription>
            </div>
            {dismissedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => setShowDismissed(!showDismissed)}
              >
                <Eye className="size-3.5" />
                {showDismissed ? "Hide dismissed" : `Show dismissed (${dismissedCount})`}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or reason..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 h-8"
              />
            </div>

            <Select
              value={sortField}
              onValueChange={(v) => {
                setSortField(v as SortField);
                setSortDirection(sortField === v ? (sortDirection === "asc" ? "desc" : "asc") : "desc");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-full sm:w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="upvotes">Upvotes</SelectItem>
                <SelectItem value="comments">Comments</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={relevanceFilter}
              onValueChange={(v) => {
                setRelevanceFilter(v as RelevanceFilter);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-full sm:w-[140px]">
                <SelectValue placeholder="Relevance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="high">High only</SelectItem>
                <SelectItem value="medium">Medium+</SelectItem>
                <SelectItem value="low">Low only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sentimentFilter}
              onValueChange={(v) => {
                setSentimentFilter(v as SentimentFilter);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-full sm:w-[140px]">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="controversial">Controversial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedPosts.length === 0 && posts.length > 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-12 text-center">
              <MagnifyingGlass className="size-8 text-muted-foreground" weight="light" />
              <p className="text-sm font-medium text-foreground">No trending posts match your filters</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Try adjusting your search or selecting different subreddits
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setRelevanceFilter("all");
                  setSentimentFilter("all");
                  setSortField("relevance");
                  setSortDirection("desc");
                  setCurrentPage(1);
                }}
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%] text-xs font-medium text-muted-foreground">Post</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Subreddit</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-brand transition-colors"
                          onClick={() => {
                            setSortField("upvotes");
                            setSortDirection(sortField === "upvotes" ? (sortDirection === "asc" ? "desc" : "asc") : "desc");
                          }}
                        >
                          <TrendUp className="size-3.5 transition-transform duration-150" weight="bold" />
                          Upvotes
                          {sortField === "upvotes" && (
                            <span className="inline-block transition-transform duration-150" style={{ transform: sortDirection === "asc" ? "rotate(180deg)" : "none" }}>
                              ↓
                            </span>
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ChatText className="size-3.5" weight="bold" />
                          Comments
                        </span>
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Sentiment</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Risk</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-brand transition-colors"
                          onClick={() => {
                            setSortField("relevance");
                            setSortDirection(sortField === "relevance" ? (sortDirection === "asc" ? "desc" : "asc") : "desc");
                          }}
                        >
                          Relevance
                          {sortField === "relevance" && (
                            <span className="inline-block transition-transform duration-150" style={{ transform: sortDirection === "asc" ? "rotate(180deg)" : "none" }}>
                              ↓
                            </span>
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Action</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPosts.map((post) => {
                  const isDismissed = localDismissed.has(post.id) || post.dismissedAt != null;
                  const isActed = localActed.has(post.id) || post.actedOnAt != null;

                  return (
                    <TableRow
                      key={post.id}
                      className={cn(
                        "transition-all duration-150",
                        isDismissed && "opacity-50",
                        isActed && "bg-success/5",
                      )}
                    >
                      <TableCell>
                        <div className="space-y-0.5">
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-foreground hover:underline line-clamp-2"
                          >
                            {post.title}
                          </a>
                          {post.relevanceReason && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {post.relevanceReason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        r/{post.subreddit}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-1 text-success">
                          <TrendUp className="size-3.5" weight="bold" />
                          {post.upvotes.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {post.commentCount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getSentimentBadgeClass(post.sentiment))}
                        >
                          {post.sentiment ?? "neutral"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getRiskBadgeClass(post.riskLevel))}
                        >
                          {post.riskLevel ?? "low"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {post.relevanceScore != null && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs cursor-help",
                              getRelevanceBadgeClass(post.relevanceScore, isAiAnalysisFailed(post.relevanceReason)),
                            )}
                            title={isAiAnalysisFailed(post.relevanceReason)
                              ? "AI analysis could not complete. Check your API configuration or credits."
                              : undefined}
                          >
                            {getRelevanceLabel(post.relevanceScore, isAiAnalysisFailed(post.relevanceReason))}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {post.suggestedAction ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 gap-1 text-foreground hover:text-brand"
                            onClick={() => handleActionClick(post)}
                          >
                            {getActionIcon(post.suggestedAction)}
                            <span className="text-xs">{post.suggestedAction}</span>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isActed ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-success"
                              title="Acted on"
                              onClick={() => handlePostAction(post.id, "unmark-acted")}
                              disabled={actingPostId === post.id}
                            >
                              <CheckCircle className="size-4" weight="fill" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              title="Mark as acted on"
                              onClick={() => handlePostAction(post.id, "mark-acted")}
                              disabled={actingPostId === post.id}
                            >
                              <CheckCircle className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("size-6", isDismissed ? "text-muted-foreground" : "")}
                            title={isDismissed ? "Undo dismiss" : "Dismiss"}
                            onClick={() => handlePostAction(post.id, isDismissed ? "undo-dismiss" : "dismiss")}
                            disabled={actingPostId === post.id}
                          >
                            {isDismissed ? (
                              <ArrowClockwise className="size-4" />
                            ) : (
                              <XCircle className="size-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        <CaretLeft className="size-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Next
                        <CaretRight className="size-4 ml-1" />
                      </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ActionHandoffDialog
        post={selectedPost}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDismiss={() => selectedPost && handlePostAction(selectedPost.id, "dismiss")}
        onMarkActed={() => selectedPost && handlePostAction(selectedPost.id, "mark-acted")}
      />
    </>
  );
}
