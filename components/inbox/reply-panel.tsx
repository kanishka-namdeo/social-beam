"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReplyComposer } from "./reply-composer";
import { ArrowSquareOut, X, Check, Eye } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";

interface ReplyPanelProps {
  item: {
    id: string;
    platform: string;
    type: string;
    authorName: string | null;
    authorAvatar: string | null;
    content: string;
    parentContent: string | null;
    platformUrl: string | null;
    status: string;
    createdAt: Date | string;
    aiDraft: string | null;
  };
  onClose: () => void;
  onMarkRead: () => void;
  onReplySent: () => void;
}

export function ReplyPanel({ item, onClose, onMarkRead, onReplySent }: ReplyPanelProps) {
  const timeStr = typeof item.createdAt === "string" ? new Date(item.createdAt) : item.createdAt;

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="border-b border-border flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">
                {item.authorName ?? "Unknown"}
              </span>
              <Badge variant="outline" className="rounded-sm text-xs">
                {item.type.toLowerCase()}
              </Badge>
              {item.status === "UNREAD" && (
                <Badge variant="outline" className="rounded-sm text-xs text-brand border-brand/50">
                  New
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(timeStr, { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {item.platformUrl && (
              <Button variant="ghost" size="icon" asChild>
                <a href={item.platformUrl} target="_blank" rel="noopener noreferrer">
                  <ArrowSquareOut className="size-4" />
                </a>
              </Button>
            )}
            {item.status === "UNREAD" && (
              <Button variant="ghost" size="sm" onClick={onMarkRead}>
                <Eye className="mr-1 size-3.5" />
                Mark read
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        {item.parentContent && (
          <div className="rounded-sm bg-muted p-3">
            <p className="text-xs text-muted-foreground mb-1">Original post:</p>
            <p className="text-sm text-foreground">{item.parentContent}</p>
          </div>
        )}

        <div className="rounded-sm bg-card p-3 border border-border">
          <p className="text-sm text-foreground whitespace-pre-wrap">{item.content}</p>
        </div>

        {item.status !== "REPLIED" && item.status !== "DISMISSED" && (
          <div className="border-t border-border pt-4">
            <ReplyComposer
              engagementItemId={item.id}
              platform={item.platform}
              onReplySent={onReplySent}
            />
          </div>
        )}

        {item.status === "REPLIED" && (
          <div className="rounded-sm border border-success/30 bg-success/5 p-4 text-center">
            <Check className="mx-auto mb-2 size-6 text-success" weight="bold" />
            <p className="text-sm font-medium text-success">Reply sent</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your response has been published.
            </p>
          </div>
        )}
      </CardContent>
    </div>
  );
}
