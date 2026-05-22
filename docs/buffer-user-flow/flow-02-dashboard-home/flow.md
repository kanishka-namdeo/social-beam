# Flow 2.1 — Dashboard & Home

**Priority**: P0
**Last Updated**: 2026-05-21
**Screenshot Count**: 5 screenshots

## Overview
Documents the main dashboard landing page and home view. Covers the primary navigation, activity summary, quick-action shortcuts, and the welcome checklist progress indicator visible upon login.

## Entry Point
- **URL**: `https://buffer.com/dashboard` or `https://buffer.com/publish`
- **Prerequisite**: User must be logged in

## User Journey

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User logs in and is redirected to dashboard | Main dashboard loads with navigation sidebar | `01-dashboard-overview.png` |
| 2 | User views main content area | Activity summary, recent posts, and welcome checklist displayed | `02-dashboard-content.png` |
| 3 | User interacts with quick-action "Create Post" button | Redirected to compose page with blank post form | `03-quick-action-create.png` |
| 4 | User navigates to Community tab | Community engagement view loads with recent interactions and mentions | `01-community-tab.png` |
| 5 | User navigates using sidebar menu | Smooth transition to selected section (Create, Publish, Community, Insights) | `04-sidebar-navigation.png` |

### Primary Navigation Structure

| Section | Sub-sections | Icon | Description |
|---------|-------------|------|-------------|
| **Create** | Ideas, Templates, Feeds | Pen/pencil icon | Content creation workspace |
| **Publish** | Queue, Drafts, Approvals, Sent | Calendar icon | Publishing management |
| **Community** | — | People icon | Social engagement tools |
| **Insights** | — | Chart icon | Analytics and reporting |

## Key States

### Empty State
**When**: No posts created or scheduled
**Behavior**: Dashboard shows welcome checklist prominently with guided CTA buttons. "Create your first post" button centered with illustration. Recent posts section shows placeholder illustration.
**Screenshot**: `shared/04-empty-state.png`

### Loading State
**When**: Dashboard data loading after login
**Behavior**: Skeleton cards for activity metrics, placeholder rows for recent posts. Welcome checklist renders immediately (cached).

### Error State
**When**: API fails to load dashboard data
**Behavior**: Error banner at top with "Try again" button. Cached data displayed if available. Individual card-level error states with retry buttons.

## Dashboard Components

### Welcome Checklist Widget
- **Position**: Top of dashboard content area
- **Progress Indicator**: Circular progress ring showing 3/4 complete
- **Items**: Connect channel, create post, schedule post, view analytics
- **Behavior**: Items auto-check off when actions completed elsewhere in app

### Activity Summary
- **Metrics Displayed**: Posts published this week, engagement rate trend, upcoming scheduled posts count
- **Time Window**: Last 7 days by default
- **Refresh**: Auto-refreshes every 5 minutes

### Recent Posts
- **Display**: Last 5 posts with status badges (Draft, Scheduled, Published)
- **Actions**: Quick edit, duplicate, view analytics per post
- **Platform Icons**: Shows connected platform logos (Instagram, Threads, Bluesky)

## Navigation
- **Access**: Automatic redirect after login
- **Related Flows**:
  - Flow 1.1 — Authentication & Onboarding (entry point)
  - Flow 3.1 — Post Creation (via Create button)
  - Flow 6.1 — Calendar & Queue (via Publish navigation)

## User Context
- **Organization**: "My Organization"
- **Connected Channels**: Instagram, Threads, Bluesky (LinkedIn showing connection error)
- **Time Zone**: Dubai (UTC+4)
- **View Streak**: 5 days
