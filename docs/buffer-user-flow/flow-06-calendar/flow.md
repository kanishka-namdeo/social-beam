# Flow 6.1 — Calendar & Queue Management

**Priority**: P0
**Last Updated**: 2026-05-21
**Screenshot Count**: 6 screenshots

## Overview
Documents the calendar view and queue management interface. Covers the weekly/monthly calendar visualization, scheduled post management, drag-and-drop rescheduling, and the content publishing timeline.

## Entry Point
- **URL**: `https://buffer.com/publish` (default Queue tab) or `/publish?view=calendar`
- **Prerequisite**: User must be logged in with at least one scheduled post or configured posting schedule

## User Journey

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User navigates to Publish > Queue | Queue view loads with posts in chronological order | `01-queue-view.png` |
| 2 | User switches to Calendar view | Calendar grid displays with scheduled posts on respective dates | `02-calendar-view.png` |
| 3 | User clicks a date cell on calendar | Date detail panel opens showing posts scheduled for that day | `03-date-detail.png` |
| 4 | User drags a post to a new time slot | Post rescheduled, time updated, confirmation toast shown | `04-drag-reschedule.png` |
| 5 | User views the weekly schedule overview | Recurring posts shown on Tue/Wed at 9:57 AM, 10:26 AM and Thu at 9:37 AM | `05-weekly-overview.png` |

### Calendar Navigation Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User clicks "Week" or "Month" toggle | Calendar re-renders in selected granularity | `06-view-toggle.png` |
| 2 | User navigates to previous/next period | Arrow buttons shift calendar by one week or month | `07-period-nav.png` |
| 3 | User clicks "Today" button | Calendar scrolls/snaps to current date | `08-today-button.png` |
| 4 | User filters by platform | Calendar shows only posts for selected platform(s) | `09-platform-filter.png` |

### Queue Operations Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User views queue list | Posts displayed chronologically with time, platform, status | `10-queue-list.png` |
| 2 | User reorders via drag-and-drop | Posts reorder, times auto-adjust based on schedule settings | `11-queue-reorder.png` |
| 3 | User moves post from queue to drafts | Post removed from queue, added to Drafts tab | `12-move-to-drafts.png` |
| 4 | User views Drafts tab | Drafts view displays all unscheduled posts with content previews, platform targets, and quick actions to schedule or edit | `02-drafts-view.png` |
| 5 | User duplicates a scheduled post | Copy created and placed in next available slot | `13-duplicate-post.png` |

## Key States

### Empty State
**When**: No posts scheduled and no posting schedule configured
**Behavior**: Calendar shows empty grid with "No posts scheduled" message. "Create Post" and "Set up posting schedule" CTAs displayed. Illustration shown.
**Screenshot**: `shared/04-empty-state.png`

### Partial State
**When**: Some days have posts, others are empty
**Behavior**: Days with posts show post count badges and platform icons. Empty days are visually distinct (lighter background). Posting schedule slots shown as ghost cards on applicable days.

### Error State
**When**: Scheduled post fails to publish or channel disconnects
**Behavior**: Failed post card shows error badge with tooltip. Calendar shows red indicator on affected date. "Retry" and "View details" actions available.

## Schedule Configuration

### Current Posting Schedule (Dubai, UTC+4)
| Day | Time | Posts per Slot |
|-----|------|---------------|
| Tuesday | 9:57 AM | 1 |
| Tuesday | 10:26 AM | 1 |
| Thursday | 9:37 AM | 1 |

### Schedule Management
- **Add Slot**: Click "+ Add time" in schedule settings
- **Remove Slot**: Click slot's delete icon, confirm removal
- **Edit Time**: Click on time value, pick new time from picker
- **Bulk Operations**: Select multiple posts for bulk reschedule or deletion

## Calendar Views

### Week View
- **Layout**: 7-column grid, time slots shown vertically
- **Post Cards**: Show platform icon, content preview (truncated), scheduled time
- **Capacity Indicators**: Show how many slots filled vs available

### Month View
- **Layout**: Standard calendar grid (5-6 rows)
- **Post Indicators**: Dot count per day, platform color coding
- **Click Behavior**: Click day to expand detail panel

### List View (Queue)
- **Layout**: Vertical list sorted chronologically
- **Grouping**: Optional grouping by day or platform
- **Actions**: Edit, delete, duplicate, move per post

## Navigation
- **Access**: Publish > Queue (default view), calendar toggle, or sidebar navigation
- **Related Flows**:
  - Flow 4.1 — Scheduling & Publishing (creates scheduled posts)
  - Flow 3.1 — Post Creation (post entry point)
  - Flow 8.1 — Publishing & Channel Management (post publishing execution)
