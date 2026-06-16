/**
 * Centralized DOM selectors for LinkedIn scraping.
 *
 * All selectors extracted from:
 * - lib/inbox/scrapers/linkedin-scraper.ts (SELECTOR_STRATEGIES)
 * - lib/linkedin/browser.ts (ANALYTICS_SELECTORS, ANALYTICS_DASHBOARD_SELECTORS,
 *   and profile selectors from scrapeProfileData)
 */

// ─── Post Containers ───────────────────────────────────────────────
// Updated 2026-06-09: LinkedIn now uses obfuscated hash-based class names.
// Posts are in div[role="listitem"] within div[data-testid="mainFeed"].
// Legacy selectors kept as fallback for older page versions.

export const POST_CONTAINER_SELECTORS: readonly string[] = [
  "div[role=\"listitem\"]",
  "div[data-testid=\"mainFeed\"] div[data-display-contents]",
  // Legacy fallbacks (may not match current LinkedIn DOM)
  "div.occludable-update",
  "div.feed-shared-update-v2",
  "article[data-view-name='update']",
  "div.update-components-container",
];

// ─── Inbox Selectors ───────────────────────────────────────────────
// Updated 2026-06-09: LinkedIn now uses obfuscated hash-based class names.
// Comment extraction now relies on role-based and structural selectors.
// Legacy selectors kept as fallback for older page versions.

export const INBOX_SELECTORS = {
  commentItems: [
    // Verified 2026-06-10: Comments use componentkey attribute
    '[componentkey^="replaceableComment_"]',
    // Fallback: Role-based selectors
    'div[role="listitem"] div[role="article"]',
    'div[role="listitem"] div[data-view-name]',
    'article[role="article"]',
    // Legacy fallbacks
    "div.comments-comment-item",
    "div.comment-item",
    "div.social-detail-comment",
    "li.comments-comment-item",
    "div[data-urn*='comment']",
  ],
  commentText: [
    // New: Look for <p> elements with substantial text
    'div[role="article"] p',
    'article p',
    // Legacy fallbacks
    "span.comments-comment-item__main-content",
    "span[class*='main-content']",
    "div[class*='comment-text']",
    "span[class*='break-words']",
    "div[class*='attributed-text']",
  ],
  commentAuthor: [
    // New: Look for profile links
    "a[href*='/in/']",
    // Legacy fallbacks
    "span.feed-shared-actor__name",
    "div.feed-shared-actor__description",
    "span[class*='actor__name']",
  ],
  showMoreReplies: [
    "button[aria-label*='replies']",
    "button[aria-label*='more']",
    "button[aria-label*='Replies']",
    "button[aria-label*='More']",
    "button[role='button']",
  ],
  commentInput: [
    'div[role="textbox"]',
    'textarea[placeholder*="comment"]',
    'textarea[placeholder*="Comment"]',
    'div[class*="comment-box"] div[role="textbox"]',
    'div[contenteditable="true"]',
  ],
  postButton: [
    'button[type="submit"]',
    'button[class*="post"]',
    'button[role="button"]',
  ],
  showMoreText: ["Show more", "Show all", "more replies", "Show more replies"],
  postButtonText: ["Post", "Reply", "Comment"],
} as const;

// ─── Analytics Selectors ──────────────────────────────────────────
// Updated 2026-06-09: LinkedIn now uses obfuscated hash-based class names.
// Text-based extraction is now the primary strategy.
// Legacy selectors kept as fallback for older page versions.

