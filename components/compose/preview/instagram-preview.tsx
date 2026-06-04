"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { renderRichText } from "@/lib/compose/preview-helpers";
import type { AccountInfo } from "./types";
import { MediaPreview } from "./media-preview";

interface InstagramPreviewProps {
  content: string;
  account?: AccountInfo;
  mediaUrls?: string[];
}

export function InstagramPreview({ content, account, mediaUrls }: InstagramPreviewProps) {
  // Use account data or fall back to defaults
  const displayName = account?.platformUsername || "yourhandle";
  const avatarSrc = account?.avatarUrl || "";
  const avatarFallback = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="w-full max-w-[470px] overflow-hidden rounded-sm border border-border bg-card"
      role="img"
      aria-label="Instagram post preview"
    >
      {/* Header */}
      <div className="flex-between p-preview">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarSrc} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-xs font-semibold text-white">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
          </div>
        </div>
        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="More options">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Media */}
      {mediaUrls && mediaUrls.length > 0 ? (
        <MediaPreview mediaUrls={mediaUrls} />
      ) : (
        <div className="aspect-square bg-muted flex items-center justify-center">
          <svg className="h-12 w-12 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      )}

      {/* Engagement Icons */}
      <div className="flex items-center justify-between p-preview">
        <div className="flex items-center gap-4">
          <button type="button" className="text-foreground hover:text-muted-foreground transition-colors" aria-label="Like">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button type="button" className="text-foreground hover:text-muted-foreground transition-colors" aria-label="Comment">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </button>
          <button type="button" className="text-foreground hover:text-muted-foreground transition-colors" aria-label="Share">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <button type="button" className="text-foreground hover:text-muted-foreground transition-colors" aria-label="Save">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Likes */}
      <div className="px-3 pb-1">
        <p className="text-sm font-semibold text-foreground">57 likes</p>
      </div>

      <Separator className="bg-border" />

      {/* Caption */}
      <div className="px-3 py-2">
        <p className="text-sm text-foreground">
          <span className="font-semibold mr-1.5">{displayName}</span>
          {content.trim() === "" ? (
            <span className="text-muted-foreground">
              Start writing and your caption will appear here..
            </span>
          ) : (
            <span className="whitespace-pre-wrap break-words">
              {renderRichText(content)}
            </span>
          )}
        </p>
      </div>

      {/* Comments count */}
      <div className="px-3 pb-3">
        <p className="text-sm text-muted-foreground">View all 24 comments</p>
      </div>

      {/* Timestamp */}
      <div className="px-3 pb-3">
        <p className="text-micro uppercase text-muted-foreground tracking-wide">2 hours ago</p>
      </div>
    </div>
  );
}
