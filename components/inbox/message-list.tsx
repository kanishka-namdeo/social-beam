"use client";

import { EngagementItemCard } from "./engagement-item-card";

interface MessageListProps {
  items: Array<{
    id: string;
    platform: string;
    type: string;
    authorName: string | null;
    content: string;
    parentContent: string | null;
    status: string;
    createdAt: Date | string;
    sentiment: string | null;
    aiDraft: string | null;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}

export function MessageList({ items, selectedId, onSelect, onLoadMore, hasMore }: MessageListProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No engagement items match your filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {items.map((item) => (
          <EngagementItemCard
            key={item.id}
            item={item}
            isSelected={selectedId === item.id}
            onClick={() => onSelect(item.id)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="p-3 border-t border-border">
          <button
            type="button"
            onClick={onLoadMore}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
