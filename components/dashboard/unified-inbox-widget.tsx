"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ChatText, ArrowRight, Envelope, WarningCircle } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

interface InboxMessage {
  id: string;
  platform: string;
  type: "comment" | "dm" | "mention";
  content: string;
  author: string;
  timestamp: string;
  isRead: boolean;
}

interface UnifiedInboxWidgetProps {
  messages: InboxMessage[];
  unreadCount: number;
  size?: WidgetSizeToken;
}

const typeIcons = {
  comment: ChatText,
  dm: Envelope,
  mention: WarningCircle,
};

const platformColors: Record<string, string> = {
  instagram: "bg-preview-instagram",
  facebook: "bg-preview-facebook",
  x: "bg-preview-x",
  linkedin: "bg-preview-linkedin",
  tiktok: "bg-preview-tiktok",
  pinterest: "bg-preview-pinterest",
};

export function UnifiedInboxWidget({
  messages,
  unreadCount,
  size = "5x3",
}: UnifiedInboxWidgetProps) {
  const { isCompact, isWide, rows } = getSizeDerivatives(size);
  const maxMessages = rows <= 2 && !isWide ? 3 : isCompact ? 2 : isWide ? 4 : 5;
  const displayMessages = messages.slice(0, maxMessages);

  return (
    <BaseWidget
      size={size as WidgetSizeToken}
      isEmpty={messages.length === 0}
      emptyState={{
        icon: <ChatText weight="light" />,
        message: "No messages yet",
        description: "Comments, DMs, and mentions will appear here.",
        cta: {
          label: "Open Inbox",
          href: "/dashboard/inbox",
        },
      }}
      header={{
        title: isCompact ? "" : "Unified Inbox",
        icon: <ChatText weight="bold" />,
        action: unreadCount > 0 ? (
          <Badge variant="destructive" className="text-micro rounded-sm">
            {unreadCount} unread
          </Badge>
        ) : undefined,
      }}
      isLoading={false}
    >
        <>
          <div className={cn("grid gap-control", isWide ? "grid-cols-2" : "grid-cols-1")}>
            {displayMessages.map((message) => {
              const Icon = typeIcons[message.type];
              return (
                <Link
                  key={message.id}
                  href={`/dashboard/inbox/${message.id}`}
                  className={cn(
                    "flex items-start gap-section rounded-sm border p-card hover:bg-hover-surface transition-colors",
                    message.isRead
                      ? "border-subtle bg-surface-1"
                      : "border-brand bg-brand-soft"
                  )}
                >
                  <div className="flex flex-col gap-tight shrink-0">
                    <span className={cn(
                      "size-2 rounded-sm",
                      platformColors[message.platform] ?? "bg-muted"
                    )} />
                    <Icon className="size-4 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-control">
                      <span className="text-body font-medium text-foreground truncate">
                        {message.author}
                      </span>
                      <span className="text-caption text-muted-foreground capitalize">
                        {message.platform}
                      </span>
                    </div>
                    {!isCompact && (
                      <p className="text-caption text-muted-foreground line-clamp-2 mt-1">
                        {message.content}
                      </p>
                    )}
                    <span className="text-caption text-muted-foreground mt-1 tabular-nums">
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </span>
                  </div>

                  {!message.isRead && (
                    <span className="size-2 rounded-sm bg-brand shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>

          {messages.length > maxMessages && (
            <div className="mt-panel flex justify-end">
              <Link
                href="/dashboard/inbox"
                className="flex items-center gap-tight text-caption text-muted-foreground hover:text-foreground transition-colors"
              >
                View all messages
                <ArrowRight className="size-3" weight="bold" />
              </Link>
            </div>
          )}
        </>
    </BaseWidget>
  );
}
