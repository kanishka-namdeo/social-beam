# Flow 7.1 — Settings & Account Management

**Priority**: P0
**Last Updated**: 2026-05-21
**Screenshot Count**: 7 screenshots

## Overview
Documents the settings area including connected account management, channel configuration, profile settings, organization management, and notification preferences. Covers the LinkedIn connection error recovery flow.

## Entry Point
- **URL**: `https://buffer.com/settings` or via user avatar dropdown > Settings
- **Prerequisite**: User must be logged in

## User Journey

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User clicks avatar/profile icon in top-right corner | Dropdown menu with Settings option appears | `01-avatar-dropdown.png` |
| 2 | User clicks "Settings" | Settings page loads with sidebar navigation | `02-settings-page.png` |
| 3 | User navigates to "Connected Accounts" section | List of connected social channels displayed with status | `03-connected-accounts.png` |
| 4 | User views account status for each channel | Instagram, Threads, Bluesky show "Connected"; LinkedIn shows "Connection Error" | `04-account-statuses.png` |
| 5 | User attempts to reconnect failed channel (LinkedIn) | Re-authentication flow initiated with platform OAuth | `05-reconnect-linkedin.png` |
| 6 | User updates profile or organization settings | Changes saved, success toast shown | `06-settings-saved.png` |

### Connected Accounts Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User clicks "Add Channel" or "Connect Account" | Platform selection modal opens with available networks | `03-add-channel-dialog.png` |
| 2 | User selects a platform (Instagram, LinkedIn, etc.) | Platform-specific OAuth flow initiated | `08-platform-select.png` |
| 3 | User authenticates with platform | OAuth consent screen, permissions review, callback to Buffer | `09-oauth-flow.png` |
| 4 | Channel successfully connected | Confirmation toast, channel appears in connected list with "Connected" badge | `10-channel-connected.png` |
| 5 | User disconnects a channel | Confirmation dialog, channel removed from list, warning about queued posts | `11-disconnect-confirm.png` |

### Connection Error Recovery (LinkedIn)

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User sees LinkedIn showing "Connection Error" status | Error badge visible on LinkedIn channel card | `12-linkedin-error.png` |
| 2 | User clicks "Fix" or "Reconnect" on LinkedIn card | LinkedIn OAuth flow re-initiated | `13-reconnect-trigger.png` |
| 3 | User grants permissions in LinkedIn OAuth | Token refreshed, connection re-established | `14-linkedin-oauth.png` |
| 4 | Connection restored | LinkedIn card shows "Connected" green badge. Queued posts resume publishing. | `15-linkedin-restored.png` |

### Profile & Organization Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 3 | User navigates to Profile settings | Current profile info displayed: email, name, avatar, notification preferences, and timezone settings | `03-profile-settings.png` |
| 4 | User updates profile information | Fields editable, save on confirm | `17-profile-edit.png` |
| 5 | User navigates to Organization settings | "My Organization" displayed with member list | `18-organization-view.png` |
| 6 | User updates organization name or adds members | Changes saved, invitations sent for new members | `19-organization-edit.png` |

## Key States

### Connection Error State
**When**: A connected channel's OAuth token has expired or been revoked
**Behavior**: Channel card shows red error badge with "Connection Error" label. "Reconnect" button prominent. Queued posts for that channel show warning status. Posts not yet published are held until reconnection.
**Screenshot**: `shared/04-empty-state.png` (for reference: empty channel list state)

### Loading State
**When**: Settings page or connection status loading
**Behavior**: Skeleton cards for each channel section. Status badges load last (after channel info).

### Permission Denied State
**When**: User lacks permission to modify organization settings
**Behavior**: Settings sections grayed out with lock icon. Tooltip: "Contact organization admin to change this setting."

## Connected Channels Summary

| Channel | Status | Notes |
|---------|--------|-------|
| Instagram | Connected | Active, publishing enabled |
| Threads | Connected | Active, publishing enabled |
| Bluesky | Connected | Active, publishing enabled |
| LinkedIn | Connection Error | Token expired or revoked, needs reconnection |

**Channel Slots**: 1/3 connected (free plan limitation)

## Settings Sections

| Section | Description |
|---------|-------------|
| **Profile** | Name, email, avatar, password |
| **Connected Accounts** | Social channel connections, reconnection, disconnection |
| **Organization** | "My Organization" settings, member management |
| **Posting Schedule** | Time slots configuration, timezone (Dubai, UTC+4) |
| **Notifications** | Email and in-app notification preferences |
| **Integrations** | Third-party tool connections |
| **Billing** | Plan details, upgrade/downgrade options |

## Navigation
- **Access**: Avatar dropdown > Settings, or direct URL
- **Related Flows**:
  - Flow 1.1 — Authentication & Onboarding (account context)
  - Flow 4.1 — Scheduling & Publishing (posting schedule configuration)
  - Flow 8.1 — Publishing & Channel Management (channel status affects publishing)

## User Context
- **Account Email**: `kanishkanamdeo@hotmail.com`
- **Organization**: "My Organization"
- **Time Zone**: Dubai (UTC+4)
