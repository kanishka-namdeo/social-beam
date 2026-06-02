# E2E Flow 01: Creating and Scheduling a Post

**Captured**: 2026-05-31
**Account**: kanishkanamdeo@hotmail.com — "My Organization" (Dubai, UTC+4)
**Plan**: Free plan (1/3 channel slots used)
**Connected Channels**: Instagram, Threads, Bluesky (LinkedIn — connection error)

## User Journey

| # | Step | Action | Expected Result | Screenshot |
|---|------|--------|-----------------|------------|
| 01 | Login | Navigate to https://login.buffer.com/login | Already authenticated — redirects to calendar/schedule page | `01-login-redirect.png` |
| 02 | Dashboard | After redirect, capture the dashboard landing | Schedule page with "New Post" button, tabs (Queue, Drafts, Sent), weekly time slots | `02-dashboard-landing.png` |
| 03 | Click New Post | Click the "New Post" button | Post Composer dialog opens with channel pre-selected (LinkedIn), empty text area, media upload area, and schedule button (disabled) | `03-click-new-post.png` |
| 04 | Select Channels | Click "Add channel" in composer | Channel selection dialog appears showing LinkedIn checkbox and "Connect a channel" option | `04-select-channels.png` |
| 05 | Type Content | Type text in the compose text area | Text appears in the text area and in the LinkedIn preview panel on the right; Schedule Post button becomes enabled | `05-type-post-content.png` |
| 06 | Add Media | Click the media upload area | File picker dialog opens (UI shown but no actual upload) | `06-add-media.png` |
| 07 | Preview Post | Click "Preview" toggle in the composer | LinkedIn preview panel shows formatted post preview with character count | `07-preview-post.png` |
| 08 | Click Schedule | Click "Schedule Post" button | Time slot selector shows default "Next Available" option | `08-click-schedule.png` |
| 09 | Select Time Slot | Click the time slot dropdown | Date/time picker appears with available time slots based on posting schedule (Tue 9:57/10:26 AM, Thu 9:37 AM) | `09-select-time-slot.png` |
| 10 | Confirmation | Attempt to schedule | On free plan, scheduling requires at least one connected channel. LinkedIn shows connection error — schedule blocked. Save Draft is disabled until valid channel. | `10-confirmation.png` |

## Key Observations

1. **Authentication**: User session persists — navigating to login redirects to the authenticated schedule page
2. **Composer UX**: Full-screen dialog with channel selector (left), compose area (center), and live preview (right)
3. **Channel gating**: "Schedule Post" button remains disabled until content is typed AND a valid connected channel is selected
4. **LinkedIn connection error**: The only connected channel showing an error prevents scheduling — need a working channel connection
5. **Time slot picker**: Shows pre-configured posting schedule slots (3 weekly slots)
6. **AI Assistant**: Available via toolbar button in the composer (requires paid plan)
7. **Templates**: Built-in templates available for quick post creation
8. **Character limits**: Per-platform character count shown (3000 for LinkedIn)
9. **First Comment**: Option to add a first comment (Instagram-specific feature)

## Notable UX Patterns

- **Keyboard shortcuts**: `mod+S` for Save Draft, `mod+Enter` for Schedule Post
- **Create Another**: Checkbox to immediately open fresh composer after scheduling
- **Preview toggle**: Real-time platform-specific preview updates as you type
- **Channel avatar**: Shows connected channel profile image next to the selected channel
- **Media upload**: Drag-and-drop zone with file picker fallback
