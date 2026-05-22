# Flow 5.1 — Analytics & Insights

**Priority**: P1
**Last Updated**: 2026-05-21
**Screenshot Count**: 6 screenshots

## Overview
Documents the analytics and insights interface including performance metrics, post-level analytics, audience growth tracking, and content performance recommendations.

## Entry Point
- **URL**: `https://buffer.com/insights`
- **Prerequisite**: User must be logged in with at least one connected channel that has published posts

## User Journey

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User clicks "Insights" in sidebar navigation | Analytics dashboard loads with overview metrics | `01-insights-overview.png` |
| 2 | User views high-level performance summary | Key metrics displayed: engagement rate, reach, clicks, follower growth | `02-metrics-summary.png` |
| 3 | User selects date range filter | Charts and metrics update to selected period | `03-date-filter.png` |
| 4 | User drills into a specific platform (Instagram/Threads/Bluesky) | Platform-specific analytics view with detailed breakdown | `04-platform-analytics.png` |
| 5 | User views individual post performance | Post list with engagement metrics, sortable by any column | `05-post-analytics.png` |
| 6 | User navigates to Insights Beta for AI-powered analysis | Insights Beta page opens with AI-generated content recommendations and performance predictions | `03-insights-beta.png` |

### Content Performance Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User clicks on a published post in analytics view | Post detail modal opens with full performance data | `06-post-detail.png` |
| 2 | User views engagement breakdown | Likes, comments, shares, saves displayed with trend indicators | `07-engagement-breakdown.png` |
| 3 | User compares performance across platforms | Side-by-side comparison table for multi-platform posts | `08-cross-platform.png` |

### Audience Growth Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User navigates to Audience section within Insights | Follower growth chart loads with historical data | `09-audience-chart.png` |
| 2 | User views growth trends | Line chart showing follower count over time with annotations | `10-growth-trends.png` |
| 3 | User checks top performing content types | Content type breakdown (image vs text vs video) with engagement rates | `11-content-types.png` |

### Recommendations Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User views Recommendations tab | AI-generated suggestions for optimal posting times and content types | `12-recommendations.png` |
| 2 | User reviews suggested improvements | Actionable insights: "Post on Wednesdays at 10 AM for 23% more engagement" | `13-suggestions.png` |
| 3 | User applies a recommendation | Suggestion applied to posting schedule, confirmation toast shown | `14-apply-recommendation.png` |

## Key States

### Empty State
**When**: No published posts exist for connected channels
**Behavior**: Analytics page shows "No data yet" illustration with "Publish your first post to see analytics" message. All metric cards show "—" placeholder.
**Screenshot**: `shared/04-empty-state.png`

### Loading State
**When**: Analytics data being fetched from platform APIs
**Behavior**: Skeleton cards for all metric sections. Charts show spinner with "Loading analytics..." label.

### Error State
**When**: Platform API returns error or data fetch fails
**Behavior**: Error banner at top of affected section with "Retry" button. Partial data shown if some platforms loaded successfully. Platform-specific errors show per-card.

### Data Freshness
**When**: Analytics data is stale or pending platform sync
**Behavior**: "Last updated: X minutes ago" timestamp shown. Stale data warning if >1 hour old with "Refresh" button.

## Analytics Sections

### Overview Dashboard
- **Engagement Rate**: Aggregate across all platforms
- **Total Reach**: Impressions sum
- **Link Clicks**: Total outbound clicks from posts
- **Follower Growth**: Net change over selected period

### Post Performance Table
- **Columns**: Post content preview, platform, published date, impressions, engagement, clicks
- **Sorting**: Click any column header to sort
- **Filtering**: By platform, date range, post type

### Platform-Specific Views
| Platform | Available Metrics |
|----------|------------------|
| Instagram | Impressions, Reach, Engagement, Saves, Profile Visits |
| Threads | Views, Replies, Reposts, Likes |
| Bluesky | Impressions, Likes, Reposts, Replies |
| LinkedIn | Impressions, Clicks, Reactions, Comments, Shares |

## Navigation
- **Access**: Sidebar "Insights" link
- **Related Flows**:
  - Flow 2.1 — Dashboard & Home (activity summary links)
  - Flow 8.1 — Publishing & Channel Management (post status affects analytics availability)
- **Welcome Checklist**: "View analytics" is the 4th (incomplete) checklist item
