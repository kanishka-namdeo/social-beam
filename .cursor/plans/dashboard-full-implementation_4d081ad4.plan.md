---
name: dashboard-full-implementation
overview: "Build the complete SocialBeam dashboard: add Prisma schema models for posts/scheduling/analytics, install missing shadcn components, refactor the existing dashboard page, and implement all widgets per DESIGN.md and user-flows spec."
todos:
  - id: schema-models
    content: "Add Prisma models: Post, PostSchedule, PostPlatform, AnalyticsSnapshot, add relations to Workspace"
    status: completed
  - id: schema-migrate-seed
    content: Run prisma generate + prisma db push, create seed script for realistic mock data
    status: completed
  - id: install-shadcn
    content: "Install shadcn components: Separator, Skeleton, Tabs, Avatar, Tooltip, DropdownMenu, Dialog, Toast/Sonner, Progress, Accordion, Switch, Select"
    status: completed
  - id: dashboard-widgets
    content: "Create reusable dashboard widgets: RecentPostsList, AIInsightsCard, CalendarPreview, AIStatusPanel, StartingVerbs, EmptyState"
    status: completed
  - id: rewrite-dashboard-page
    content: "Rewrite dashboard page: assemble widgets, server-client split, streaming loading states, auth guard, data fetching"
    status: completed
  - id: api-routes
    content: Create API routes for posts (list/recent), calendar (7-day), analytics (insights/snapshots)
    status: completed
  - id: enhance-layout
    content: "Update dashboard layout: active nav highlighting, workspace name from DB, notification bell, mobile sidebar"
    status: completed
  - id: verification
    content: Run typecheck, lint, build — fix all errors
    status: completed
isProject: false
---

# SocialBeam Dashboard — Full Implementation

## Overview

Transform the minimal existing dashboard into a complete, production-ready dashboard per DESIGN.md Section 2.2 and user-flows Section 6. This includes: database schema for posts/scheduling/analytics, reusable dashboard widgets, API routes, layout enhancements, and the worked-example empty state.

---

## Research Summary

