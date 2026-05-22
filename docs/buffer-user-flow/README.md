# Buffer User Flow Documentation

Comprehensive user flow documentation for Buffer's web application, captured through systematic UI analysis. This documentation serves as a reference for understanding Buffer's UX patterns, interaction models, and feature implementation details to inform the development of Social Beam.

**Last Updated**: 2026-05-21
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
│   └── 01-community-page.png
├── flow-01-auth-onboarding/           # Authentication & onboarding flows
│   ├── flow.md
│   └── screenshots/
│       ├── 01-login-page.png
│       ├── 02-email-entry.png
│       ├── 03-authentication.png
│       ├── 04-dashboard-redirect.png
│       └── 05-welcome-checklist.png
├── flow-02-dashboard-home/            # Dashboard landing & home view
│   ├── flow.md
│   └── screenshots/
│       ├── 01-dashboard-overview.png
│       ├── 02-dashboard-content.png
│       ├── 03-quick-action-create.png
│       └── 04-sidebar-navigation.png
├── flow-03-post-creation/             # Post compose, ideation & AI assistant
│   ├── flow.md
│   └── screenshots/
│       ├── 01-compose-blank.png
│       ├── 02-platform-select.png
│       ├── 03-text-entry.png
│       ├── 04-media-attach.png
│       ├── 05-platform-variations.png
│       ├── 06-draft-saved.png
│       ├── 07-ai-panel-open.png
│       ├── 08-ai-generating.png
│       ├── 09-ai-inserted.png
│       ├── 10-ideas-board.png
│       ├── 11-new-idea.png
│       └── 12-idea-to-post.png
├── flow-04-scheduling/                # Time slot selection & queue management
│   ├── flow.md
│   └── screenshots/
│       ├── 01-schedule-trigger.png
│       ├── 02-available-slots.png
│       ├── 03-slot-selection.png
│       ├── 04-schedule-confirm.png
│       ├── 05-queue-view.png
│       ├── 06-queue-loaded.png
│       ├── 07-queue-reorder.png
│       ├── 08-add-to-queue.png
│       ├── 09-queue-edit.png
│       ├── 10-recurring-setup.png
│       ├── 11-recurring-pattern.png
│       └── 12-recurring-confirm.png
├── flow-05-analytics/                 # Analytics, insights & recommendations
│   ├── flow.md
│   └── screenshots/
│       ├── 01-insights-overview.png
│       ├── 02-metrics-summary.png
│       ├── 03-date-filter.png
│       ├── 04-platform-analytics.png
│       ├── 05-post-analytics.png
│       ├── 06-post-detail.png
│       ├── 07-engagement-breakdown.png
│       ├── 08-cross-platform.png
│       ├── 09-audience-chart.png
│       ├── 10-growth-trends.png
│       ├── 11-content-types.png
│       ├── 12-recommendations.png
│       ├── 13-suggestions.png
│       └── 14-apply-recommendation.png
├── flow-06-calendar/                  # Calendar view & queue management
│   ├── flow.md
│   └── screenshots/
│       ├── 01-queue-view.png
│       ├── 02-calendar-view.png
│       ├── 03-date-detail.png
│       ├── 04-drag-reschedule.png
│       ├── 05-weekly-overview.png
│       ├── 06-view-toggle.png
│       ├── 07-period-nav.png
│       ├── 08-today-button.png
│       ├── 09-platform-filter.png
│       ├── 10-queue-list.png
│       ├── 11-queue-reorder.png
│       ├── 12-move-to-drafts.png
│       └── 13-duplicate-post.png
├── flow-07-settings/                  # Account, channels & organization settings
│   ├── flow.md
│   └── screenshots/
│       ├── 01-avatar-dropdown.png
│       ├── 02-settings-page.png
│       ├── 03-connected-accounts.png
│       ├── 04-account-statuses.png
│       ├── 05-reconnect-linkedin.png
│       ├── 06-settings-saved.png
│       ├── 07-add-channel.png
│       ├── 08-platform-select.png
│       ├── 09-oauth-flow.png
│       ├── 10-channel-connected.png
│       ├── 11-disconnect-confirm.png
│       ├── 12-linkedin-error.png
│       ├── 13-reconnect-trigger.png
│       ├── 14-linkedin-oauth.png
│       ├── 15-linkedin-restored.png
│       ├── 16-profile-view.png
│       ├── 17-profile-edit.png
│       ├── 18-organization-view.png
│       └── 19-organization-edit.png
├── flow-08-publishing/                # Publishing execution & sent history
│   ├── flow.md
│   └── screenshots/
│       ├── 01-publish-trigger.png
│       ├── 02-publish-execution.png
│       ├── 03-published-status.png
│       ├── 04-sent-tab.png
│       ├── 05-view-on-platform.png
│       ├── 06-queue-check.png
│       ├── 07-token-check.png
│       ├── 08-content-format.png
│       ├── 09-api-response.png
│       ├── 10-status-recorded.png
│       ├── 11-publish-fail.png
│       ├── 12-failed-status.png
│       ├── 13-failure-notification.png
│       ├── 14-retry-publish.png
│       ├── 15-reconnect-redirect.png
│       ├── 16-sent-list.png
│       ├── 17-sent-filter.png
│       ├── 18-sent-detail.png
│       └── 19-sent-export.png
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

- `01-community-page.png` — Community page (not yet documented in a dedicated flow)

---

## Flow Index

| # | Flow | Priority | Screenshots | Key Topics |
|---|------|----------|-------------|------------|
| 1 | [Authentication & Onboarding](flow-01-auth-onboarding/flow.md) | P0 | 5 | Login, registration, OAuth, welcome checklist, empty/error/loading states |
| 2 | [Dashboard & Home](flow-02-dashboard-home/flow.md) | P0 | 4 | Dashboard landing, activity summary, quick actions, sidebar navigation |
| 3 | [Post Creation & Ideation](flow-03-post-creation/flow.md) | P0 | 12 | Compose interface, platform targeting, media attachment, AI assistant, ideas board |
| 4 | [Scheduling & Publishing](flow-04-scheduling/flow.md) | P0 | 12 | Time slot selection, queue management, recurring posts, timezone handling |
| 5 | [Analytics & Insights](flow-05-analytics/flow.md) | P1 | 14 | Performance metrics, post analytics, audience growth, AI recommendations |
| 6 | [Calendar & Queue Management](flow-06-calendar/flow.md) | P0 | 13 | Calendar views, drag-and-drop, week/month/list views, queue operations |
| 7 | [Settings & Account Management](flow-07-settings/flow.md) | P0 | 19 | Connected accounts, OAuth reconnection, profile, organization, error recovery |
| 8 | [Publishing & Channel Management](flow-08-publishing/flow.md) | P0 | 19 | Publishing pipeline, status lifecycle, failed publishing, sent history |

**Total**: 8 documented flows, 88 screenshots

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
- Flow 5 (Analytics) is marked P1 — it was not fully explored during the initial capture session (welcome checklist item "View analytics" was incomplete)
- The Community section has a shared screenshot but no dedicated flow documentation yet