export const ANALYTICS_SELECTORS = {
  reactions: [
    // New: Look for elements with aria-label containing reaction counts
    "button[aria-label*='reaction']",
    "button[aria-label*='Reaction']",
    "span[aria-label*='reaction']",
    "span[aria-label*='Reaction']",
    // Legacy fallbacks
    ".social-details-social-counts__reactions-count",
    ".social-details-social-counts__likes-count",
  ],
  comments: [
    // New: Look for elements with aria-label containing comment counts
    "button[aria-label*='comment']",
    "button[aria-label*='Comment']",
    "span[aria-label*='comment']",
    "span[aria-label*='Comment']",
    // Legacy fallbacks
    ".social-details-social-counts__comments",
  ],
  shares: [
    // New: Look for elements with aria-label containing share/repost counts
    "button[aria-label*='repost']",
    "button[aria-label*='Repost']",
    "button[aria-label*='share']",
    "button[aria-label*='Share']",
    "span[aria-label*='repost']",
    "span[aria-label*='Repost']",
    // Legacy fallbacks
    ".social-details-social-counts__reposts",
    ".social-details-social-counts__reposts-count",
  ],
} as const;

// ─── Analytics Dashboard Selectors ────────────────────────────────
// From browser.ts — analytics dashboard metrics for own posts.
// Updated 2026-06-10: Added more specific selectors for engagement metrics
// to avoid confusion with UI elements like "Add a comment" buttons.

export const ANALYTICS_DASHBOARD_SELECTORS = {
  impressions: [
    '[data-impressions-count]',
    '.analytics-statistics__impressions',
    '[class*="impressions"]',
    'div[class*="analytics"][class*="impressions"]',
    'span[aria-label*="impressions"]',
    'span[aria-label*="Impressions"]',
  ],
  uniqueImpressions: [
    '[data-unique-impressions-count]',
    '.analytics-statistics__unique-impressions',
    '[class*="unique-impressions"]',
    '[class*="uniqueImpressions"]',
    'span[aria-label*="unique impressions"]',
    'span[aria-label*="Unique impressions"]',
  ],
  clicks: [
    '[data-clicks-count]',
    '.analytics-statistics__clicks',
    '[class*="clicks"]',
    'span[aria-label*="clicks"]',
    'span[aria-label*="Clicks"]',
  ],
  engagementRate: [
    '[data-engagement-rate]',
    '.analytics-statistics__engagement-rate',
    '[class*="engagement-rate"]',
    '[class*="engagementRate"]',
    'span[aria-label*="engagement rate"]',
    'span[aria-label*="Engagement rate"]',
  ],
  saves: [
    '[data-saves-count]',
    '.analytics-statistics__saves',
    '[class*="saves"]',
    'span[aria-label*="saves"]',
    'span[aria-label*="Saves"]',
  ],
  profileViews: [
    '[data-profile-views]',
    '.analytics-statistics__profile-views',
    '[class*="profile-views"]',
    'span[aria-label*="profile views"]',
    'span[aria-label*="Profile views"]',
  ],
  // Engagement metrics - specific to analytics dashboard statistics section
  reactions: [
    '.analytics-statistics__reactions',
    '[class*="analytics-statistics"] [class*="reactions"]',
    '[data-test-id*="analytics"] [class*="reactions"]',
    '[class*="engagement-metrics"] [class*="reactions"]',
    'span[aria-label*="reactions"][class*="count"]',
    'span[aria-label*="Reactions"][class*="count"]',
  ],
  comments: [
    '.analytics-statistics__comments',
    '[class*="analytics-statistics"] [class*="comments"]',
    '[data-test-id*="analytics"] [class*="comments"]',
    '[class*="engagement-metrics"] [class*="comments"]',
    'span[aria-label*="comments"][class*="count"]',
    'span[aria-label*="Comments"][class*="count"]',
    // Avoid matching "Add a comment" by requiring count in aria-label or specific class
    '[class*="analytics"] span[aria-label*="comments"]',
  ],
  reposts: [
    '.analytics-statistics__reposts',
    '[class*="analytics-statistics"] [class*="reposts"]',
    '[data-test-id*="analytics"] [class*="reposts"]',
    '[class*="engagement-metrics"] [class*="reposts"]',
    'span[aria-label*="reposts"][class*="count"]',
    'span[aria-label*="Reposts"][class*="count"]',
    'span[aria-label*="shares"][class*="count"]',
    'span[aria-label*="Shares"][class*="count"]',
  ],
} as const;

