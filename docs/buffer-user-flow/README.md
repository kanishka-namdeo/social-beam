# Buffer User Flow Documentation

Comprehensive user flow documentation for Buffer's web application, captured through systematic UI analysis. This documentation serves as a reference for understanding Buffer's UX patterns, interaction models, and feature implementation details to inform the development of Social Beam.

**Last Updated**: 2026-05-26
**Status**: Active
**Account**: kanishkanamdeo@hotmail.com — "My Organization" (Dubai, UTC+4)

---

## Purpose

This documentation captures Buffer's end-to-end user flows to:

- Understand competitor UX patterns and interaction models
- Identify feature gaps and opportunities for Social Beam differentiation
- Provide visual reference for UI/UX design decisions
- Serve as a baseline for feature feasibility analysis
- Inform AI-native feature proposals aligned with user expectations

---

## Directory Structure

```
docs/buffer-user-flow/
├── README.md                          # This file — master index and overview
├── shared/                            # Screenshots not specific to a single flow
│   ├── 01-community-page.png
│   ├── 02-community-engagement.png
│   ├── 03-add-channel-dialog.png
│   ├── 04-empty-state.png
│   ├── 05-filter-dialog.png
│   ├── 07-view-streak-popup.png
│   ├── 08-mobile-schedule.png
│   ├── 09-mobile-ideas.png
│   ├── 10-mobile-insights.png
│   ├── 11-approvals-upgrade-gate.png
│   ├── 12-feedback-dialog.png
│   ├── 13-sidebar-collapsed.png
│   └── 14-sidebar-expanded.png
├── flow-01-auth-onboarding/           # Authentication & onboarding flows
│   ├── flow.md
│   └── screenshots/
│       ├── 01-login-page.png
│       └── 03-welcome-checklist.png
├── flow-02-dashboard-home/            # Dashboard landing & home view
│   ├── flow.md
│   └── screenshots/
│       ├── 01-community-tab.png
│       └── 02-community-filters.png
├── flow-03-post-creation/             # Post compose, ideation & AI assistant
│   ├── flow.md
│   └── screenshots/
│       ├── 01-ideas-board.png
│       ├── 02-ai-assistant.png
│       ├── 03-compose-interface.png
│       ├── 04-templates.png
│       ├── 05-new-post-dialog.png
│       ├── 07-media-upload.png
│       ├── 08-feeds-tab.png
│       └── 09-generate-ideas-dialog.png
├── flow-04-scheduling/                # Time slot selection & queue management
│   ├── flow.md
│   └── screenshots/
│       ├── 01-schedule-list-view.png
│       ├── 01-schedule-queue.png
│       ├── 02-queue-management.png
│       └── 03-more-actions-menu.png
├── flow-05-analytics/                 # Analytics, insights & recommendations
│   ├── flow.md
│   └── screenshots/
│       ├── 01-insights-dashboard.png
│       ├── 02-post-performance.png
│       ├── 03-insights-beta.png
│       ├── 04-date-range-filter.png
│       └── 05-metric-cards.png
├── flow-06-calendar/                  # Calendar view & queue management
│   ├── flow.md
│   └── screenshots/
│       ├── 01-calendar-queue-view.png
│       ├── 02-drafts-view.png
│       └── 03-calendar-view.png
├── flow-07-settings/                  # Account, channels & organization settings
│   ├── flow.md
│   └── screenshots/
│       ├── 01-connected-channels.png
│       ├── 02-organization-settings.png
│       ├── 03-profile-settings.png
│       ├── 04-channel-specific-settings.png
│       ├── 05-settings-navigation.png
│       ├── 06-channel-settings.png
│       └── 07-organization-menu.png
├── flow-08-publishing/                # Publishing execution & sent history
│   ├── flow.md
│   └── screenshots/
│       └── 01-sent-posts.png
```

---

## Account Context

All flows were captured using the following account configuration:

| Field | Value |
|-------|-------|
| **Account Email** | `kanishkanamdeo@hotmail.com` |
| **Organization** | "My Organization" |
| **Time Zone** | Dubai (UTC+4) |
| **View Streak** | 5 days |
| **Plan** | Free plan (1/3 channel slots used) |

### Connected Channels

| Channel | Status | Notes |
|---------|--------|-------|
| Instagram | Connected | Active, publishing enabled |
| Threads | Connected | Active, publishing enabled |
| Bluesky | Connected | Active, publishing enabled |
| LinkedIn | Connection Error | Token expired/revoked, requires reconnection |

### Posting Schedule

| Day | Time (Dubai, UTC+4) | Frequency |
|-----|---------------------|-----------|
| Tuesday | 9:57 AM | Weekly |
| Tuesday | 10:26 AM | Weekly |
| Thursday | 9:37 AM | Weekly |

