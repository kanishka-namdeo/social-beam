"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { renderRichText } from "@/lib/compose/preview-helpers";
import type { AccountInfo } from "./types";
import { MediaPreview } from "./media-preview";

interface PinterestPreviewProps {
  content: string;
  title?: string;
  account?: AccountInfo;
  mediaUrls?: string[];
  signature?: { text: string; url?: string } | null;
}

export function PinterestPreview({ content, title, account, mediaUrls, signature }: PinterestPreviewProps) {
  // Use account data or fall back to defaults
  const displayName = account?.platformUsername || "You";
  const avatarSrc = account?.avatarUrl || "";
  const avatarFallback = displayName.charAt(0).toUpperCase();
  return (
    <div
      className="w-full max-w-[236px] overflow-hidden rounded-sm bg-card border border-border shadow-sm dark:shadow-lg dark:shadow-black/40"
      role="img"
      aria-label="Pinterest pin preview"
    >
      {/* Media */}
      {mediaUrls && mediaUrls.length > 0 ? (
        <MediaPreview mediaUrls={mediaUrls} />
      ) : (
        <div className="aspect-[2/3] w-full bg-muted flex flex-col items-center justify-center gap-2 relative group cursor-pointer">
          <svg className="h-10 w-10 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          {/* Save Button (appears on hover) */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="inline-flex items-center rounded-full bg-preview-pinterest px-3 py-1.5 text-xs font-bold text-white">
              Save
            </span>
          </div>
        </div>
      )}

      {/* Pin Content */}
      <div className="p-preview">
        {/* Title */}
        {title && title.trim() !== "" && (
          <p className="text-sm font-semibold text-foreground leading-snug truncate-2">
            {title}
          </p>
        )}

        {/* Description */}
        <p className="mt-1 text-xs text-muted-foreground truncate-2 whitespace-pre-wrap break-words">
          {content.trim() === "" ? (
            <span>Pin description goes here...</span>
          ) : (
            renderRichText(content)
          )}
        </p>
        {signature && (
          <p className="mt-2 text-xs text-muted-foreground">
            {signature.text}
          </p>
        )}

        {/* Author */}
        <div className="mt-3 flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={avatarSrc} alt={displayName} />
            <AvatarFallback className="bg-preview-pinterest text-[8px] font-bold text-white">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            Follow
          </button>
        </div>
      </div>
    </div>
  );
}
