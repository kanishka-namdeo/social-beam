"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { MessageList } from "./message-list";
import { ReplyPanel } from "./reply-panel";
import { PlatformFilter } from "./platform-filter";
import { StatusTabs } from "./status-tabs";
import { EmptyInboxState } from "./empty-inbox-state";
import { Button } from "@/components/ui/button";
import { Spinner, ArrowClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";

interface InboxItem {
  id: string;
  platform: string;
  type: string;
  authorName: string | null;
  authorAvatar: string | null;
  content: string;
  parentContent: string | null;
  platformUrl: string | null;
  status: string;
  createdAt: string;
  sentiment: string | null;
  aiDraft: string | null;
}

interface InboxClientProps {
  initialItems: InboxItem[];
  connectedPlatforms: string[];
  initialUnreadCount: number;
}

export function InboxClient({ initialItems, connectedPlatforms, initialUnreadCount }: InboxClientProps) {
  const [items, setItems] = useState<InboxItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const hasSyncedRef = useRef(false);

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  const doFetch = useCallback(async (append = false) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedPlatform) params.set("platform", selectedPlatform);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (append && cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/inbox/messages?${params}`);
      if (!res.ok) return;

      const data = await res.json();
      if (append) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
      setUnreadCount(data.unreadCount);
    } catch {
      toast.error("Failed to load inbox");
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlatform, statusFilter, cursor]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/inbox/fetch", { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.totalNew > 0) {
        toast.success(`${data.totalNew} new engagement item${data.totalNew > 1 ? "s" : ""} synced`);
      } else {
        toast.info("No new engagement items found");
      }
      setCursor(null);
      // Fetch fresh items after sync
      await new Promise((resolve) => setTimeout(resolve, 100));
      setItems([]);
      doFetch();
    } catch {
      toast.error("Failed to sync engagement");
    } finally {
      setIsSyncing(false);
    }
  }, [doFetch]);

  const handleMarkRead = useCallback(async () => {
    if (!selectedId) return;
    try {
      await fetch("/api/inbox/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [selectedId], status: "READ" }),
      });
      setItems((prev) =>
        prev.map((i) => (i.id === selectedId ? { ...i, status: "READ" } : i))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      toast.error("Failed to mark as read");
    }
  }, [selectedId]);

  const handleReplySent = useCallback(() => {
    setItems((prev) =>
      prev.map((i) => (i.id === selectedId ? { ...i, status: "REPLIED" } : i))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    toast.success("Reply sent successfully");
  }, [selectedId]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      doFetch(true);
    }
  }, [hasMore, isLoading, doFetch]);

  // Fetch items when filters change
  useEffect(() => {
    setCursor(null);
    doFetch();
  }, [doFetch]);

  // Initial sync once on mount if empty
  useEffect(() => {
    if (initialItems.length === 0 && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      handleSync();
    }
  }, [initialItems.length, handleSync]);

  if (items.length === 0 && !isSyncing && !isLoading) {
    return <EmptyInboxState />;
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Left panel: Message list */}
      <div className="w-2/5 flex flex-col rounded-sm border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Inbox</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="text-xs"
            >
              {isSyncing ? (
                <Spinner className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <ArrowClockwise className="mr-1.5 size-3.5" />
              )}
              Sync
            </Button>
          </div>
          <PlatformFilter
            platforms={connectedPlatforms}
            selectedPlatform={selectedPlatform}
            onChange={setSelectedPlatform}
          />
          <StatusTabs status={statusFilter} unreadCount={unreadCount} onChange={setStatusFilter} />
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-hidden">
          <MessageList
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </div>
      </div>

      {/* Right panel: Reply detail */}
      <div className="flex-1 rounded-sm border border-border bg-card overflow-hidden">
        {selectedItem ? (
          <ReplyPanel
            item={selectedItem}
            onClose={() => setSelectedId(null)}
            onMarkRead={handleMarkRead}
            onReplySent={handleReplySent}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Select an engagement item to view details and reply.
          </div>
        )}
      </div>
    </div>
  );
}