// ─── Profile Selectors ────────────────────────────────────────────
// From browser.ts — follower, connection, and profile view selectors
// used in scrapeProfileData.

export const PROFILE_SELECTORS = {
  followers: [
    '[data-follower-count]',
    '.pv-member-stats__followers-count',
    '[class*="follower-count"]',
    '[class*="followerCount"]',
    'a[href*="followers"] [class*="count"]',
    '[aria-label*="followers"]',
    'span:has-text("followers")',
  ],
  connections: [
    '[data-connection-count]',
    '.pv-member-stats__connections-count',
    '[class*="connections"]',
    '[class*="connectionsCount"]',
    '[aria-label*="connections"]',
  ],
  profileViews: [
    '[data-profile-views]',
    '[class*="profile-views"]',
    '[class*="profileViews"]',
    'a[href*="profile-views"] [class*="count"]',
    '[aria-label*="profile views"]',
  ],
} as const;

// ─── Notifications Selectors ──────────────────────────────────────
// For scraping mentions from /notifications/?filter=mentions
// Verified 2026-06-10: Notifications use list items with notification-type attributes

export const NOTIFICATIONS_SELECTORS = {
  notificationItems: [
    // Primary: list items with notification-type attribute
    'li[notification-type]',
    // Fallback: generic list items in notifications container
    'main ul[role="list"] > li',
    'main [role="list"] > li',
  ],
  notificationLink: [
    // Main notification link (contains the action text)
    'a.notification-card__main-link',
    'a[data-test-notification-id]',
    'a[href*="/feed/update/"]',
    'a[href*="/posts/"]',
  ],
  actorName: [
    // Person who triggered the notification
    '.notification-card__actor-name',
    '.notification-card__actor-description',
    'span[class*="actor-name"]',
    'span[class*="actor-description"]',
  ],
  actorAvatar: [
    // Avatar image in notification
    '.notification-card__actor-image img',
    'img[class*="notification-avatar"]',
    'img[alt*="profile"]',
  ],
  timestamp: [
    // Time element showing when notification occurred
    'time',
    'span[class*="timestamp"]',
    'span[class*="time-ago"]',
  ],
  unreadIndicator: [
    // Visual indicator for unread notifications
    '[class*="unread"]',
    '.notification-unread-indicator',
    'span[class*="notification-dot"]',
  ],
} as const;

// ─── Messaging Selectors ──────────────────────────────────────────
// For scraping DMs from /messaging/
// Verified 2026-06-10: Messaging uses conversation list with message previews

export const MESSAGING_SELECTORS = {
  conversationList: [
    // Main conversation list container
    '[data-test-id="messaging-conversation-list"]',
    '.msg-conversation-list',
    '[role="list"][aria-label*="conversation"]',
    'ul[class*="conversation-list"]',
  ],
  conversationItem: [
    // Individual conversation item in the list
    'li.msg-conversation-list-item',
    'li[class*="conversation-list-item"]',
    '[role="listitem"][data-test-id*="conversation"]',
    'li[role="option"]',
  ],
  participantName: [
    // Name of the conversation participant(s)
    '.msg-conversation-list-item__title',
    'span[class*="conversation-name"]',
    'a[href*="/in/"] span',
  ],
  participantAvatar: [
    // Avatar image of the participant
    '.msg-conversation-list-item__participant-photo img',
    'img[class*="participant-photo"]',
    'img[class*="conversation-avatar"]',
  ],
  messagePreview: [
    // Preview text of the last message
    '.msg-conversation-list-item__message-preview',
    'p[class*="message-preview"]',
    'span[class*="last-message"]',
  ],
  timestamp: [
    // Time of the last message
    '.msg-conversation-list-item__timestamp',
    'time[class*="conversation-time"]',
    'span[class*="message-time"]',
  ],
  unreadBadge: [
    // Indicator for unread messages in conversation
    '.msg-conversation-list-item__unread-count',
    '[class*="unread-count"]',
    'span[class*="unread-badge"]',
  ],
} as const;