### Platform Character Limits

| Platform | Limit | Warning Threshold |
|----------|-------|-------------------|
| Instagram (caption) | 2,200 chars | 2,000 |
| Threads | 500 chars | 450 |
| Bluesky | 300 chars | 270 |
| LinkedIn | 3,000 chars | 2,800 |

---

## Buffer Navigation Structure

Buffer's primary navigation is organized into four main sections accessible via the sidebar:

| Section | URL Path | Description |
|---------|----------|-------------|
| **Create** | `/compose`, `/publish?mode=new` | Content creation workspace with compose interface, ideas board, and templates |
| **Publish** | `/publish` | Publishing management with Queue, Drafts, Approvals, and Sent tabs |
| **Community** | `/community` | Social engagement tools (captured in shared screenshots) |
| **Insights** | `/insights` | Analytics dashboard with performance metrics, audience growth, and recommendations |
| **Settings** | `/settings` | Account management, connected channels, organization, posting schedule, notifications |

### Sub-Navigation

| Section | Tab/Route | Description |
|---------|-----------|-------------|
| Create | `/compose` | Post compose interface |
| Create | Ideas | Saved and AI-generated content ideas |
| Create | Templates | Reusable post templates |
| Create | Feeds | Content feed sources |
| Publish | Queue | Scheduled posts in chronological order |
| Publish | Drafts | Unpublished draft posts |
| Publish | Approvals | Posts awaiting approval (team workflows) |
| Publish | Sent | Published post history |
| Insights | Overview | Aggregate performance metrics |
| Insights | Audience | Follower growth and demographics |
| Insights | Recommendations | AI-generated posting suggestions |
| Settings | Profile | Name, email, avatar, password |
| Settings | Connected Accounts | Social channel management |
| Settings | Organization | Team and workspace settings |
| Settings | Posting Schedule | Time slot and timezone configuration |
| Settings | Notifications | Email and in-app preferences |
| Settings | Integrations | Third-party connections |
| Settings | Billing | Plan management |

---

## Screenshot Conventions

### Naming Pattern

Screenshots follow a zero-padded sequential numbering scheme:

```
NN-descriptive-name.png
```

- `NN` — Two-digit sequential number (01, 02, 03, ...)
- `descriptive-name` — Kebab-case identifier of the screen state
- All screenshots are stored in `screenshots/` subdirectory within each flow folder

### Example

| Filename | Meaning |
|----------|---------|
| `01-login-page.png` | First screenshot — login page |
| `07-ai-panel-open.png` | Seventh screenshot — AI assistant panel opened |
| `12-recurring-confirm.png` | Twelfth screenshot — recurring post confirmation |

### Shared Screenshots

Screenshots in the `shared/` directory are not specific to a single flow and may be referenced across multiple flows. The `shared/` directory contains:

- `01-community-page.png` — Community page
- `02-community-engagement.png` — Community engagement view
- `03-add-channel-dialog.png` — Add channel dialog
- `04-empty-state.png` — Empty state placeholder
- `05-filter-dialog.png` — Filter dialog
- `07-view-streak-popup.png` — View streak popup
- `08-mobile-schedule.png` — Mobile schedule view
- `09-mobile-ideas.png` — Mobile ideas view
- `10-mobile-insights.png` — Mobile insights view
- `11-approvals-upgrade-gate.png` — Approvals upgrade gate
- `12-feedback-dialog.png` — Feedback dialog
- `13-sidebar-collapsed.png` — Collapsed sidebar
- `14-sidebar-expanded.png` — Expanded sidebar

---

## Flow Index

| # | Flow | Priority | Screenshots | Key Topics |
|---|------|----------|-------------|------------|
| 1 | [Authentication & Onboarding](flow-01-auth-onboarding/flow.md) | P0 | 2 | Login page, welcome checklist |
| 2 | [Dashboard & Home](flow-02-dashboard-home/flow.md) | P0 | 2 | Community tab, community filters |
| 3 | [Post Creation & Ideation](flow-03-post-creation/flow.md) | P0 | 8 | Ideas board, AI assistant, compose interface, templates, new post dialog, media upload, feeds tab, generate ideas dialog |
| 4 | [Scheduling & Publishing](flow-04-scheduling/flow.md) | P0 | 4 | Schedule list view, queue view, queue management, more actions menu |
| 5 | [Analytics & Insights](flow-05-analytics/flow.md) | P1 | 5 | Insights dashboard, post performance, insights beta, date range filter, metric cards |
| 6 | [Calendar & Queue Management](flow-06-calendar/flow.md) | P0 | 3 | Calendar queue view, drafts view, calendar view |
| 7 | [Settings & Account Management](flow-07-settings/flow.md) | P0 | 7 | Connected channels, organization settings, profile settings, channel-specific settings, settings navigation, channel settings, organization menu |
| 8 | [Publishing & Channel Management](flow-08-publishing/flow.md) | P0 | 1 | Sent posts view |

