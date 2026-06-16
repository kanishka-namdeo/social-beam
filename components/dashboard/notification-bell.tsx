"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { migrateLocalStorageNotifications } from "@/lib/notifications/migrate-local-storage";

const POLL_INTERVAL_MS = 30_000;
const BROADCAST_CHANNEL = "socialbeam-notifications";

interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
  category?: string;
  actionUrl?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiNotification(n: any): NotificationItem {
  return {
    id: String(n.id),
    title: String(n.title),
    description: n.description ?? undefined,
    timestamp: new Date(n.createdAt),
    read: Boolean(n.read),
    type: n.type ?? "info",
    category: n.category ?? undefined,
    actionUrl: n.actionUrl ?? undefined,
  };
}

async function fetchNotifications(limit = 20) {
  const res = await fetch(`/api/notifications?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.status}`);
  const data = await res.json();
  return {
    notifications: (data.notifications ?? []).map(mapApiNotification) as NotificationItem[],
    nextCursor: data.nextCursor as string | undefined,
    unreadCount: data.unreadCount as number,
  };
}

async function fetchUnreadCount(signal?: AbortSignal) {
  const res = await fetch("/api/notifications?limit=1", { signal });
  if (!res.ok) return null;
  const data = await res.json();
  return data.unreadCount as number;
}

