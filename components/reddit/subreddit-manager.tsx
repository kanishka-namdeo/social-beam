"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  X,
  Gear,
  MagnifyingGlass,
  Users,
  Sparkle,
  CheckCircle,
} from "@phosphor-icons/react/ssr";
import { Skeleton } from "@/components/ui/skeleton";

interface SubredditSearchResult {
  name: string;
  title: string;
  description: string;
  subscribers?: number;
  activeUsers?: number;
}

interface SubredditConfig {
  id: string;
  subreddit: string;
  sortOrder: string;
  isActive: boolean;
}

interface SubredditRecommendation {
  subreddit: string;
  relevanceScore: number;
  reason: string;
  category: "industry" | "audience" | "goals" | "competitors";
  isTracked: boolean;
}

const COMMON_SUBREDDITS = [
  "marketing",
  "socialmedia",
  "entrepreneur",
  "smallbusiness",
  "startups",
  "digitalmarketing",
  "contentmarketing",
  "socialmediamarketing",
  "growthhacking",
  "seo",
  "ppc",
  "analytics",
  "branding",
  "copywriting",
  "freelance",
];

function getRelevanceBadgeColor(score: number): string {
  if (score >= 0.7) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (score >= 0.4) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-muted text-muted-foreground border-border";
}

function getRelevanceLabel(score: number): string {
  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
}

export interface SubredditManagerProps {
  dialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
  onRecommendationCountChange?: (count: number) => void;
}