**Next.js 16 App Router (2026)**:
- Server Components by default; use `"use client"` only for interactivity (event handlers, state)
- Use `loading.tsx` for Suspense-based streaming; nested layouts for dashboard structure
- Source: [Reformat — Next.js 16 App Router Practical Guide](https://reformat.pro/blog/nextjs-16-app-router-practical-guide) (2026)
- Source: [ZTABS — Next.js App Router Best Practices 2026](https://ztabs.co/blog/nextjs-app-router-best-practices) (2026)

**shadcn/ui Dashboard Patterns (2026)**:
- Core components: Sidebar, Table, Card, Chart, Badge, Separator, Skeleton, Avatar, Tabs, Tooltip, Dialog, DropdownMenu
- TanStack Table for sortable/filterable data; Recharts for charts with automatic dark mode
- Source: [AdminLTE — shadcn/ui Dashboard Guide 2026](https://adminlte.io/blog/build-admin-dashboard-shadcn-nextjs/) (2026)
- Source: [DesignRevision — shadcn Dashboard Tutorial 2026](https://designrevision.com/blog/shadcn-dashboard-tutorial) (2026)

**Prisma 7 + PostgreSQL (2025-2026)**:
- TypeScript-based engine, new `prisma.config.js` pattern, multi-file schema support
- Source: [Medium — Getting Started with Prisma 7](https://medium.com/@faresahmednabih/getting-started-with-prisma-7-with-nodejs-postgresql-1bb4de3c8336) (2025)

---

## Implementation Approach

### Phase 1: Database Schema & Migration (tasks 1-2)

Add 4 new Prisma models to [`prisma/schema.prisma`](prisma/schema.prisma):

**Post** — the core content entity
```
model Post {
  id           String   @id @default(cuid())
  workspaceId  String
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  title        String?
  content      Json     // { text, media: [{ type, url }] }
  status       PostStatus @default(DRAFT)  // DRAFT | SCHEDULED | PUBLISHING | PUBLISHED | FAILED
  confidence   ConfidenceLevel?  // HIGH | MEDIUM | LOW (AI-generated confidence)
  scheduledAt  DateTime?
  publishedAt  DateTime?
  platforms    PostPlatform[]
  analytics    AnalyticsSnapshot[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**PostPlatform** — per-platform post variants (different text, character limits)
```
model PostPlatform {
  id          String   @id @default(cuid())
  postId      String
  post        Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  platform    String   // instagram | facebook | x | linkedin | tiktok | pinterest
  content     String   // platform-specific text
  mediaUrls   Json?    @default("[]")
  status      PostStatus @default(DRAFT)
  externalId  String?  // ID on the platform after publishing
  error       String?
  createdAt   DateTime @default(now())
}
```

**AnalyticsSnapshot** — periodic engagement/growth metrics per post
```
model AnalyticsSnapshot {
  id          String   @id @default(cuid())
  postId      String
  post        Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  platform    String
  likes       Int      @default(0)
  comments    Int      @default(0)
  shares      Int      @default(0)
  impressions Int      @default(0)
  engagementRate Float?  // computed: (likes+comments+shares)/impressions
  snapshotAt  DateTime @default(now())
}
```

Enums:
```
enum PostStatus { DRAFT SCHEDULED PUBLISHING PUBLISHED FAILED }
enum ConfidenceLevel { HIGH MEDIUM LOW }
```

Add `posts` and `analytics` relations to the existing `Workspace` model.

### Phase 2: Seed Data (task 2)

Create [`prisma/seed.ts`](prisma/seed.ts) with:
- 8-10 realistic posts across platforms with varied statuses
- 2-3 scheduled posts with future dates
- 1-2 failed posts for error state testing
- Analytics snapshots for published posts
- AI confidence levels distributed across HIGH/MEDIUM/LOW

### Phase 3: shadcn Components (task 3)

Install these via `pnpm dlx shadcn@latest add`:
- `separator`, `skeleton`, `avatar`, `tooltip`, `dropdown-menu`, `dialog`, `toast`, `sonner`, `progress`, `accordion`, `switch`, `select`, `tabs`

### Phase 4: Dashboard Widgets (task 4)

Create these reusable client components in `components/dashboard/`:

**RecentPostsList** (`components/dashboard/recent-posts-list.tsx`):
- Table of 5 most recent posts with columns: title, platforms (badges), status badge, scheduled/published date, AI confidence badge
- Uses `post-status` tokens (`bg-post-draft`, `bg-post-published`, etc.)
- Clickable row → links to compose/edit page
- Server component for data fetch, client component for interactivity

**AIInsightsCard** (`components/dashboard/ai-insights-card.tsx`):
- Card with `bg-ai-surface` background
- Top insight: "Your top-performing post this week..." with engagement metrics
- "Take action" buttons: "Generate similar content", "View analytics"
- Uses AI tokens (`--ai-surface`, `--ai-confidence-high/medium/low`)
- Sparkle icon from Phosphor

**CalendarPreview** (`components/dashboard/calendar-preview.tsx`):
- 7-day horizontal calendar strip showing scheduled posts
- Semi-transparent blocks for scheduled items
- Empty day slots with subtle dashed border
- "View full calendar" link
- Uses chart color tokens for multi-platform days

**AIStatusPanel** (`components/dashboard/ai-status-panel.tsx`):
- Shows agent activity: "Generating next week's content plan"
- Pending review section: AI drafts awaiting approval
- Quick actions: natural language command input
- Status indicator with pulsing animation for active tasks

**StartingVerbs** (`components/dashboard/starting-verbs.tsx`):
- 3 action buttons: "Plan your week", "Write a post", "Connect accounts"
- Each with icon (CalendarDots / PencilSimple / Link from Phosphor)
- Used in empty state when no profile/posts exist

**WorkedExampleEmptyState** (`components/dashboard/worked-example-empty-state.tsx`):
- Sample brand content (coffee shop example from user-flows spec)
- 3-4 sample posts across platforms, each clickable → opens editable compose
- "Starting verbs" buttons below
- Footer with supported platforms and credit model info

### Phase 5: Dashboard Page Rewrite (task 5)

Rewrite [`app/(dashboard)/dashboard/page.tsx`](app/(dashboard)/dashboard/page.tsx):

```
Server Component (default):
  - Auth check + onboarding redirect (existing)
  - Parallel data fetch: profile, connectedAccounts, recentPosts, scheduledPosts, analyticsInsights
  - Streaming with Suspense boundaries
  - Conditional rendering:
    IF no profile → WorkedExampleEmptyState + StartingVerbs
    IF profile but no posts → StartingVerbs + AIStatusPanel (empty)
    IF profile + posts → Full dashboard:
      ├─ Greeting header
      ├─ AIStatusPanel (top, full width)
      ├─ Two-column grid:
      │   ├─ Left: RecentPostsList + CalendarPreview
      │   └─ Right: AIInsightsCard + ProfileAnalysisCard (existing)
      └─ ConnectedAccountsCard (existing)
      └─ Conversational input (existing, linked to compose flow)
```

Create `app/(dashboard)/dashboard/loading.tsx` with Skeleton placeholders.

### Phase 6: API Routes (task 6)

Create API routes in `app/api/dashboard/`:
- `GET /api/dashboard/recent-posts` → returns last 5 posts with platform variants and status
- `GET /api/dashboard/calendar/7-day` → returns next 7 days with scheduled posts
- `GET /api/dashboard/insights` → returns AI-generated insights (top post, trends, recommendations)

### Phase 7: Layout Enhancements (task 7)

Update [`app/(dashboard)/layout.tsx`](app/(dashboard)/layout.tsx):
- Add active nav highlighting (compare current pathname)
- Fetch workspace name from DB instead of hardcoded "My Workspace"
- Add notification bell icon in top bar (Bell from Phosphor)
- Add mobile hamburger menu (Sheet component for sidebar on small screens)

---

## File Changes

| File | Change | Details |
|---|---|---|
| `prisma/schema.prisma` | Add Post, PostPlatform, AnalyticsSnapshot models + enums + Workspace relations | New database schema for posts/scheduling/analytics |
| `prisma/seed.ts` | Create seed script with realistic mock data | 8-10 posts, analytics snapshots, varied statuses |
| `components/ui/*` | Install ~12 shadcn components | separator, skeleton, avatar, tooltip, dropdown-menu, dialog, toast, sonner, progress, accordion, switch, select, tabs |
| `components/dashboard/recent-posts-list.tsx` | Create | Recent posts table with status/confidence badges |
| `components/dashboard/ai-insights-card.tsx` | Create | AI insights with engagement metrics + action buttons |
| `components/dashboard/calendar-preview.tsx` | Create | 7-day calendar strip with scheduled posts |
| `components/dashboard/ai-status-panel.tsx` | Create | Agent activity + pending review + quick actions |
| `components/dashboard/starting-verbs.tsx` | Create | 3 action buttons for empty state |
| `components/dashboard/worked-example-empty-state.tsx` | Create | Sample brand content with clickable posts |
| `app/(dashboard)/dashboard/page.tsx` | Rewrite | Assemble all widgets, streaming, conditional rendering |
| `app/(dashboard)/dashboard/loading.tsx` | Create | Skeleton loading state |
| `app/api/dashboard/recent-posts/route.ts` | Create | API endpoint for recent posts |
| `app/api/dashboard/calendar-7day/route.ts` | Create | API endpoint for 7-day calendar |
| `app/api/dashboard/insights/route.ts` | Create | API endpoint for AI insights |
| `app/(dashboard)/layout.tsx` | Update | Active nav, workspace from DB, notification bell, mobile sidebar |

---

## Verification Steps

- [ ] `pnpm run typecheck` (0 errors)
- [ ] `pnpm run lint` (0 warnings)
- [ ] `pnpm run build` (success)
- [ ] `pnpm db:seed` runs without errors
- [ ] Dashboard renders with all widgets when seed data present
- [ ] Dashboard shows worked-example empty state when no profile
- [ ] Streaming loading state displays Skeletons during data fetch
- [ ] All color tokens use semantic CSS variables (no hardcoded hex/rgb)
- [ ] All interactive elements use shadcn components (no raw HTML buttons)
- [ ] Active nav item highlighted correctly in sidebar
- [ ] Dark mode renders correctly (all tokens adapt automatically)

---

## Breaking Changes & Migrations

**Prisma Schema Changes**:
- Adding new models is non-destructive (no data loss)
- Run `pnpm prisma db push` to sync schema
- Run `pnpm db:seed` after migration to populate test data
- Existing User, Workspace, UserProfile, ConnectedAccount, BrandVoice, OnboardingSession models are unaffected

---

## Security Considerations

**Post Data Access**:
- All dashboard API routes must filter by `workspaceId` from the authenticated session
- Never expose `accessToken`/`refreshToken` from ConnectedAccount in API responses
- Prisma queries should always scope to the current user's workspace

**AI Insights**:
- If insights are AI-generated via LLM calls, add rate limiting to prevent abuse
- Validate all user input before passing to AI agent

---

## Execution Order

1. Schema models + migrate + seed (tasks 1-2) — foundation for all data
2. Install shadcn components (task 3) — needed for all widgets
3. Create dashboard widgets (task 4) — independent components
4. Create API routes (task 6) — feeds widgets with data
5. Rewrite dashboard page (task 5) — assembles widgets + API data
6. Enhance layout (task 7) — polish navigation
7. Verification (task 8) — run all checks

## Execution Mode

- Tasks 1-3: Direct execution (single-file or config changes)
- Task 4 (widgets): Subagent — 6 new components crossing UI/data layers
- Task 5 (page rewrite): Subagent — complex server/client split, streaming, conditional rendering
- Task 6 (API routes): Direct execution — straightforward API patterns
- Task 7 (layout): Direct execution — minor modifications to existing file