async function patchNotification(id: string, body: { read?: boolean; dismissed?: boolean }) {
  const res = await fetch(`/api/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function createNotificationApi(opts: {
  type: string;
  category: string;
  title: string;
  description?: string;
  actionUrl?: string;
}) {
  const res = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return mapApiNotification(data.notification);
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(BROADCAST_CHANNEL);
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNew, setHasNew] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [animateBadge, setAnimateBadge] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const mountedRef = useRef(true);
  const animateBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetchNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications(20);
      if (!mountedRef.current) return;
      setNotifications(data.notifications);
      setPrevUnreadCount((prev) => {
        setUnreadCount(data.unreadCount);
        if (data.unreadCount > prev && prev >= 0) {
          setAnimateBadge(true);
          if (animateBadgeTimerRef.current) {
            clearTimeout(animateBadgeTimerRef.current);
          }
          animateBadgeTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setAnimateBadge(false);
            animateBadgeTimerRef.current = null;
          }, 600);
        }
        return data.unreadCount;
      });
      if (data.unreadCount > 0) setHasNew(true);
    } catch {
      // API unavailable — keep existing state
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    mountedRef.current = true;
    refetchNotifications();

    // Migrate localStorage notifications to server (one-time)
    migrateLocalStorageNotifications().then(() => {
      // Refetch after migration to show migrated notifications
      if (mountedRef.current) {
        refetchNotifications();
      }
    });

    return () => {
      mountedRef.current = false;
      if (animateBadgeTimerRef.current) {
        clearTimeout(animateBadgeTimerRef.current);
      }
    };
  }, [refetchNotifications]);

  // Polling for new notifications
  useEffect(() => {
    const ac = new AbortController();

    pollRef.current = setInterval(() => {
      fetchUnreadCount(ac.signal).then((count) => {
        if (count === null || !mountedRef.current) return;
        setPrevUnreadCount((prev) => {
          setUnreadCount(count);
          if (count > prev && prev >= 0) {
            setAnimateBadge(true);
            if (animateBadgeTimerRef.current) {
              clearTimeout(animateBadgeTimerRef.current);
            }
            animateBadgeTimerRef.current = setTimeout(() => {
              if (mountedRef.current) setAnimateBadge(false);
              animateBadgeTimerRef.current = null;
            }, 600);
          }
          if (count > 0) setHasNew(true);
          else if (count === 0) setHasNew(false);
          return count;
        });
      }).catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => {
      ac.abort();
      clearInterval(pollRef.current);
      if (animateBadgeTimerRef.current) {
        clearTimeout(animateBadgeTimerRef.current);
      }
    };
  }, []);

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen) refetchNotifications();
  }, [isOpen, refetchNotifications]);

  // Cross-tab sync via BroadcastChannel
  useEffect(() => {
    const channel = getBroadcastChannel();
    channelRef.current = channel;
    if (!channel) return;

    channel.addEventListener("message", (e) => {
      if (e.data?.type === "new-notification" || e.data?.type === "state-changed") {
        refetchNotifications();
      }
    });

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [refetchNotifications]);

  // Listen for custom notification events from other components (backward compat)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NotificationItem>).detail;
      setNotifications((prev) => [detail, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);
      setHasNew(true);
      setAnimateBadge(true);
      if (animateBadgeTimerRef.current) {
        clearTimeout(animateBadgeTimerRef.current);
      }
      animateBadgeTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setAnimateBadge(false);
        animateBadgeTimerRef.current = null;
      }, 600);
    };
    window.addEventListener("socialbeam-notification", handler);
    return () => {
      window.removeEventListener("socialbeam-notification", handler);
      if (animateBadgeTimerRef.current) {
        clearTimeout(animateBadgeTimerRef.current);
      }
    };
  }, []);

  const [now, setNow] = useState(() => Date.now());

  // Refresh "now" every minute for relative time updates
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    patchNotification(id, { read: true }).catch(() => {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n)),
      );
      setUnreadCount((prev) => prev + 1);
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    setHasNew(false);
    setIsOpen(false);
    fetch("/api/notifications/batch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read" }),
    }).catch(() => {
      // Revert on failure — refetch from API
      refetchNotifications();
    });
  };

  const dismissNotification = (id: string) => {
    const wasUnread = notifications.find((n) => n.id === id && !n.read);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    patchNotification(id, { dismissed: true }).catch(() => {
      refetchNotifications();
    });
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    setHasNew(false);
    fetch("/api/notifications/batch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
    }).catch(() => {
      refetchNotifications();
    });
  };

  const typeIconColor: Record<string, string> = {
    info: "text-info",
    success: "text-success",
    warning: "text-warning",
    error: "text-destructive",
  };

  const relativeTime = (date: Date) => {
    const seconds = Math.floor((now - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "relative transition-all duration-[var(--duration-medium)] ease-[var(--ease-decelerate)] active:scale-[0.98] hover-scale",
            hasNew && "text-brand",
          )}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          title="Notifications"
        >
          <Bell
            className={cn(
              "size-5 transition-transform duration-[var(--duration-medium)] ease-[var(--ease-decelerate)]",
              hasNew && "animate-[bounce-short_0.3s_ease-out]",
            )}
            weight={hasNew ? "fill" : "regular"}
          />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute right-1 top-1 min-w-[14px] rounded-sm bg-destructive px-1 text-micro font-semibold text-white transition-all duration-[var(--duration-medium)] ease-[var(--ease-decelerate)]",
                animateBadge && "animate-[pulse_0.6s_ease-in-out]",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          {unreadCount === 0 && hasNew && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-sm bg-brand animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-0 animate-[scale-in_150ms_ease-out]"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-2 text-xs"
                >
                  Mark all read
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={clearAll}
                  className="size-8"
                  aria-label="Clear all notifications"
                >
                  <X className="size-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="mx-auto mb-2 size-8 text-muted-foreground animate-[pulse_2s_ease-in-out_infinite]" weight="light" />
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group px-4 py-3 transition-colors hover:bg-muted",
                    !notification.read && "bg-brand/5",
                  )}
                  onClick={() => markAsRead(notification.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") markAsRead(notification.id);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 h-2 w-2 shrink-0 rounded-sm",
                        !notification.read ? "bg-brand" : "bg-transparent",
                        typeIconColor[notification.type],
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      {notification.description && (
                        <p className="text-xs text-muted-foreground truncate-2">
                          {notification.description}
                        </p>
                      )}
                      <p className="mt-1 text-micro text-muted-foreground">
                        {relativeTime(notification.timestamp)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                      aria-label="Dismiss notification"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-2">
          <a
            href="/notifications"
            className="block w-full rounded-sm px-2 py-1.5 text-center text-xs font-medium text-brand transition-colors hover:bg-brand/10"
          >
            View all notifications
          </a>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Push a notification to the bell from anywhere in the app.
 * Usage: pushNotification({ title: "Post published", type: "success" })
 */
export function pushNotification(
  opts: Omit<NotificationItem, "id" | "timestamp"> & { read?: boolean },
) {
  const category = opts.category ?? "custom";

  // Persist via API — the real notification data comes back with a real UUID
  createNotificationApi({
    type: opts.type,
    category,
    title: opts.title,
    description: opts.description,
    actionUrl: opts.actionUrl,
  }).then((created) => {
    if (!created) return;
    // Broadcast to all tabs (including this one) with the real notification
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ type: "new-notification", notification: created });
      channel.close();
    }
  });
}
