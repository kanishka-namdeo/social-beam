"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { renderRichText } from "@/lib/compose/preview-helpers";
import type { AccountInfo } from "./types";
import { MediaPreview } from "./media-preview";

interface FacebookPreviewProps {
  content: string;
  account?: AccountInfo;
  mediaUrls?: string[];
}

export function FacebookPreview({ content, account, mediaUrls }: FacebookPreviewProps) {
  // Use account data or fall back to defaults
  const displayName = account?.platformUsername || "You";
  const avatarSrc = account?.avatarUrl || "";
  const avatarFallback = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="w-full max-w-[500px] rounded-sm border border-border bg-card shadow-sm"
      role="img"
      aria-label="Facebook post preview"
    >
      {/* Author Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarSrc} alt={displayName} />
            <AvatarFallback className="bg-preview-facebook text-sm font-semibold text-white">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>2h</span>
              <span>·</span>
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM3.5 8a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0z" />
              </svg>
            </div>
          </div>
        </div>
        <button type="button" className="rounded-sm p-1.5 text-muted-foreground hover:bg-muted transition-colors" aria-label="More options">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="6" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="18" cy="12" r="2" />
          </svg>
        </button>
      </div>

      {/* Post Body */}
      <div className="px-4 py-2">
        {content.trim() === "" ? (
          <p className="text-sm text-muted-foreground">
            What&apos;s on your mind?
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
            {renderRichText(content)}
          </p>
        )}
        {mediaUrls && mediaUrls.length > 0 && (
          <MediaPreview mediaUrls={mediaUrls} className="mt-3 rounded-sm overflow-hidden" />
        )}
      </div>

      <Separator className="bg-border" />

      {/* Reactions Summary */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-preview-facebook text-[10px] text-white">
              
            </span>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px]">
              ❤️
            </span>
          </div>
          <span>57</span>
        </div>
        <div className="flex items-center gap-3">
          <span>24 comments</span>
          <span>6 shares</span>
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Action Buttons */}
      <div className="flex items-center justify-around px-4 py-1">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
            <path d="M7 22h11" />
          </svg>
          <span>Like</span>
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span>Comment</span>
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
