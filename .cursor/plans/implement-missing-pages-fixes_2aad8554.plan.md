---
name: implement-missing-pages-fixes
overview: Fix the web splash overlay blocker, add missing shadcn UI components, implement all 6 missing pages (Login, Signup, Dashboard, Compose, Calendar, Analytics, Settings), update the app layout and routing, and replace the Explore template with real content.
todos:
  - id: task-1-splash-web
    content: "Task 1: Fix AnimatedSplashOverlay for web - make it dismissible/non-blocking since reanimated doesn't run in browser"
    status: completed
  - id: task-2-shadcn-components
    content: "Task 2: Install required shadcn UI components (Button, Card, Input, Badge, Tabs, Dialog, Select, Switch, Textarea, Label, Avatar, Separator, Progress, Popover, DropdownMenu, ScrollArea, Command, Toast) via npx @react-native-reusables/cli@latest add"
    status: completed
  - id: task-3-layout-nav
    content: "Task 3: Update (app)/_layout.tsx with ThemeProvider + PortalHost, update app-tabs.web.tsx with new routes (compose, calendar, analytics, settings), update root _layout.tsx to register login/signup screens, update app/index.tsx redirect logic"
    status: completed
  - id: task-4-login-signup
    content: "Task 4: Create src/app/login.tsx and src/app/signup.tsx with Zod-validated forms, links between them, integrate with existing JWT auth middleware"
    status: completed
  - id: task-5-dashboard
    content: "Task 5: Replace (app)/index.tsx with full dashboard per DESIGN.md Section 3.1 - create StatCard, PostStatusBadge, UpcomingPostItem, AccountStatusCard, EmptyState components"
    status: completed
  - id: task-6-compose
    content: "Task 6: Create (app)/compose.tsx with AI Compose and Manual Compose modes, create PlatformSelector, PlatformPreview, AICompose, ManualCompose components"
    status: completed
  - id: task-7-calendar
    content: "Task 7: Create (app)/calendar.tsx with month/week/day views, create CalendarView, DayCell, PostChip components with AI gap indicators"
    status: completed
  - id: task-8-analytics
    content: "Task 8: Create (app)/analytics.tsx with time period selector, platform filters, metric cards, trend charts, insight cards - create MetricCard, TrendChart, InsightCard components"
    status: completed
  - id: task-9-settings
    content: "Task 9: Create (app)/settings.tsx with sidebar nav sections (profile, accounts, notifications, theme, AI) - create SettingsNav, ProfileSection, ConnectedAccountsTable, NotificationPrefs, AISettings components"
    status: completed
  - id: task-10-explore-replace
    content: "Task 10: Replace (app)/explore.tsx Expo template with real SocialBeam project content and remove dead src/app/(app)/tabs.tsx file"
    status: completed
isProject: false
---

# Implement Missing Pages and Fixes - SocialBeam MVP

## Overview

The app is in early MVP stage with only onboarding and a blank dashboard implemented. This plan fixes the web splash overlay blocker, installs essential UI components, and builds all 6 missing pages (Login, Signup, Dashboard, Compose, Calendar, Analytics, Settings) plus updates the app layout and navigation.

---

## Research Summary

### Expo Router v55 Web Support

