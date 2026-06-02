# E2E Flow 02: Managing the Content Calendar

**Captured**: 2026-05-31
**Account**: kanishkanamdeo@hotmail.com — "My Organization" (Dubai, UTC+4)
**Plan**: Free plan (1/3 channel slots used)

## User Journey

| # | Step | Action | Expected Result | Screenshot |
|---|------|--------|-----------------|------------|
| 01 | Login | Navigate to login page | Already authenticated — redirects to schedule/calendar | `01-login.png` |
| 02 | Navigate to Schedule | Navigate to /channels/.../schedule | Schedule list view showing upcoming time slots (Thu 9:37 AM, Fri 9:57/10:26 AM) | `02-navigate-to-schedule.png` |
| 03 | Close Error Dialog | Check for LinkedIn connection error dialog | No error dialog present — channels loaded cleanly | `03-no-error-dialog.png` |
| 04 | List View | Capture default list view | Scheduled posts displayed by date with "New" buttons at each time slot; tabs for Queue, Drafts, Approvals, Sent | `04-list-view.png` |
| 05 | Switch to Calendar View | Click "Calendar" radio button | View switches to weekly calendar grid with day columns and hourly rows | `05-switch-to-calendar-view.png` |
| 06 | Calendar Week View | Capture calendar week view | Weekly grid (Mon-Sun) with hourly time slots (12 AM - 11 PM), configured posting times highlighted | `06-calendar-week-view.png` |
| 07 | Filter by Channel | Check for channel filter controls | Channel buttons in sidebar (Instagram, Threads, Bluesky, More channels) | `07-filter-by-channel.png` |
| 08 | Click Time Slot | Click on an empty time slot in the calendar | Post Composer dialog opens pre-configured for that time slot | `08-click-time-slot.png` |
| 09 | Compose Dialog Opens | Capture the dialog state | Composer shows text area, channel selector, media upload, and schedule controls | `09-compose-dialog-opens.png` |
| 10 | Navigate Weeks | Click "Previous Week" / "Next Week" buttons | Calendar shifts to show the adjacent week with its scheduled time slots | `10-navigate-weeks.png` |
| 11 | View Drafts Tab | Click "Drafts" tab on schedule page | Empty drafts view — no saved drafts | `11-view-drafts-tab.png` |
| 12 | View Sent Tab | Click "Sent" tab on schedule page | Sent posts list showing 76 published posts with platform indicators | `12-view-sent-tab.png` |

## Key Observations

1. **List vs Calendar toggle**: Radio buttons for switching between list and calendar views
2. **Posting schedule**: 3 recurring weekly time slots (Tue 9:57/10:26 AM, Thu 9:37 AM, Dubai timezone)
3. **Welcome checklist**: Persistent onboarding checklist at bottom of schedule page (3/4 complete)
4. **Sent history**: 76 posts already published, viewable in the Sent tab
5. **Approvals tab**: Locked behind paid plan upgrade gate
6. **Channel sidebar**: Connected channels shown with colored status indicators; 1/3 slots used
7. **Time zone indicator**: Shows "Dubai" timezone with link to posting schedule settings
8. **Filter by Tags**: Available for organizing posts with custom tags

## Notable UX Patterns

- **Recurring time slots**: Visual consistency across weeks with identical time patterns
- **Empty state**: "New" buttons at each configured time slot invite content creation
- **Week navigation**: Arrow buttons with "Today" button for quick return
- **Week filter dropdown**: Combobox for selecting different week ranges
- **Posts counter**: "0 posts" label updates dynamically per tab
