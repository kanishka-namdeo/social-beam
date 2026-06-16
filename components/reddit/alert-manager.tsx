"use client";

import { useCallback, useEffect, useState } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  X,
  PencilSimple,
  Trash,
  Bell,
  BellRinging,
} from "@phosphor-icons/react/ssr";
import { Skeleton } from "@/components/ui/skeleton";

interface RedditAlert {
  id: string;
  name: string;
  keywords: string[];
  subreddits: string[];
  minScore: number;
  minIntent: number | null;
  notifyOn: string[];
  enabled: boolean;
  createdAt: string;
  lastTriggered: string | null;
}

const NOTIFY_OPTIONS = [
  { value: "high_relevance", label: "High relevance" },
  { value: "high_intent", label: "High intent leads" },
  { value: "brand_mention", label: "Brand mentions" },
  { value: "competitor_mention", label: "Competitor mentions" },
];

interface AlertFormData {
  name: string;
  keywords: string[];
  keywordInput: string;
  subreddits: string[];
  subredditInput: string;
  minScore: number;
  minIntent: string;
  notifyOn: string[];
}

const emptyForm: AlertFormData = {
  name: "",
  keywords: [],
  keywordInput: "",
  subreddits: [],
  subredditInput: "",
  minScore: 50,
  minIntent: "",
  notifyOn: ["high_intent"],
};

export function AlertManager() {
  const [alerts, setAlerts] = useState<RedditAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<RedditAlert | null>(null);
  const [form, setForm] = useState<AlertFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/reddit/alerts");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch (err) {
      toast.error("Could not load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const openCreateDialog = () => {
    setEditingAlert(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (alert: RedditAlert) => {
    setEditingAlert(alert);
    setForm({
      name: alert.name,
      keywords: alert.keywords,
      keywordInput: "",
      subreddits: alert.subreddits,
      subredditInput: "",
      minScore: alert.minScore,
      minIntent: alert.minIntent?.toString() ?? "",
      notifyOn: alert.notifyOn,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Alert name is required");
      return;
    }
    if (form.keywords.length === 0) {
      toast.error("Add at least one keyword");
      return;
    }
    if (form.notifyOn.length === 0) {
      toast.error("Select at least one notification trigger");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        keywords: form.keywords,
        subreddits: form.subreddits,
        minScore: form.minScore,
        minIntent: form.minIntent ? parseInt(form.minIntent, 10) : null,
        notifyOn: form.notifyOn,
        enabled: editingAlert?.enabled ?? true,
      };

      const url = editingAlert ? `/api/reddit/alerts/${editingAlert.id}` : "/api/reddit/alerts";
      const method = editingAlert ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save alert");

      toast.success(editingAlert ? "Alert updated" : "Alert created");
      setDialogOpen(false);
      fetchAlerts();
    } catch {
      toast.error("Could not save alert");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/reddit/alerts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete alert");
      toast.success("Alert deleted");
      fetchAlerts();
    } catch {
      toast.error("Could not delete alert");
    }
  };

  const handleToggle = async (alert: RedditAlert) => {
    try {
      const res = await fetch(`/api/reddit/alerts/${alert.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !alert.enabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle alert");
      fetchAlerts();
    } catch {
      toast.error("Could not toggle alert");
    }
  };

  const addKeyword = () => {
    const kw = form.keywordInput.trim();
    if (!kw) return;
    if (form.keywords.includes(kw.toLowerCase())) {
      toast.error("Keyword already added");
      return;
    }
    setForm({ ...form, keywords: [...form.keywords, kw.toLowerCase()], keywordInput: "" });
  };

  const addSubreddit = () => {
    const sub = form.subredditInput.trim().replace(/^r\//, "");
    if (!sub) return;
    if (form.subreddits.includes(sub)) {
      toast.error("Subreddit already added");
      return;
    }
    setForm({ ...form, subreddits: [...form.subreddits, sub], subredditInput: "" });
  };

  const toggleNotifyOn = (value: string) => {
    setForm({
      ...form,
      notifyOn: form.notifyOn.includes(value)
        ? form.notifyOn.filter((v) => v !== value)
        : [...form.notifyOn, value],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Keyword Alerts</h3>
          <p className="text-xs text-muted-foreground">
            Get notified when Reddit discussions match your keywords
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="mr-1 h-4 w-4" />
          New alert
        </Button>
      </div>

      <Separator />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No alerts yet. Create one to monitor specific keywords across Reddit.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {alert.enabled ? (
                    <BellRinging className="h-4 w-4 text-primary" />
                  ) : (
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">
                    {alert.name}
                  </span>
                  {!alert.enabled && (
                    <Badge variant="outline" className="text-xs">
                      Paused
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {alert.keywords.slice(0, 5).map((kw) => (
                    <Badge key={kw} variant="secondary" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                  {alert.keywords.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{alert.keywords.length - 5}
                    </Badge>
                  )}
                </div>
                {alert.lastTriggered && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last triggered: {new Date(alert.lastTriggered).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Switch checked={alert.enabled} onCheckedChange={() => handleToggle(alert)} />
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(alert)}>
                  <PencilSimple className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(alert.id)}>
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAlert ? "Edit alert" : "Create alert"}</DialogTitle>
            <DialogDescription>
              Monitor Reddit discussions for keywords and get notified when they match.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="alert-name">Name</Label>
              <Input
                id="alert-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Competitor mentions"
              />
            </div>

            <div>
              <Label>Keywords</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={form.keywordInput}
                  onChange={(e) => setForm({ ...form, keywordInput: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  placeholder="Type keyword and press Enter"
                />
                <Button type="button" variant="secondary" size="sm" onClick={addKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {form.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {form.keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="gap-1">
                      {kw}
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, keywords: form.keywords.filter((k) => k !== kw) })
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Subreddits (optional)</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={form.subredditInput}
                  onChange={(e) => setForm({ ...form, subredditInput: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSubreddit();
                    }
                  }}
                  placeholder="e.g. marketing"
                />
                <Button type="button" variant="secondary" size="sm" onClick={addSubreddit}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {form.subreddits.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {form.subreddits.map((sub) => (
                    <Badge key={sub} variant="outline" className="gap-1">
                      r/{sub}
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, subreddits: form.subreddits.filter((s) => s !== sub) })
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="min-score">Min upvotes</Label>
                <Input
                  id="min-score"
                  type="number"
                  value={form.minScore}
                  onChange={(e) => setForm({ ...form, minScore: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="min-intent">Min intent score (optional)</Label>
                <Input
                  id="min-intent"
                  type="number"
                  value={form.minIntent}
                  onChange={(e) => setForm({ ...form, minIntent: e.target.value })}
                  placeholder="0-100"
                />
              </div>
            </div>

            <div>
              <Label>Notify me when</Label>
              <div className="mt-2 space-y-1">
                {NOTIFY_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.notifyOn.includes(opt.value)}
                      onChange={() => toggleNotifyOn(opt.value)}
                      className="rounded border-border"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editingAlert ? "Update alert" : "Create alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