- Route groups `(app)` don't add URL segments; files inside map directly to URLs
- `expo-router/ui` provides `Tabs`, `TabList`, `TabTrigger`, `TabSlot`, `TabContent` for web tab navigation
- Web layout uses `Platform.OS === 'web'` conditional rendering
- Source: [Expo Router Web docs](https://docs.expo.dev/router/reference/platforms/#web) (2026)

### React Native Reusables (shadcn/ui for RN) v4

- Uses Nativewind v4 with Tailwind CSS for styling
- Components added via `npx @react-native-reusables/cli@latest add <component>`
- All components use semantic Tailwind tokens (bg-background, text-foreground)
- Components are built on `@rn-primitives` (Radix UI for RN)
- Source: [React Native Reusables docs](https://rnr-docs.com) (2026)

### react-native-reanimated Web Limitation

- `react-native-reanimated` animations don't execute in the browser
- Web-specific variants (`*.web.tsx`) should use CSS transitions instead
- Source: [React Native Web docs](https://necolas.github.io/react-native-web/docs/animations/) (2026)

---

## Implementation Approach

### Phase 1: Infrastructure Fixes

1. Fix splash overlay for web
2. Install all required shadcn UI components
3. Update app layout with proper ThemeProvider, PortalHost, and navigation

### Phase 2: Authentication

1. Create Login and Signup pages with full form validation, connected to existing JWT auth middleware

### Phase 3: Feature Pages

1. Build Dashboard per DESIGN.md blueprint (stat cards, recent posts, upcoming, connected accounts, empty state)
2. Build Compose page (AI + Manual modes per DESIGN.md)
3. Build Calendar page (month/week/day views, post chips, drag-drop)
4. Build Analytics page (time period, platform filter, metrics, charts)
5. Build Settings page (profile, accounts, notifications, theme, AI prefs)
6. Replace Explore template with real content

---

## File Changes


| File                                                 | Change                                                                  | API/Pattern Used                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| `src/components/animated-icon.web.tsx`               | Modify: Make splash dismissible/hidden on web, no reanimated dependency | CSS-only splash or skip                      |
| `src/components/ui/*` (18 components)                | Create: via shadcn CLI                                                  | `npx @react-native-reusables/cli@latest add` |
| `src/app/login.tsx`                                  | Create: Login page with email/password form, link to signup             | Zod validation, existing auth hooks          |
| `src/app/signup.tsx`                                 | Create: Signup page with name/email/password form, link to login        | Zod validation, existing auth hooks          |
| `src/app/_layout.tsx`                                | Modify: Add login/signup to Stack, handle splash better on web          | expo-router Stack                            |
| `src/app/index.tsx`                                  | Modify: Redirect based on auth state, not just onboarding               | useAuth hook                                 |
| `src/app/(app)/_layout.tsx`                          | Modify: Add ThemeProvider, PortalHost, proper app shell                 | @react-navigation/native                     |
| `src/app/(app)/index.tsx`                            | Replace: Full dashboard per DESIGN.md Section 3.1                       | StatCard, PostStatusBadge, etc.              |
| `src/components/dashboard/StatCard.tsx`              | Create: Metric card with value, label, trend arrow                      | Tailwind tokens                              |
| `src/components/dashboard/PostStatusBadge.tsx`       | Create: Status badge with icon + color + text                           | post.* tokens                                |
| `src/components/dashboard/UpcomingPostItem.tsx`      | Create: Scheduled post row                                              | Tailwind tokens                              |
| `src/components/dashboard/AccountStatusCard.tsx`     | Create: Account mini-card with status dot                               | success/warning/error tokens                 |
| `src/components/dashboard/EmptyState.tsx`            | Create: Four-property framework empty state                             | DESIGN.md Section 5                          |
| `src/app/(app)/compose.tsx`                          | Create: AI Compose + Manual Compose modes                               | DESIGN.md Section 3.2                        |
| `src/components/compose/AICompose.tsx`               | Create: AI compose input, platform selector, draft cards                | ai.* tokens, compose.* tokens                |
| `src/components/compose/ManualCompose.tsx`           | Create: Text area, character counter, media drop                        | Tailwind tokens                              |
| `src/components/compose/PlatformSelector.tsx`        | Create: Multi-select platform badges                                    | Tailwind tokens                              |
| `src/components/compose/PlatformPreview.tsx`         | Create: Platform-specific post preview                                  | Tailwind tokens                              |
| `src/app/(app)/calendar.tsx`                         | Create: Calendar with month/week/day views                              | DESIGN.md Section 3.3                        |
| `src/components/calendar/CalendarView.tsx`           | Create: Main calendar component                                         | calendar.* tokens                            |
| `src/components/calendar/DayCell.tsx`                | Create: Calendar day with post chips                                    | post.* tokens                                |
| `src/components/calendar/PostChip.tsx`               | Create: Compact post chip with platform strip                           | Tailwind tokens                              |
| `src/app/(app)/analytics.tsx`                        | Create: Analytics dashboard                                             | DESIGN.md Section 3.4                        |
| `src/components/analytics/MetricCard.tsx`            | Create: Analytics metric card                                           | chart.* tokens                               |
| `src/components/analytics/TrendChart.tsx`            | Create: Trend line/bar chart                                            | chart.c1-c10 tokens                          |
| `src/components/analytics/InsightCard.tsx`           | Create: AI insight card with action button                              | ai.* tokens                                  |
| `src/app/(app)/settings.tsx`                         | Create: Settings with sidebar navigation                                | DESIGN.md Section 3.5                        |
| `src/components/settings/SettingsNav.tsx`            | Create: Settings sidebar nav                                            | Tailwind tokens                              |
| `src/components/settings/ProfileSection.tsx`         | Create: Profile edit form                                               | Tailwind tokens                              |
| `src/components/settings/ConnectedAccountsTable.tsx` | Create: Accounts table with status                                      | table.* tokens                               |
| `src/components/settings/NotificationPrefs.tsx`      | Create: Notification toggle preferences                                 | Switch component                             |
| `src/components/settings/AISettings.tsx`             | Create: Brand voice, autonomy, guardrails settings                      | ai.* tokens                                  |
| `src/components/app-tabs.web.tsx`                    | Modify: Add Compose, Calendar, Analytics, Settings tabs                 | expo-router/ui Tabs                          |
| `src/app/(app)/explore.tsx`                          | Replace: Real content (remove Expo template)                            | Tailwind tokens                              |


---

## Verification Steps

- `npm run web` loads without errors on [http://localhost:8081](http://localhost:8081)
- No splash overlay blocking content on web
- Login page at `/login` renders with form fields
- Signup page at `/signup` renders with form fields
- Dashboard at `/` shows stat cards, recent posts, upcoming, connected accounts (or empty state)
- Compose page at `/compose` shows AI + Manual compose modes
- Calendar page at `/calendar` shows calendar with at least month view
- Analytics page at `/analytics` shows metric cards and charts
- Settings page at `/settings` shows sidebar navigation and sections
- Sidebar navigation works between all pages
- No TypeScript errors: `npx tsc --noEmit` (0 errors on modified files)
- No lint errors: `npx eslint src/` (0 errors on modified files)
- All pages use semantic Tailwind tokens (no hardcoded colors)
- All interactive elements use shadcn UI components (no raw RN primitives for UI)

---

## Breaking Changes & Migrations

**None expected** - all changes are additive (new pages, new components). Existing onboarding flow remains unchanged.

---

## Security Considerations

**Authentication forms**:

- Login/Signup forms will use Zod for input validation (email format, password length)
- Passwords should never be displayed or logged
- Forms will connect to existing JWT auth middleware at `src/server/middleware/auth.ts`
- No client-side storage of credentials (use secure HTTP-only cookies or secure storage)

---

## Architecture Overview

```
src/app/
├── _layout.tsx              # Root Stack: auth + (app) + onboarding + login + signup
├── index.tsx                # Entry: redirects based on auth + onboarding state
├── login.tsx                # NEW: Login page
├── signup.tsx               # NEW: Signup page
│
├── (app)/                   # Main authenticated app
│   ├── _layout.tsx          # UPDATED: ThemeProvider + PortalHost + app shell
│   ├── index.tsx            # REPLACED: Full dashboard
│   ├── compose.tsx          # NEW: Compose page
│   ├── calendar.tsx         # NEW: Calendar page
│   ├── analytics.tsx        # NEW: Analytics page
│   ├── settings.tsx         # NEW: Settings page
│   └── explore.tsx          # REPLACED: Real content
│
└── onboarding/              # Unchanged existing flow
    ├── _layout.tsx
    ├── index.tsx
    ├── connect.tsx
    └── review.tsx
```

---

## Execution Order

Tasks execute sequentially. Each task builds on the previous one's artifacts.

1. Fix splash → 2. Install components → 3. Update layout/nav → 4. Login/Signup → 5. Dashboard → 6. Compose → 7. Calendar → 8. Analytics → 9. Settings → 10. Explore replace

