"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  Info,
  CheckCircle,
  Warning,
  XCircle,
  X,
  Trash,
  EnvelopeSimple,
  Envelope,
  ArrowSquareOut,
  Check,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  category: string;
  title: string;
  description?: string;
  actionUrl?: string;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
}

type ReadFilter = "all" | "unread";
type CategoryFilter = "all" | "post_publish" | "engagement" | "system" | "billing" | "ai_insight" | "connection" | "brand";

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: "All Categories",
  post_publish: "Post Publish",
  engagement: "Engagement",
  system: "System",
  billing: "Billing",
  ai_insight: "AI Insights",
  connection: "Connections",
  brand: "Brand",
};

function TypeIcon({ type, className }: { type: Notification["type"]; className?: string }) {
  switch (type) {
    case "info":
      return <Info weight="fill" className={cn("text-blue-500", className)} />;
    case "success":
      return <CheckCircle weight="fill" className={cn("text-green-500", className)} />;
    case "warning":
      return <Warning weight="fill" className={cn("text-yellow-500", className)} />;
    case "error":
      return <XCircle weight="fill" className={cn("text-red-500", className)} />;
  }
}

function relativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function NotificationItem({
  notification,
  onMarkRead,
  onMarkUnread,
  onDismiss,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDismiss: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 border-b border-border/50 px-4 py-3 transition-colors hover:bg-muted/50",
        !notification.read && "bg-brand/5"
      )}
    >
      <div className="mt-0.5 shrink-0">
        <TypeIcon type={notification.type} className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              notification.read ? "text-foreground/80" : "font-medium text-foreground"
            )}
          >
            {notification.title}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {relativeTime(notification.createdAt)}
          </span>
        </div>

        {notification.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {notification.description}
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {CATEGORY_LABELS[notification.category as CategoryFilter] ?? notification.category}
          </Badge>

          {notification.actionUrl && (
            <a
              href={notification.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
            >
              View <ArrowSquareOut className="size-3" />
            </a>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {notification.read ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onMarkUnread(notification.id)}
            aria-label="Mark as unread"
            title="Mark as unread"
          >
            <Envelope className="size-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onMarkRead(notification.id)}
            aria-label="Mark as read"
            title="Mark as read"
          >
            <EnvelopeSimple className="size-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onDismiss(notification.id)}
          aria-label="Dismiss"
          title="Dismiss"
        >
          <X className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onDelete(notification.id)}
          aria-label="Delete"
          title="Delete"
          className="text-destructive hover:text-destructive"
        >
          <Trash className="size-4" />
        </Button>
      </div>

      {!notification.read && (
        <span className="absolute left-1 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-brand" />
      )}
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 border-b border-border/50 px-4 py-3">
      <Skeleton className="mt-0.5 size-5 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const fetchNotifications = useCallback(
    async (cursor?: string, append = false) => {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({ limit: "20" });
        if (cursor) params.set("cursor", cursor);
        if (readFilter === "unread") params.set("read", "false");
        if (categoryFilter !== "all") params.set("category", categoryFilter);

        const res = await fetch(`/api/notifications?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();
        const newNotifications = data.notifications as Notification[];

        if (append) {
          setNotifications((prev) => [...prev, ...newNotifications]);
        } else {
          setNotifications(newNotifications);
        }

        setNextCursor(data.nextCursor);
        setUnreadCount(data.unreadCount);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [readFilter, categoryFilter]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      const channel = new BroadcastChannel("socialbeam-notifications");
      channel.postMessage({ type: "state-changed" });
      channel.close();
    } catch {
      fetchNotifications();
    }
  };

  const handleMarkUnread = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: false } : n))
    );
    setUnreadCount((prev) => prev + 1);

    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: false }),
      });
      const channel = new BroadcastChannel("socialbeam-notifications");
      channel.postMessage({ type: "state-changed" });
      channel.close();
    } catch {
      fetchNotifications();
    }
  };

  const handleDismiss = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: true }),
      });
      const channel = new BroadcastChannel("socialbeam-notifications");
      channel.postMessage({ type: "state-changed" });
      channel.close();
    } catch {
      fetchNotifications();
    }
  };

  const handleDelete = async (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (notif && !notif.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      const channel = new BroadcastChannel("socialbeam-notifications");
      channel.postMessage({ type: "state-changed" });
      channel.close();
    } catch {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await fetch("/api/notifications/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read" }),
      });
      const channel = new BroadcastChannel("socialbeam-notifications");
      channel.postMessage({ type: "state-changed" });
      channel.close();
    } catch {
      fetchNotifications();
    }
  };

  const handleClearAll = async () => {
    setNotifications([]);
    setUnreadCount(0);

    try {
      await fetch("/api/notifications/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      const channel = new BroadcastChannel("socialbeam-notifications");
      channel.postMessage({ type: "state-changed" });
      channel.close();
    } catch {
      fetchNotifications();
    }
  };

  const handleDeleteAll = async () => {
    setNotifications([]);
    setUnreadCount(0);

    try {
      await fetch("/api/notifications/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      });
      const channel = new BroadcastChannel("socialbeam-notifications");
      channel.postMessage({ type: "state-changed" });
      channel.close();
    } catch {
      fetchNotifications();
    }
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchNotifications(nextCursor, true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="stagger-1 flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Stay updated with your account activity and alerts.
        </p>
      </div>

      <div className="stagger-2 space-y-4">
        <Tabs
          value={readFilter}
          onValueChange={(v) => setReadFilter(v as ReadFilter)}
          className="w-full"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="all">
                All
                {unreadCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 min-w-[18px] justify-center text-[10px] px-1"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
            </TabsList>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/30"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </Tabs>

        <div className="rounded-sm border border-border/60 bg-card">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
            <span className="text-xs text-muted-foreground">
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleMarkAllRead}
                  className="gap-1"
                >
                  <Check className="size-3.5" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleClearAll}
                  >
                    Clear all
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleDeleteAll}
                    className="text-destructive hover:text-destructive"
                  >
                    Delete all
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="min-h-[200px]">
            {loading ? (
              <div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <NotificationSkeleton key={i} />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                icon={<Bell className="size-12" weight="light" />}
                title="No notifications"
                description={
                  readFilter === "unread"
                    ? "You're all caught up! No unread notifications."
                    : "When you receive notifications, they'll appear here."
                }
                className="py-12"
              />
            ) : (
              <>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onMarkUnread={handleMarkUnread}
                    onDismiss={handleDismiss}
                    onDelete={handleDelete}
                  />
                ))}
                {loadingMore && (
                  <div>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <NotificationSkeleton key={i} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {nextCursor && !loading && notifications.length > 0 && (
            <div className="border-t border-border/50 p-3 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
