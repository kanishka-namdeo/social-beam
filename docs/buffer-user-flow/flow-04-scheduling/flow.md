# Flow 4.1 — Scheduling & Publishing

**Priority**: P0
**Last Updated**: 2026-05-21
**Screenshot Count**: 6 screenshots

## Overview
Documents the post scheduling workflow including time slot selection, queue management, and the publishing pipeline. Covers both immediate and scheduled publishing with timezone-aware scheduling.

## Entry Point
- **URL**: `https://buffer.com/publish` (Queue tab) or compose flow "Schedule" step
- **Prerequisite**: User must be logged in with a draft post ready to schedule

## User Journey

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User clicks "Add to Queue" or "Schedule" from compose | Schedule picker modal opens or post added to next available slot | `01-schedule-trigger.png` |
| 2 | User views available time slots in calendar | Slots displayed for Tue/Wed at 9:57 AM, 10:26 AM and Thu at 9:37 AM | `02-available-slots.png` |
| 3 | User selects a date and time | Selected slot highlighted, conflicts indicated if any | `03-slot-selection.png` |
| 4 | User confirms schedule with timezone (Dubai, UTC+4) | Confirmation shown, post moves to Queue | `04-schedule-confirm.png` |
| 5 | Post appears in Queue view | Post card shows platform icons, scheduled time, and status | `05-queue-view.png` |

### Queue Management Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User navigates to Publish > Queue | Queue loads with all scheduled posts in chronological order | `06-queue-loaded.png` |
| 2 | User drags to reorder posts | Drag handles active, drop zones highlighted, times auto-update | `07-queue-reorder.png` |
| 3 | User clicks "Add to Queue" without specific time | Post placed in next available slot per posting schedule settings | `08-add-to-queue.png` |
| 4 | User edits a scheduled post | Inline edit mode opens, changes saved on confirm | `09-queue-edit.png` |
| 5 | User manages queue with drag-and-drop reorder and bulk operations | Queue management view with drag handles, bulk select checkboxes, and quick-action menu | `02-queue-management.png` |

### Recurring Posts Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User creates recurring post from compose or queue | Recurrence options displayed (daily, weekly, monthly) | `10-recurring-setup.png` |
| 2 | User configures recurrence pattern | Pattern preview shows next 5 occurrences | `11-recurring-pattern.png` |
| 3 | User confirms recurring schedule | Recurring post indicator shown in queue, original marked as template | `12-recurring-confirm.png` |

## Key States

### Empty State
**When**: Queue has no scheduled posts
**Behavior**: Empty illustration with "Your queue is empty" text. "Add to Queue" CTA prominent. Suggested posting schedule shown if user has configured time slots.
**Screenshot**: `shared/04-empty-state.png`

### Conflict State
**When**: User attempts to schedule at an already-occupied slot
**Behavior**: Slot shows conflict badge with existing post preview. User must pick alternate slot or override (creating a queue bump).

### Error State
**When**: Scheduled time is in the past or channel is disconnected
**Behavior**: Inline error on post card: "Cannot schedule — channel disconnected" with "Fix" link. Past times blocked at selection level with tooltip.

## Publishing Schedule Configuration

### Observed Posting Slots
| Day | Time (Dubai, UTC+4) | Frequency |
|-----|---------------------|-----------|
| Tuesday | 9:57 AM | Weekly |
| Tuesday | 10:26 AM | Weekly |
| Thursday | 9:37 AM | Weekly |

### Time Zone Handling
- **User Time Zone**: Dubai (UTC+4)
- **Display**: All times shown in user's configured timezone
- **Storage**: UTC internally, converted on display
- **DST**: Auto-adjusted for applicable regions (not applicable for Dubai)

## Navigation
- **Access**: Compose flow "Schedule" step, Publish > Queue, or calendar date click
- **Related Flows**:
  - Flow 3.1 — Post Creation (precedes scheduling)
  - Flow 6.1 — Calendar & Queue (queue visualization)
  - Flow 8.1 — Publishing & Channel Management (publishing execution)