**Total**: 8 documented flows, 32 flow screenshots + 13 shared = 45 total

---

## Flow Relationships

```
┌──────────────────────────────────────────────────────────────────┐
│                     Buffer User Flow Map                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Flow 1] Auth/Onboarding                                        │
│       │                                                          │
│       ▼                                                          │
│  [Flow 2] Dashboard Home ────────┐                               │
│       │                          │                               │
│       ▼                          │                               │
│  [Flow 3] Post Creation          │                               │
│       │                          │                               │
│       ▼                          │                               │
│  [Flow 4] Scheduling             │                               │
│       │                          │                               │
│       ▼                          ▼                               │
│  [Flow 6] Calendar ◄──────── [Flow 7] Settings                   │
│       │                          │                               │
│       ▼                          │                               │
│  [Flow 8] Publishing ────────────┘                               │
│       │                                                          │
│       ▼                                                          │
│  [Flow 5] Analytics                                               │
│                                                                  │
│  Shared resources: Community page, OAuth callbacks, error states │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

These Buffer user flow docs should be cross-referenced with:

| Document | Path | Purpose |
|----------|------|---------|
| **Buffer Feature Mapping** | `docs/competitor-analysis/buffer-features-mapping.md` | Feature inventory with vote counts and demand signals |
| **Buffer Feasibility Analysis** | `docs/competitor-analysis/buffer-features-feasibility-2026.md` | API constraints and platform limitations |
| **Product Vision** | `docs/tool-vision-and-market-research.md` | AI-native positioning and monetization strategy |
| **User Flows (Social Beam)** | `docs/user-flows-ai-native.md` | Social Beam's own user flow patterns |
| **MVP Scope** | `docs/mvp-scope.md` | Feature scope for Social Beam v1 |
| **Design System** | `DESIGN.md` | UI component patterns and design intent |

---

## How to Update This Documentation

### Adding a New Flow

1. Create a new directory: `flow-NN-flow-name/`
2. Create `flow.md` using the standard template (see any existing `flow.md` for structure)
3. Create `screenshots/` subdirectory
4. Add screenshots following the `NN-descriptive-name.png` convention
5. Update this README:
   - Add entry to **Directory Structure** tree
   - Add entry to **Flow Index** table
   - Update **Total** screenshot count
   - Update **Flow Relationships** diagram if applicable

### Updating an Existing Flow

1. Edit the flow's `flow.md` to add/update steps, states, or metadata
2. Add new screenshots to `screenshots/` following the naming convention
3. Update the **Screenshot Count** in the flow's header
4. Update this README's **Flow Index** table if screenshot count changed

### Regenerating Screenshots

1. Navigate to the relevant Buffer URL
2. Capture screenshots showing each step of the user journey
3. Name using `NN-descriptive-name.png` format
4. Replace existing screenshots in `screenshots/` directory
5. Update `flow.md` if step descriptions changed

### Updating Account Context

If account configuration changes (new channels connected, timezone change, etc.):

1. Update the **Account Context** section in this README
2. Update the **Connected Channels** table
3. Update the **Posting Schedule** table if applicable
4. Update individual flow `flow.md` files if they reference account-specific data

---

## Notes

- All timestamps and schedules in screenshots reflect Dubai timezone (UTC+4)
- The LinkedIn connection error documented in Flow 7.1 and Flow 8.1 is a known OAuth token expiry issue
- Flow 5 (Analytics) is marked P1 — partial capture (5 screenshots covering dashboard, post performance, metric cards, date range filter, and insights beta)
- Many flows have fewer screenshots than originally planned — gaps exist where flows were scoped but not fully captured. Key gaps:
  - **Flow 1**: Missing registration, email entry, dashboard redirect
  - **Flow 2**: Missing dashboard overview, quick actions, sidebar navigation
  - **Flow 3**: Missing platform variations, draft states, AI generating/inserted states, idea-to-post flow
  - **Flow 4**: Missing schedule trigger, available slots, recurring post setup
  - **Flow 6**: Missing drag-and-drop, view toggle, period navigation, queue reorder, platform filter
  - **Flow 7**: Missing OAuth flow, disconnect/reconnect flows, LinkedIn error recovery, profile edit, organization edit
  - **Flow 8**: Missing publish trigger, execution, failed/retry states, sent detail/export
- The Community section has shared screenshots but no dedicated flow documentation yet
- The `shared/` directory has 13 screenshots including mobile views and sidebar states
