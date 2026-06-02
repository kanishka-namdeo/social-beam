"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { renderRichText, truncateText } from "@/lib/compose/preview-helpers";
import type { AccountInfo } from "./types";
import { MediaPreview } from "./media-preview";

interface LinkedInPreviewProps {
  content: string;
  account?: AccountInfo;
  mediaUrls?: string[];
}

const LINKEDIN_MAX_VISIBLE_CHARS = 300;


export function LinkedInPreview({ content, account, mediaUrls }: LinkedInPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const { visible, hidden, needsTruncation } = truncateText(
    content,
    LINKEDIN_MAX_VISIBLE_CHARS,
  );

  const showExpanded = expanded || !needsTruncation;

  // Use account data or fall back to defaults
  const displayName = account?.platformUsername || "You";
  const avatarSrc = account?.avatarUrl || "";
  const avatarFallback = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="w-full max-w-[700px] rounded-sm border bg-card"
      role="img"
      aria-label="LinkedIn post preview"
    >
      {/* Author Header */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <Avatar className="h-12 w-12 shrink-0 rounded-full">
          <AvatarImage src={avatarSrc} alt={displayName} />
          <AvatarFallback
            className="bg-preview-linkedin text-sm font-semibold text-white"
          >
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight text-foreground">
            {displayName}
          </p>
          {!account?.platformUsername && (
            <p className="text-xs leading-tight text-muted-foreground">
              Your headline goes here
            </p>
          )}
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <span>now</span>
            <span>·</span>
            {/* Globe/earth visibility icon */}
            <svg
              className="h-3 w-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <circle cx="8" cy="8" r="6" />
              <ellipse cx="8" cy="8" rx="3" ry="6" />
              <line x1="2" y1="8" x2="14" y2="8" />
            </svg>
          </div>
        </div>
      </div>

      {/* Post Body */}
      <div className="px-4 py-3">
        {content.trim() === "" ? (
          <p className="text-sm text-muted-foreground">
            Start writing and your post will appear here.
          </p>
        ) : (
          <>
            <p className="text-sm leading-5 whitespace-pre-wrap break-words text-foreground">
              {renderRichText(visible)}
              {!showExpanded && needsTruncation && (
                <span>
                  {" "}
                  <span className="text-muted-foreground">...</span>
                  <button
                    type="button"
                    className="cursor-pointer bg-transparent font-semibold text-sm text-preview-linkedin underline-offset-2"
                    onClick={(e) => {
                      e.preventDefault();
                      setExpanded(true);
                    }}
                  >
                    See more
                  </button>
                </span>
              )}
            </p>
            {!showExpanded && hidden && (
              <p className="mt-1 text-sm leading-5 whitespace-pre-wrap break-words text-muted-foreground">
                {renderRichText(hidden)}
              </p>
            )}
            {showExpanded && hidden && needsTruncation && (
              <div className="mt-1">
                <p className="text-sm leading-5 whitespace-pre-wrap break-words text-foreground">
                  {renderRichText(hidden)}
                  <button
                    type="button"
                    className="ml-1 cursor-pointer bg-transparent font-semibold text-sm text-preview-linkedin underline-offset-2"
                    onClick={(e) => {
                      e.preventDefault();
                      setExpanded(false);
                    }}
                  >
                    See less
                  </button>
                </p>
              </div>
            )}
          </>
        )}
        {mediaUrls && mediaUrls.length > 0 && (
          <MediaPreview mediaUrls={mediaUrls} className="mt-3" />
        )}
      </div>

      <Separator className="bg-border" />

      {/* Engagement Bar */}
      <div className="px-4 pb-3 pt-2">
        {/* Reaction counts — left & right aligned on same baseline */}
        <div className="flex items-center justify-between text-xs leading-5 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-preview-linkedin text-[10px] leading-none"
              >
                👍
              </span>
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] leading-none"
              >
                ❤️
              </span>
            </div>
            <span>57</span>
          </div>
          <div className="flex items-center gap-1">
            <span>24 comments</span>
            <span>·</span>
            <span>6 reposts</span>
          </div>
        </div>

        {/* Action Buttons — stacked icon+label, like real LinkedIn */}
        <div className="mt-1 flex gap-0">
          <button
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded py-2 text-muted-foreground font-semibold text-xs transition-colors hover:bg-accent"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
              <path d="M7 22h11" />
            </svg>
            <span>Like</span>
          </button>
          <button
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded py-2 text-muted-foreground font-semibold text-xs transition-colors hover:bg-accent"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Comment</span>
          </button>
          <button
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded py-2 text-muted-foreground font-semibold text-xs transition-colors hover:bg-accent"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            <span>Repost</span>
          </button>
          <button
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded py-2 text-muted-foreground font-semibold text-xs transition-colors hover:bg-accent"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