export function SubredditManager({ dialogOpen, onDialogOpenChange, onRecommendationCountChange }: SubredditManagerProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = dialogOpen !== undefined ? dialogOpen : internalOpen;
  const setOpen = onDialogOpenChange !== undefined ? onDialogOpenChange : setInternalOpen;
  const [configs, setConfigs] = useState<SubredditConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSort, setNewSort] = useState("hot");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SubredditSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [validating, setValidating] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Recommendation state
  const [recommendations, setRecommendations] = useState<SubredditRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [addingRecommendation, setAddingRecommendation] = useState<string | null>(null);

  const refreshPage = useCallback(() => {
    router.refresh();
  }, [router]);

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/reddit/subreddit");
      if (!res.ok) return;
      const json = await res.json();
      setConfigs(json.data ?? []);
    } catch {
      // silent — will show empty state
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setLoading(true);
      void fetchConfigs();
      void fetchRecommendations();
    }
  };

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const res = await fetch("/api/reddit/subreddits/recommend");
      if (!res.ok) {
        setRecommendations([]);
        onRecommendationCountChange?.(0);
        return;
      }
      const json = await res.json();
      const recs = json.data?.recommendations ?? [];
      setRecommendations(recs);
      onRecommendationCountChange?.(recs.length);
    } catch {
      setRecommendations([]);
      onRecommendationCountChange?.(0);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleAddRecommendation = async (rec: SubredditRecommendation) => {
    if (rec.isTracked) return;
    setAddingRecommendation(rec.subreddit);
    try {
      const res = await fetch("/api/reddit/subreddit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subreddit: rec.subreddit, sortOrder: "hot" }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Now tracking r/${rec.subreddit}`);
        await fetchConfigs();
        await fetchRecommendations();
        refreshPage();
      } else if (res.status === 409) {
        toast.info(json.error ?? "Already tracked");
        await fetchRecommendations();
      } else {
        toast.error(json.error ?? "Failed to add subreddit");
      }
    } catch {
      toast.error("Failed to add subreddit");
    } finally {
      setAddingRecommendation(null);
    }
  };

  const handleAdd = async () => {
    const trimmed = newName.trim().toLowerCase().replace(/^r\//, "");
    if (!trimmed) {
      toast.error("Enter a subreddit name");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/reddit/subreddit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subreddit: trimmed, sortOrder: newSort }),
      });
      const json = await res.json();

      if (res.ok) {
        toast.success(`Now tracking r/${trimmed}`);
        setNewName("");
        await fetchConfigs();
        refreshPage();
      } else {
        toast.error(json.error ?? "Failed to add subreddit");
      }
    } catch {
      toast.error("Failed to add subreddit");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (config: SubredditConfig) => {
    try {
      const res = await fetch("/api/reddit/subreddit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: config.id, isActive: !config.isActive }),
      });
      if (res.ok) {
        await fetchConfigs();
      }
    } catch {
      toast.error("Failed to update subreddit");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/reddit/subreddit?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Stopped tracking r/${name}`);
        await fetchConfigs();
      }
    } catch {
      toast.error("Failed to remove subreddit");
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(() => {
      searchAbortRef.current = new AbortController();
      const controller = searchAbortRef.current;

      const doSearch = async () => {
        setSearching(true);
        setSearchError(null);
        try {
          const excludeList = configs.map((c) => c.subreddit).join(",");
          const res = await fetch(
            `/api/reddit/subreddits/search?q=${encodeURIComponent(trimmed)}&exclude=${encodeURIComponent(excludeList)}`,
            { signal: controller.signal }
          );
          if (!res.ok) {
            const json = await res.json();
            if (res.status === 429) {
              setSearchError(json.error ?? "Rate limited");
            } else {
              setSearchError(json.error ?? "Search failed");
            }
            return;
          }
          const json = await res.json();
          setSearchResults(json.data?.results ?? []);
        } catch {
          if (!controller.signal.aborted) {
            setSearchError("Search failed");
          }
        } finally {
          setSearching(false);
        }
      };

      void doSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, configs]);

  const handleAddFromSearch = async (name: string) => {
    setValidating(name);
    try {
      const validateRes = await fetch(`/api/reddit/subreddits/validate?name=${encodeURIComponent(name)}`);
      if (!validateRes.ok) {
        const json = await validateRes.json();
        toast.error(json.error ?? "Validation failed");
        return;
      }
      const validateJson = await validateRes.json();
      if (!validateJson.data?.exists) {
        toast.error(`r/${name} doesn't exist`);
        return;
      }

      const res = await fetch("/api/reddit/subreddit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subreddit: name, sortOrder: "hot" }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Now tracking r/${name}`);
        await fetchConfigs();
        refreshPage();
      } else if (res.status === 409) {
        toast.info(json.error ?? "Already tracked");
      } else {
        toast.error(json.error ?? "Failed to add subreddit");
      }
    } catch {
      toast.error("Failed to add subreddit");
    } finally {
      setValidating(null);
    }
  };

  const activeConfigs = configs.filter((c) => c.isActive);
  const inactiveConfigs = configs.filter((c) => !c.isActive);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Gear className="size-4" weight="bold" />
          Manage Subreddits
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Subreddits</DialogTitle>
          <DialogDescription>
            Add subreddits to track for trending content analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Brand Recommendations */}
          {loadingRecommendations ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkle className="size-4 text-brand animate-pulse" weight="fill" />
                <Label className="text-xs text-muted-foreground">Finding recommendations...</Label>
              </div>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-sm border border-border bg-muted/20 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkle className="size-4 text-brand" weight="fill" />
                <Label className="text-sm font-medium">Recommended for your brand</Label>
                <Badge variant="secondary" className="text-xs">
                  {recommendations.length}
                </Badge>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto rounded-sm border border-border bg-muted/20">
                {recommendations.map((rec) => {
                  const isAdding = addingRecommendation === rec.subreddit;
                  return (
                    <div
                      key={rec.subreddit}
                      className="flex items-start justify-between p-3 hover:bg-muted/40 transition-colors border-b border-border last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">
                            r/{rec.subreddit}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getRelevanceBadgeColor(rec.relevanceScore)}`}
                          >
                            {getRelevanceLabel(rec.relevanceScore)}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {rec.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {rec.reason}
                        </p>
                      </div>
                      <div className="ml-2 shrink-0">
                        {rec.isTracked ? (
                          <div className="flex items-center gap-1 text-xs text-emerald-500 h-7 px-2">
                            <CheckCircle className="size-3" weight="bold" />
                            Tracked
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isAdding}
                            onClick={() => handleAddRecommendation(rec)}
                            className="h-7 text-xs gap-1"
                          >
                            {isAdding ? (
                              <>
                                <MagnifyingGlass className="size-3 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Plus className="size-3" weight="bold" />
                                Add
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Add subreddit</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  r/
                </span>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="marketing"
                  className="pl-7"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                />
              </div>
              <Select value={newSort} onValueChange={setNewSort}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="rising">Rising</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={saving || !newName.trim()}>
                <Plus className="size-4" weight="bold" />
              </Button>
            </div>
          </div>

          {/* Search Reddit */}
          <div className="space-y-2">
            <Label>Search Reddit</Label>
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search communities (e.g. marketing, AI, startups)"
                className="pl-9"
              />
            </div>

            {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
              <p className="text-xs text-muted-foreground">Type 3+ characters to search</p>
            )}

            {searching && (
              <div className="space-y-2 py-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-sm border border-border bg-muted/20 p-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-7 w-14" />
                  </div>
                ))}
              </div>
            )}

            {searchError && !searching && (
              <div className="rounded-sm border border-warning/20 bg-warning/5 p-3 text-xs text-muted-foreground">
                {searchError}
              </div>
            )}

            {searchResults.length > 0 && !searching && (
              <div className="space-y-1 max-h-48 overflow-y-auto rounded-sm border border-border bg-muted/20">
                {searchResults.map((result) => {
                  const isAdding = validating === result.name;
                  return (
                    <div
                      key={result.name}
                      className="flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          r/{result.name}
                        </p>
                        {result.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {result.description}
                          </p>
                        )}
                        {result.subscribers != null && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Users className="size-3" />
                            {result.subscribers >= 1000
                              ? `${(result.subscribers / 1000).toFixed(1)}k`
                              : result.subscribers.toLocaleString()}{" "}
                            members
                            {result.activeUsers != null
                              ? ` · ${(result.activeUsers / 1000).toFixed(1)}k online`
                              : ""}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isAdding}
                        onClick={() => handleAddFromSearch(result.name)}
                        className="ml-2 shrink-0 h-7 text-xs gap-1"
                      >
                        {isAdding ? (
                          <>
                            <MagnifyingGlass className="size-3 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="size-3" weight="bold" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {!searching &&
              searchQuery.trim().length >= 3 &&
              searchResults.length === 0 &&
              !searchError && (
                <p className="text-xs text-muted-foreground">
                  No communities found for &quot;{searchQuery.trim()}&quot;. Try a different term.
                </p>
              )}
          </div>

          {/* Suggestions - only show popular subreddits when few configs and no brand recs */}
          {configs.length < 3 && recommendations.length === 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Popular subreddits to track</Label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SUBREDDITS.filter(
                  (s) => !configs.some((c) => c.subreddit === s)
                )
                  .slice(0, 8)
                  .map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="cursor-pointer hover:bg-brand/5 hover:border-brand/30 rounded-sm"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/reddit/subreddit", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ subreddit: s, sortOrder: "hot" }),
                          });
                          const json = await res.json();
                          if (res.ok) {
                            toast.success(`Now tracking r/${s}`);
                            await fetchConfigs();
                            refreshPage();
                          } else if (res.status === 409) {
                            toast.info(json.error ?? "Already tracked");
                          } else {
                            toast.error(json.error ?? "Failed to add subreddit");
                          }
                        } catch {
                          toast.error("Failed to add subreddit");
                        }
                      }}
                    >
                      + r/{s}
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Active list */}
          {loading ? (
            <div className="space-y-2 py-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-sm border border-border bg-card p-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-10 rounded-sm" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-sm" />
                </div>
              ))}
            </div>
          ) : activeConfigs.length === 0 && inactiveConfigs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No subreddits tracked yet. Add one above to get started.
            </p>
          ) : (
            <div className="space-y-1">
              {activeConfigs.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground">Active</p>
                  {activeConfigs.map((cfg) => (
                    <div
                      key={cfg.id}
                      className="flex items-center justify-between rounded-sm border border-border bg-card p-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={cfg.isActive}
                          onCheckedChange={() => handleToggle(cfg)}
                          aria-label={`Toggle r/${cfg.subreddit}`}
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">r/{cfg.subreddit}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            Sort: {cfg.sortOrder}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cfg.id, cfg.subreddit)}
                        className="size-8 p-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove r/${cfg.subreddit}`}
                      >
                        <X className="size-4" weight="bold" />
                      </Button>
                    </div>
                  ))}
                </>
              )}

              {inactiveConfigs.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground mt-3">Inactive</p>
                  {inactiveConfigs.map((cfg) => (
                    <div
                      key={cfg.id}
                      className="flex items-center justify-between rounded-sm border border-border bg-muted/30 p-2.5 opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={cfg.isActive}
                          onCheckedChange={() => handleToggle(cfg)}
                          aria-label={`Toggle r/${cfg.subreddit}`}
                        />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">r/{cfg.subreddit}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            Sort: {cfg.sortOrder}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cfg.id, cfg.subreddit)}
                        className="size-8 p-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove r/${cfg.subreddit}`}
                      >
                        <X className="size-4" weight="bold" />
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
