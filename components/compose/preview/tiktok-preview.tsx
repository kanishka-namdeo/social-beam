"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { renderRichText } from "@/lib/compose/preview-helpers";
import type { AccountInfo } from "./types";
import { MediaPreview } from "./media-preview";

interface TikTokPreviewProps {
  content: string;
  account?: AccountInfo;
  mediaUrls?: string[];
  signature?: { text: string; url?: string } | null;
}

export function TikTokPreview({ content, account, mediaUrls, signature }: TikTokPreviewProps) {
  // Use account data or fall back to defaults
  const displayName = account?.platformUsername || "yourhandle";
  const handle = account?.platformUsername ? `@${account.platformUsername}` : "@yourhandle";
  const avatarSrc = account?.avatarUrl || "";
  const avatarFallback = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="w-full max-w-[390px] overflow-hidden rounded-sm bg-preview-tiktok text-white"
      role="img"
      aria-label="TikTok post preview"
    >
      {/* Video/Media Placeholder */}
      {mediaUrls && mediaUrls.length > 0 ? (
        <div className="relative w-full">
          <MediaPreview mediaUrls={mediaUrls} />
        </div>
      ) : (
        <div className="aspect-[9/16] w-full bg-card/30 flex flex-col items-center justify-center gap-3">
          <svg className="h-16 w-16 text-muted-foreground/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span className="text-xs text-muted-foreground">Video preview</span>
        </div>
      )}

      {/* Overlay Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-preview pt-12">
        {/* Action Buttons (right side) */}
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <Avatar className="h-10 w-10 border-strong border-white">
              <AvatarImage src={avatarSrc} alt={displayName} />
              <AvatarFallback className="bg-preview-tiktok text-xs font-bold text-white">{avatarFallback}</AvatarFallback>
            </Avatar>
          </div>
          <button type="button" className="flex flex-col items-center gap-1" aria-label="Like">
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-xs font-medium">57</span>
          </button>
          <button type="button" className="flex flex-col items-center gap-1" aria-label="Comment">
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span className="text-xs font-medium">24</span>
          </button>
          <button type="button" className="flex flex-col items-center gap-1" aria-label="Share">
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span className="text-xs font-medium">6</span>
          </button>
        </div>

        {/* User Info & Caption */}
        <div className="pr-16">
          <p className="text-sm font-bold">{handle}</p>
          {content.trim() === "" ? (
            <p className="mt-1 text-xs text-muted-foreground/80">
              Write your caption here..
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-white whitespace-pre-wrap break-words">
              {renderRichText(content)}
            </p>
          )}
          {signature && (
            <p className="mt-2 text-xs text-muted-foreground">
              {signature.text}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <svg className="h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span className="text-xs text-muted-foreground">Original Sound - {displayName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
