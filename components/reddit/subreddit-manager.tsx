"use client";

import { useCallback, useState } from "react";
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
import { Plus, X, Gear } from "@phosphor-icons/react/ssr";
import { Skeleton } from "@/components/ui/skeleton";

interface SubredditConfig {
  id: string;
  subreddit: string;
  sortOrder: string;
  isActive: boolean;
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

export function SubredditManager() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [configs, setConfigs] = useState<SubredditConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSort, setNewSort] = useState("hot");
  const [saving, setSaving] = useState(false);

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
          {/* Add new */}
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

          {/* Suggestions */}
          {configs.length < 3 && (
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
                      className="cursor-pointer hover:bg-brand/5 hover:border-brand/30 rounded-md"
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
                  className="flex items-center justify-between rounded-md border border-border bg-card p-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
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
                      className="flex items-center justify-between rounded-md border border-border bg-card p-2.5"
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
                      className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-2.5 opacity-60"
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
