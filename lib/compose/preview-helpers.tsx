import type { ReactNode } from 'react';

const HASHTAG_REGEX = /#(\w+)/g;
const MENTION_REGEX = /@(\w+)/g;

/**
 * Parse text into React elements with hashtags and mentions as links.
 * Uses JSX interpolation (safe from XSS) rather than dangerouslySetInnerHTML.
 */
export function renderRichText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  // Collect all matches from both patterns
  const allMatches: { start: number; end: number; type: 'hashtag' | 'mention'; match: RegExpExecArray }[] = [];

  let match;
  while ((match = HASHTAG_REGEX.exec(text)) !== null) {
    allMatches.push({ start: match.index, end: match.index + match[0].length, type: 'hashtag', match });
  }
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    allMatches.push({ start: match.index, end: match.index + match[0].length, type: 'mention', match });
  }

  // Sort by position
  allMatches.sort((a, b) => a.start - b.start);

  // Build output
  for (const item of allMatches) {
    // Add text before this match
    if (item.start > lastIndex) {
      parts.push(text.slice(lastIndex, item.start));
    }

    // Add the link
    if (item.type === 'hashtag') {
      parts.push(
        <a
          key={`ht-${item.start}`}
          href={`https://www.linkedin.com/feed/hashtag/?keywords=${encodeURIComponent(item.match[1])}`}
          className="text-blue-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.match[0]}
        </a>,
      );
    } else {
      parts.push(
        <span key={`mt-${item.start}`} className="text-blue-600">
          {item.match[0]}
        </span>,
      );
    }

    lastIndex = item.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Truncate text and return { visible, hidden } for "...more" rendering.
 */
export function truncateText(
  text: string,
  maxLength: number,
): { visible: string; hidden: string; needsTruncation: boolean } {
  if (text.length <= maxLength) {
    return { visible: text, hidden: '', needsTruncation: false };
  }

  // Find a natural break point (newline or sentence end)
  const visible = text.slice(0, maxLength);
  const hidden = text.slice(maxLength);
  return { visible, hidden, needsTruncation: true };
}

/**
 * Format a relative timestamp like "12h", "2d", "1w".
 */
export function formatTimestamp(date?: Date): string {
  if (!date) {
    return 'now';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return `${Math.floor(diffDays / 30)}mo`;
}

/**
 * Escape HTML special characters to prevent XSS when rendering plain text.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
