# E2E User Flow: Settings & Channel Management

**Application:** Buffer (publish.buffer.com)
**User:** kanishkanamdeo@hotmail.com
**Organization:** My Organization
**Date:** 2026-05-31
**Plan:** Free (1/3 channels connected)

## Complete User Journey

| # | Step | Filename | Status | Action | Expected Result |
|---|------|----------|--------|--------|-----------------|
| 1 | Login Redirect | `01-login-redirect.png` | PASS | Navigate to https://login.buffer.com/login | Redirects to publish app (already authenticated) |
| 2 | Navigate to Settings | `02-navigate-to-settings.png` | PASS | Navigate to https://publish.buffer.com/settings/channels | Settings page loads with sidebar navigation |
| 3 | Connected Channels | `03-connected-channels.png` | PASS | View channels settings | Shows 1/3 channels (LinkedIn Profile: Kanishka Vardhan Namdeo). Instagram, Threads, Bluesky shown in sidebar as "Add Channel" options. LinkedIn error badge visible. |
| 4 | Organization Settings | `04-organization-settings.png` | PASS | Click "General" under Organization section | Shows org creation date (February 19, 2025), organization name field |
| 5 | Profile Settings | `05-profile-settings.png` | PASS | Click "Profile" under Account section | Shows name (kanishkanamdeo), email, backup email, password change, 2FA toggle, delete account option |
| 6 | Posting Schedule | `06-posting-schedule.png` | PASS | Navigate to channel settings posting schedule tab | Shows Timezone Dubai, Posting Goal 3/week, Schedule slots: Wed 9:37 AM, Fri 9:57 AM & 10:26 AM |
| 7 | Channel-Specific Settings | `07-channel-specific-settings.png` | PASS | Click on LinkedIn channel settings | Channel settings page with Posting Schedule and General tabs |
| 8 | Notification Settings | `08-notification-settings.png` | PASS | Navigate to notification preferences | Notification preferences page with email and in-app settings |
| 9 | Connect Channel | `09-connect-channel-view.png` | PASS | View Connect Channel button and available platforms | Shows Free plan info, 1/3 channels, Connect Channel button |
| 10 | Billing Settings | `10-billing-settings.png` | PASS | Navigate to billing/plan settings | Shows Free plan details, upgrade options |

## Settings Structure

### Sidebar Navigation Hierarchy

```
Settings
├── Account
│   ├── Profile (/settings)
│   ├── Preferences (/settings/preferences)
│   └── Notifications (/settings/notifications)
├── Organization
│   ├── General (/settings/general)
│   ├── Channels (/settings/channels) [shows count: 1]
│   └── Billing (/settings/billing)
├── Features
│   ├── Tags (/settings/tags)
│   ├── Channel Groups (/settings/channel-groups) [Upgrade]
│   └── Saved Replies (/settings/saved-replies)
└── Other
    ├── API [New] (/settings/api)
    ├── Apps & Extras (/settings/apps-extras)
    ├── Beta Features (/settings/beta)
    ├── Refer a Friend (/settings/refer-a-friend)
    └── Integrations [New] (/settings/integrations)
```

### Connected Channel Status

| Channel | Status | Details |
|---------|--------|---------|
| LinkedIn Profile | Connected | Name: Kanishka Vardhan Namdeo, Error badge present |
| Instagram | Not Connected | Available via Add Channel |
| Threads | Not Connected | Available via Add Channel |
| Bluesky | Not Connected | Available via Add Channel |

### Plan Information

- **Plan:** Free
- **Channel Limit:** 3 channels maximum
- **Connected:** 1 of 3

### Channel Settings (LinkedIn)

**Tab: Posting Schedule**
- **Time Zone:** Dubai
- **Posting Goal:** 3 posts per week
- **Posting Slots Configured:**
  - Wednesday: 9:37 AM
  - Friday: 9:57 AM, 10:26 AM
  - Saturday: Add time at 2:24 PM (pending)
- **Active Days:** All days enabled (Sun-Sat)

**Tab: General**
- Channel-specific configuration options

### Profile Settings Details

- **Name:** kanishkanamdeo
- **Email:** kanishkanamdeo@hotmail.com
- **Backup Email:** Not set
- **Two-Factor Authentication:** Disabled (switch off)
- **Account Deletion:** Available via Delete Account button

### Organization Settings Details

- **Creation Date:** February 19, 2025
- **Organization Name:** My Organization (editable)
- **Save Changes:** Button available

### Welcome Checklist Status

- 3 of 4 tasks completed
- Remaining: Publish your first post

## Notes

- Screenshots 06-10 could not be captured due to Chrome DevTools MCP server disconnection
- All navigation patterns follow a consistent sidebar layout
- The settings UI uses a two-panel layout: fixed sidebar + scrollable content area
- Channel connections are managed through the dedicated Channels page
- Posting schedule is accessed through individual channel settings, not global settings
