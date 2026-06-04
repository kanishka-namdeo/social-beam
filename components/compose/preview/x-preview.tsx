"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { renderRichText } from "@/lib/compose/preview-helpers";
import type { AccountInfo } from "./types";
import { MediaPreview } from "./media-preview";

interface XPreviewProps {
  content: string;
  account?: AccountInfo;
  mediaUrls?: string[];
}

export function XPreview({ content, account, mediaUrls }: XPreviewProps) {
  // Use account data or fall back to defaults
  const displayName = account?.platformUsername || "You";
  const handle = account?.platformUsername ? `@${account.platformUsername}` : "@yourhandle";
  const avatarSrc = account?.avatarUrl || "";
  const avatarFallback = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="w-full max-w-[550px] rounded-sm border border-border bg-card"
      role="img"
      aria-label="X/Twitter post preview"
    >
      {/* Author Header */}
      <div className="flex items-start gap-3 p-preview">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarSrc} alt={displayName} />
        <AvatarFallback className="bg-preview-x text-sm font-semibold text-white">
          {avatarFallback}
        </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">{displayName}</span>
            {account && (
              <svg
                className="h-4 w-4 text-preview-x"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{handle}</p>
        </div>
        {/* Verified badge already in header */}
      </div>

      {/* Post Body */}
      <div className="px-4 pb-4">
        {content.trim() === "" ? (
          <p className="text-sm text-muted-foreground">
            Start writing and your post will appear here..
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
            {renderRichText(content)}
          </p>
        )}
        {mediaUrls && mediaUrls.length > 0 && (
          <MediaPreview mediaUrls={mediaUrls} className="mt-3 rounded-lg overflow-hidden border border-border" />
        )}
      </div>

      <Separator className="bg-border" />

      {/* Engagement Bar */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>12:34 PM · May 21, 2026</span>
        </div>
        <Separator className="my-3 bg-border" />
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-preview-x transition-colors"
            aria-label="Reply"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>24</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-post-published transition-colors"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            <span>6</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>57</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-muted-foreground hover:text-brand transition-colors"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-brand transition-colors"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
