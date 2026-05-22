"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { renderRichText, truncateText } from "@/lib/compose/preview-helpers";
import type { AccountInfo } from "./types";

interface LinkedInPreviewProps {
  content: string;
  account?: AccountInfo;
}

const LINKEDIN_MAX_VISIBLE_CHARS = 300;

// LinkedIn-specific colors
const LI = {
  bg: "#ffffff",
  border: "#e0e0e0",
  text: "rgba(0,0,0,0.9)",
  textSecondary: "rgba(0,0,0,0.6)",
  textTertiary: "rgba(0,0,0,0.45)",
  blue: "#0a66c2",
  heart: "#df704d",
  iconHover: "rgba(0,0,0,0.08)",
} as const;

export function LinkedInPreview({ content, account }: LinkedInPreviewProps) {
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
      className="w-full max-w-[700px] rounded-lg"
      style={{
        backgroundColor: LI.bg,
        border: `1px solid ${LI.border}`,
      }}
      role="img"
      aria-label="LinkedIn post preview"
    >
      {/* Author Header */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <Avatar className="h-12 w-12 rounded-full" style={{ flexShrink: 0 }}>
          <AvatarImage src={avatarSrc} alt={displayName} />
          <AvatarFallback
            className="text-sm font-semibold text-white"
            style={{ backgroundColor: LI.blue }}
          >
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] font-semibold leading-tight"
            style={{ color: LI.text }}
          >
            {displayName}
          </p>
          {!account?.platformUsername && (
            <p
              className="text-[12px] leading-tight"
              style={{ color: LI.textSecondary }}
            >
              Your headline goes here
            </p>
          )}
          <div
            className="mt-0.5 flex items-center gap-1 text-[12px]"
            style={{ color: LI.textSecondary }}
          >
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
      <div
        className="px-4"
        style={{ paddingTop: 12, paddingBottom: 12 }}
      >
        {content.trim() === "" ? (
          <p
            className="text-[14px]"
            style={{ color: LI.textSecondary }}
          >
            Start writing and your post will appear here.
          </p>
        ) : (
          <>
            <p
              className="text-[14px] leading-[1.43] whitespace-pre-wrap break-words"
              style={{ color: LI.text }}
            >
              {renderRichText(visible)}
              {!showExpanded && needsTruncation && (
                <span>
                  {" "}
                  <span style={{ color: LI.textSecondary }}>...</span>
                  <button
                    type="button"
                    className="cursor-pointer bg-transparent underline-offset-2"
                    style={{
                      color: LI.blue,
                      fontWeight: 600,
                      fontSize: 14,
                      padding: 0,
                      lineHeight: "inherit",
                    }}
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
              <p
                className="mt-1 text-[14px] leading-[1.43] whitespace-pre-wrap break-words"
                style={{ color: LI.textSecondary }}
              >
                {renderRichText(hidden)}
              </p>
            )}
            {showExpanded && hidden && needsTruncation && (
              <div className="mt-1">
                <p
                  className="text-[14px] leading-[1.43] whitespace-pre-wrap break-words"
                  style={{ color: LI.text }}
                >
                  {renderRichText(hidden)}
                  <button
                    type="button"
                    className="ml-1 cursor-pointer bg-transparent underline-offset-2"
                    style={{
                      color: LI.blue,
                      fontWeight: 600,
                      fontSize: 14,
                      padding: 0,
                      lineHeight: "inherit",
                    }}
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
      </div>

      <Separator style={{ backgroundColor: LI.border, height: 1 }} />

      {/* Engagement Bar */}
      <div className="px-4 pb-3 pt-2">
        {/* Reaction counts — left & right aligned on same baseline */}
        <div className="flex items-center justify-between text-[12px]" style={{ color: LI.textTertiary, lineHeight: "20px" }}>
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
                style={{ backgroundColor: LI.blue, lineHeight: 1 }}
              >
                👍
              </span>
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
                style={{ backgroundColor: LI.heart, lineHeight: 1 }}
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
        <div className="mt-1 flex" style={{ gap: 0 }}>
          <button
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded py-2 transition-colors"
            style={{
              color: LI.textSecondary,
              fontWeight: 600,
              fontSize: 12,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = LI.iconHover)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
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
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded py-2 transition-colors"
            style={{
              color: LI.textSecondary,
              fontWeight: 600,
              fontSize: 12,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = LI.iconHover)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
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
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded py-2 transition-colors"
            style={{
              color: LI.textSecondary,
              fontWeight: 600,
              fontSize: 12,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = LI.iconHover)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
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
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded py-2 transition-colors"
            style={{
              color: LI.textSecondary,
              fontWeight: 600,
              fontSize: 12,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = LI.iconHover)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
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
