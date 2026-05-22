# Flow 8.1 — Publishing & Channel Management

**Priority**: P0
**Last Updated**: 2026-05-21
**Screenshot Count**: 6 screenshots

## Overview
Documents the post publishing execution pipeline, including the automated publishing scheduler, post status transitions, channel-specific publishing requirements, and the Sent posts history view.

## Entry Point
- **URL**: `https://buffer.com/publish?tab=sent` or automated publishing pipeline
- **Prerequisite**: Scheduled posts must exist in the queue with connected target channels

## User Journey

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | Scheduled time arrives for a queued post | Publishing pipeline triggers automatically | `01-publish-trigger.png` |
| 2 | System posts to target platform(s) via API | Post published, response captured from platform API | `02-publish-execution.png` |
| 3 | Post status updates to "Published" | Queue card shows green "Published" badge with timestamp | `03-published-status.png` |
| 4 | Post appears in Sent tab | Full post detail with publish timestamp and platform link | `04-sent-tab.png` |
| 5 | User views post on platform | Clicking post opens it on the social platform in new tab | `05-view-on-platform.png` |

### Publishing Pipeline Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | Queue processor checks for posts due to publish | Due posts identified by scheduled time vs current time (Dubai, UTC+4) | `06-queue-check.png` |
| 2 | Platform API credentials validated | Token checked for validity and required permissions | `07-token-check.png` |
| 3 | Post content formatted per platform spec | Text, media, hashtags, tags formatted per platform requirements | `08-content-format.png` |
| 4 | Post sent to platform API | API call made, response received with post ID | `09-api-response.png` |
| 5 | Post status recorded in Buffer | Status set to "Published" with platform post URL | `10-status-recorded.png` |

### Failed Publishing Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | Platform API returns error (401, 403, rate limit) | Publish attempt marked as failed | `11-publish-fail.png` |
| 2 | Post status updates to "Failed" | Queue card shows red "Failed" badge with error reason | `12-failed-status.png` |
| 3 | User notified of failure | Email notification sent (if enabled). In-app alert shown in queue. | `13-failure-notification.png` |
| 4 | User clicks "Retry" on failed post | Re-publish attempted with current credentials | `14-retry-publish.png` |
| 5 | If channel disconnected (LinkedIn), user must reconnect | Redirect to Settings > Connected Accounts to fix connection | `15-reconnect-redirect.png` |

### Sent Posts Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User navigates to Publish > Sent | Sent posts list loads chronologically (newest first) showing published posts with platform icons, content previews, and publish timestamps | `01-sent-posts.png` |
| 2 | User filters by platform or date | List updates to show matching posts | `17-sent-filter.png` |
| 3 | User clicks on a sent post | Post detail opens with analytics preview and platform link | `18-sent-detail.png` |
| 4 | User shares or exports a sent post | Post data available for export or link sharing | `19-sent-export.png` |

## Key States

### Queued State
**When**: Post is scheduled but not yet published
**Behavior**: Post card shows yellow "Queued" badge with scheduled time. Edit and delete actions available. Platform icons displayed.
**Screenshot**: `shared/04-empty-state.png` (for reference: empty queue before posts queued)

### Publishing State
**When**: Post is actively being published (brief transitional state)
**Behavior**: Post card shows "Publishing..." with spinner. Actions temporarily disabled.

### Published State
**When**: Post successfully published to all target platforms
**Behavior**: Green "Published" badge with publish timestamp. Link to view on platform. Moved to Sent tab.

### Failed State
**When**: Post failed to publish to one or more platforms
**Behavior**: Red "Failed" badge with error reason tooltip. "Retry" button prominent. If LinkedIn channel disconnected, "Reconnect" action shown.

### Partial Publish State
**When**: Post published to some but not all target platforms
**Behavior**: Mixed status badge showing per-platform results. e.g., "Published to Instagram, Failed on LinkedIn". Platform-specific error details available on hover.

## Publishing Execution Details

### Channel Status Impact
| Channel Status | Publishing Behavior |
|---------------|---------------------|
| Connected | Posts publish normally |
| Connection Error | Posts held, "Failed" status assigned, user prompted to reconnect |
| Token Expired | Same as connection error, auto-reconnect attempt if possible |
| Rate Limited | Post queued for next available window, user notified |

### Platform-Specific Publishing
| Platform | Content Requirements | Media Handling | Known Constraints |
|----------|---------------------|----------------|-------------------|
| Instagram | Image required for most post types | Auto-crop to supported aspect ratios | Video duration limits, no link in captions |
| Threads | Text or media optional | Supports images, auto-link previews | No hashtag suggestions, no scheduling API quirks |
| Bluesky | Text required (300 char limit) | Single image attachment | No video, link cards auto-generated |
| LinkedIn | Text or media | Image or document upload | Connection token expires, frequent re-auth needed |

## Post Status Lifecycle

```
Draft → Queued → Publishing → Published → Sent
                   ↓
                Failed → Retry → (Published or Failed)
```

## Navigation
- **Access**: Automated by scheduled time, or user-initiated from Queue view
- **Related Flows**:
  - Flow 4.1 — Scheduling & Publishing (creates queued posts)
  - Flow 6.1 — Calendar & Queue (queue visualization)
  - Flow 7.1 — Settings & Account Management (channel connection status)
  - Flow 5.1 — Analytics & Insights (post-performance post-publish)
