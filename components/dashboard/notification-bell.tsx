"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [hasNew, setHasNew] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Listen for custom notification events from other components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NotificationItem>).detail;
      setNotifications((prev) => [detail, ...prev]);
      setHasNew(true);
    };
    window.addEventListener("socialbeam-notification", handler);
    return () => window.removeEventListener("socialbeam-notification", handler);
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
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setHasNew(false);
    setIsOpen(false);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    setHasNew(false);
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
            "relative transition-all duration-150 active:scale-[0.98] hover-scale",
            hasNew && "text-brand",
          )}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          title="Notifications"
        >
          <Bell
            className={cn("size-5 transition-transform duration-200", hasNew && "animate-[bounce-short_0.3s_ease-out]")}
            weight={hasNew ? "fill" : "regular"}
          />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute right-1 top-1 min-w-[14px] rounded-sm bg-destructive px-1 text-[10px] font-semibold text-white transition-all duration-200",
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
              <Bell className="mx-auto mb-2 size-8 text-muted-foreground" weight="light" />
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
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.description}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Push a notification to the bell from anywhere in the app.
 * Usage: pushNotification({ title: "Post published", type: "success" })
 */
export function pushNotification(
  opts: Omit<NotificationItem, "id" | "timestamp" | "read">,
) {
  const notification: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
    read: false,
    ...opts,
  };
  window.dispatchEvent(new CustomEvent("socialbeam-notification", { detail: notification }));
}
