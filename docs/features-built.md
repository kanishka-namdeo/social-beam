# Features Built — SocialBeam

> **Auto-maintained**: This document is automatically updated by the Cursor agent whenever features are built, removed, or edited.
> **Last updated**: 2026-06-14

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.2.6 (App Router) |
| **UI** | React 19.2.6 + shadcn/ui (Radix primitives) |
| **Styling** | Tailwind CSS v4 |
| **Icons** | Phosphor Icons |
| **Language** | TypeScript 6 |
| **Database** | PostgreSQL via Prisma 7 |
| **AI/Agent** | LangGraph 1.3 + LangChain Core 1.1 + OpenAI 1.4 |
| **Auth** | NextAuth 5.0.0-beta.30 (email/password + Google OAuth) |
| **Rich Text** | TipTap 3.23.5 |
| **Charts** | Recharts 3.8.1 |
| **Drag & Drop** | dnd-kit |
| **Logging** | Pino 10.3.1 |
| **Scheduling** | node-cron 4.2.1 |
| **Headless Browser** | CloakBrowser 0.3.31 + Playwright Core 1.60.0 + Crawlee 3.16.0 |
| **Package Manager** | pnpm |

---

## 1. Authentication & Onboarding

| Feature | Description | Location | Status |
|---|---|---|---|
| Email/Password Login | Email validation, password show/hide, sign-in via NextAuth credentials provider | `app/(auth)/login/page.tsx` | ✅ Built |
| Google OAuth Login | Sign in via Google OAuth provider | `app/(auth)/login/page.tsx` | ✅ Built |
| Registration | User registration with email/password | `app/(auth)/register/page.tsx` | ✅ Built |
| AI Chat-Driven Onboarding | Multi-step conversational onboarding (greeting → collect info → connect accounts → analyze profile → define audience → train brand voice → completion) with SSE streaming, LangGraph agent, interrupt/resume pattern, OpenUI component rendering | `app/(auth)/onboarding/page.tsx`, `lib/agent/` | ✅ Built |
| Onboarding Goal Selection | Three starting paths: plan posts, write post, connect accounts | `app/(auth)/onboarding/page.tsx` | ✅ Built |
| OAuth Account Connection During Onboarding | Popup-based OAuth flow with BroadcastChannel communication back to onboarding chat | `app/(auth)/onboarding/page.tsx`, `lib/oauth/` | ✅ Built |
| Onboarding Status API | Check if onboarding is complete for redirect logic | `app/api/onboarding/status/route.ts` | ✅ Built |
| Onboarding Chat API (SSE) | Streams LangGraph agent responses via Server-Sent Events | `app/api/onboarding/chat/route.ts` | ✅ Built |
| Onboarding Resume API | Resume interrupted LangGraph thread | `app/api/onboarding/resume/route.ts` | ✅ Built |
| Onboarding Skip API | Skip onboarding to dashboard | `app/api/onboarding/skip/route.ts` | ✅ Built |
| Onboarding Complete API | Finalize onboarding | `app/api/onboarding/complete/route.ts` | ✅ Built |
| OAuth Initiate/Callback APIs | Initiate OAuth flow and handle callback for social platforms | `app/api/onboarding/oauth/initiate/route.ts`, `app/api/onboarding/oauth/callback/route.ts` | ✅ Built |
| TikTok Audit Banner | Informs users TikTok posts are private until app audit approved | Onboarding page component | ✅ Built |
| Onboarding Session Persistence | Prisma model tracks current step, step data, completion | `prisma/schema.prisma` (OnboardingSession) | ✅ Built |
| User Registration API | Creates user account with hashed password | `app/api/auth/register/route.ts` | ✅ Built |
| NextAuth Integration | `[...nextauth]` route handler | `app/api/auth/[...nextauth]/route.ts` | ✅ Built |

---

## 2. Dashboard

| Feature | Description | Location | Status |
|---|---|---|---|
| Personalized Dashboard | Time-based greeting, recent posts, AI insights, calendar preview, connected accounts overview | `app/(dashboard)/page.tsx`, `app/(dashboard)/dashboard/page.tsx` | ✅ Built |
| Recent Posts List | Shows last 5 posts with status badges (draft/scheduled/published/failed), platform indicators, confidence levels | `components/dashboard/recent-posts-list.tsx` | ✅ Built |
| AI Insights Card | Top-performing post summary, trend indicators, AI recommendations | `components/dashboard/ai-insights-card.tsx` | ✅ Built |
| 7-Day Calendar Preview | Upcoming scheduled posts preview | `components/dashboard/calendar-preview.tsx` | ✅ Built |
| AI Status Panel | Shows agent activity, pending draft reviews | `components/dashboard/ai-status-panel.tsx` | ✅ Built |
| Profile Analysis Card | AI-generated insights from onboarding (tone, content mix, audience, industry) | `components/dashboard/profile-analysis-card.tsx` | ✅ Built |
| Reddit Trending Radar Card | Shows top trending Reddit posts on dashboard | `components/reddit/trending-radar-card.tsx` | ✅ Built |
| Quick Action Bar | Compose, Schedule, Analyze, Research buttons | Dashboard page | ✅ Built |
| Connected Accounts Grid | Platform cards with status badges (connected/expired/revoked/error) | Dashboard page | ✅ Built |
| AI Compose Prompt | Conversational input for no-posts-yet empty state | `components/dashboard/ai-compose-prompt.tsx` | ✅ Built |
| Compose Input | Conversational input bar at bottom of dashboard | `components/dashboard/compose-input.tsx` | ✅ Built |
| Starting Verbs | Suggested first actions | `components/dashboard/starting-verbs.tsx` | ✅ Built |
| Onboarding Banner | Shown when onboarding incomplete | `components/dashboard/onboarding-banner.tsx` | ✅ Built |
| Brand Onboarding Banner | Client version of onboarding banner | `components/dashboard/brand-onboarding-banner-client.tsx` | ✅ Built |
| Credit Indicator | AI credit balance display | `components/dashboard/credit-indicator.tsx` | ❌ Removed |
| Mobile Menu | Responsive mobile navigation | `components/dashboard/mobile-menu.tsx` | ✅ Built |
| Sidebar Navigation | Dashboard sidebar with nav items | `components/dashboard/sidebar-nav.tsx` | ✅ Built |
| User Menu | User avatar dropdown menu | `components/dashboard/user-menu.tsx` | ✅ Built |
| Dashboard Insights API | Server data for dashboard widgets | `app/api/dashboard/insights/route.ts` | ✅ Built |
| Dashboard Recent Posts API | Recent posts data endpoint | `app/api/dashboard/recent-posts/route.ts` | ✅ Built |
| Dashboard 7-Day Calendar API | 7-day preview data | `app/api/dashboard/calendar-7day/route.ts` | ✅ Built |
| Unified Activity Page | Combined activity and process monitoring with real-time SSE updates, progress tracking, live logs, and cancellation | `app/(dashboard)/activity/page.tsx` | ✅ Built |
| Activity Client | Client-side activity management with SSE streaming, filtering, and real-time updates | `components/activity/activity-client.tsx` | ✅ Built |
| Activity Table | Enhanced table with progress bars, current step, posts found/processed columns | `components/activity/activity-table.tsx` | ✅ Built |
| Activity Filters | Type, status, date range, and search filters with "Running only" toggle | `components/activity/activity-filters.tsx` | ✅ Built |
| Activity Details Modal | Tabbed modal with Details and Live Logs views, progress tracking, cancel button | `components/activity/activity-details-modal.tsx` | ✅ Built |
| Activity Live Logs | Real-time log streaming component with auto-scroll and log level indicators | `components/activity/activity-live-logs.tsx` | ✅ Built |
| Activity Stream Hook | SSE hook for real-time activity updates with reconnection logic | `components/activity/use-activity-stream.ts` | ✅ Built |
| Activity Dropdown | Unified activity dropdown using enhanced API with process data | `components/dashboard/activity-dropdown.tsx` | ✅ Built |
| Process Monitor Redirect | `/processes` now redirects to unified `/activity` page | `app/(dashboard)/processes/page.tsx` | ❌ Removed |

---

## 3. Post Composition & Publishing

| Feature | Description | Location | Status |
|---|---|---|---|
| Compose Page | Full compose flow with connected accounts, trend context integration | `app/(dashboard)/compose/page.tsx` | ✅ Built |
| Compose Form | Unified composition with topic input, inline AI ghost-text suggestions, platform selection, media upload (no tab-based AI panel) | `components/compose/compose-form.tsx` | ✅ Built |
| Rich Text Editor | TipTap-based editor with ghost-text AI suggestions, emoji, image, link, text-align, typography, underline extensions | `components/compose/rich-text-editor.tsx` | ✅ Built |
| Inline Suggestion | Custom TipTap extension for ghost-text AI suggestions with Tab-to-accept, Escape-to-dismiss, mobile accept button, aria-hidden | `components/compose/inline-suggestion.tsx` | ✅ Built |
| Suggest API (AI) | Free AI content suggestion endpoint with rate limiting, no credit deduction | `app/api/compose/suggest/route.ts` | ✅ Built |
| Toolbar | Formatting toolbar with emoji picker | `components/compose/toolbar/` | ✅ Built |
| Platform-Specific Previews | Live previews for X, Instagram, Facebook, LinkedIn, TikTok, Pinterest | `components/compose/preview/` | ✅ Built |
| Trend Context Banner | Shows Reddit trend context when composing from trending radar | `components/compose/trend-context-banner.tsx` | ✅ Built |
| Compose API | Post creation/update endpoint | `app/api/compose/route.ts` | ✅ Built |
| Compose Generate API (AI) | AI content generation endpoint | `app/api/compose/generate/route.ts` | ✅ Built |
| Compose Error API | Error handling for compose operations | `app/api/compose/error/route.ts` | ✅ Built |
| Post Publish API | Publish a post to platforms | `app/api/posts/[id]/publish/route.ts` | ✅ Built |
| Post Retry API | Retry failed post publication | `app/api/posts/[id]/retry/route.ts` | ✅ Built |
| Publish Orchestrator | Central publishing orchestration | `lib/publish/orchestrator.ts` | ✅ Built |
| Publish Queue | Post publishing queue management | `lib/publish/queue.ts` | ✅ Built |
| Platform Adapters | Instagram, Facebook, X/Twitter, LinkedIn, TikTok, Pinterest publishing adapters | `lib/publish/adapters/` | ✅ Built |
| Compose Constants | Platform-specific character limits, media constraints | `lib/compose/constants.ts` | ✅ Built |
| Compose Prompt Builder | AI prompt construction for compose | `lib/ai/compose-prompt-builder.ts` | ✅ Built |

---

## 4. Campaign Builder

| Feature | Description | Location | Status |
|---|---|---|---|
| Campaigns Page | Server component listing campaigns with status filters | `app/(dashboard)/campaigns/page.tsx` | ✅ Built |
| Campaign List | Status filter tabs (All/Draft/Active/Completed/Archived), campaign cards with name/status/date/phase count, delete with confirmation, skeleton loading, empty state, FREE user upgrade nudge | `components/campaigns/campaign-list.tsx` | ✅ Built |
| Campaign Builder | 4-step Dialog wizard: Basics (name/goal/audience/duration), Platform checkboxes (all 10 platforms), Phases preview, Review + Generate with SSE streaming progress bar, auto-redirects on success | `components/campaigns/campaign-builder.tsx` | ✅ Built |
| Campaign Detail Page | Server component with phases/posts, passes to CampaignDetailClient | `app/(dashboard)/campaigns/[id]/page.tsx` | ✅ Built |
| Campaign Detail Client | Header with delete, summary cards, PhaseTimeline integration, Posts/Analytics tabs with per-phase grids | `components/campaigns/campaign-detail.tsx` | ✅ Built |
| Phase Timeline | Horizontal stepper with colored circles, phase-type icons (TEASER/Megaphone, LAUNCH/Rocket, SOCIAL_PROOF/Users, LAST_CALL/Chat), click to scroll | `components/campaigns/phase-timeline.tsx` | ✅ Built |
| Campaign Post Card | Platform name, truncated content (200 chars), status badge, Regenerate and Schedule buttons | `components/campaigns/campaign-post-card.tsx` | ✅ Built |
| Campaign Analytics | Metric cards (impressions, reach, engagement, likes, comments, shares) with API fetch | `components/campaigns/campaign-analytics.tsx` | ✅ Built |
| Campaign CRUD API | List (GET with status/pagination), Create (POST with AI plan generation), Get/Patch/Delete campaign | `app/api/campaigns/route.ts`, `app/api/campaigns/[id]/route.ts` | ✅ Built |
| Campaign Generate API | SSE streaming post generation per phase, creates Post + PostPlatform + CampaignPost records | `app/api/campaigns/[id]/generate/route.ts` | ✅ Built |
| Campaign Publish API | Bulk schedule all DRAFT posts in campaign/phase | `app/api/campaigns/[id]/publish/route.ts` | ✅ Built |
| Campaign Analytics API | Aggregated metrics across all campaign posts (impressions, engagement, likes, etc.) | `app/api/campaigns/[id]/analytics/route.ts` | ✅ Built |
| Campaign Generator AI | Two-step generator: plan generation (FastLLM) + phase content generation (full LLM with narrative continuity) | `lib/ai/campaign-generator.ts` | ✅ Built |
| Campaign Prompts | Phase-specific prompt templates (TEASER, LAUNCH, SOCIAL_PROOF, LAST_CALL, CUSTOM) with brand context injection | `lib/ai/campaign-prompts.ts` | ✅ Built |
| Active Campaigns Widget | Dashboard widget showing up to 3 active campaigns with progress tracking | `components/dashboard/active-campaigns-widget.tsx` | ✅ Built |
| Campaign Badge on Calendar | Colored dot + tooltip on calendar posts belonging to campaigns | `components/calendar/post-chip.tsx` | ✅ Built |
| Campaign Sidebar Nav | Campaigns nav item with Megaphone icon | `app/(dashboard)/layout.tsx` | ✅ Built |
| Campaign DB Models | Campaign, CampaignPhase, CampaignPost Prisma models with workspace scoping | `prisma/schema.prisma` | ✅ Built |
| Content Recycling API | POST endpoint to recycle published campaign posts as new standalone drafts with AI variations (light/medium/heavy) | `app/api/campaigns/[id]/posts/[postId]/recycle/route.ts` | ✅ Built |
| Content Recycling UI | Recycle button with variation popover on published campaign posts, creates new draft posts | `components/campaigns/campaign-post-card.tsx` | ✅ Built |
| Cross-Campaign Comparison API | GET endpoint comparing analytics across 2-4 campaigns (impressions, engagement, reach, etc.) | `app/api/campaigns/compare/route.ts` | ✅ Built |
| Cross-Campaign Comparison UI | Compare mode toggle with checkbox selection and side-by-side comparison dialog with best-value highlighting | `components/campaigns/campaign-list.tsx`, `components/campaigns/campaign-comparison.tsx` | ✅ Built |

---

## 5. Calendar & Scheduling

| Feature | Description | Location | Status |
|---|---|---|---|
| Calendar Page | Server component fetching scheduled posts | `app/(dashboard)/calendar/page.tsx` | ✅ Built |
| Calendar Client | Interactive calendar with month/week/day/list views, drag-drop with hour-level precision | `components/calendar/calendar-client.tsx` | ✅ Built |
| Month View | Monthly calendar grid with quick-add inline form | `components/calendar/month-view.tsx` | ✅ Built |
| Week View | Weekly calendar view with droppable hour slots, today indicator line | `components/calendar/week-view.tsx` | ✅ Built |
| Day View | Single day detailed view with droppable hour slots, today indicator line | `components/calendar/day-view.tsx` | ✅ Built |
| List View | Linear list of scheduled posts | `components/calendar/list-view.tsx` | ✅ Built |
| Day Cell | Individual calendar day cell with post chips, quick-add inline form | `components/calendar/day-cell.tsx` | ✅ Built |
| Post Chip | Platform-colored post indicators with media thumbnails | `components/calendar/post-chip.tsx` | ✅ Built |
| Post Preview Dialog | Preview post details from calendar | `components/calendar/post-preview-dialog.tsx` | ✅ Built |
| Reschedule Dialog | Drag-and-drop rescheduling with real analytics-based optimal times, confidence badges | `components/calendar/reschedule-dialog.tsx` | ✅ Built |
| Content Gap Analysis | Identifies open scheduling slots using brand cadence data | `components/calendar/content-gap-analysis.tsx` | ✅ Built |
| Posting Frequency | Shows posting frequency stats | `components/calendar/posting-frequency.tsx` | ✅ Built |
| Hour Slot | Droppable hour slot component for week/day views | `components/calendar/hour-slot.tsx` | ✅ Built |
| Quick Add Form | Compact inline form for creating drafts directly on calendar | `components/calendar/quick-add-form.tsx` | ✅ Built |
| Optimal Times API | Returns best posting times based on analytics data with confidence levels | `app/api/calendar/optimal-times/route.ts` | ✅ Built |
| Cadence Utility | Parses posting cadence strings (e.g., "3x/week") into numeric values | `lib/utils/cadence.ts` | ✅ Built |
| Calendar Posts API | Fetch scheduled posts for calendar | `app/api/calendar/posts/route.ts` | ✅ Built |
| Cron Publish | Scheduled cron job for auto-publishing | `app/api/cron/publish/route.ts` | ✅ Built |

---

## 6. Analytics & Reporting

| Feature | Description | Location | Status |
|---|---|---|---|
| Analytics Dashboard | Comprehensive analytics with period selector (7/30/90 days) | `app/(dashboard)/analytics/page.tsx` | ✅ Built |
| Metric Cards | Impressions, engagements, clicks, engagement rate, net followers with trend indicators | `components/analytics/metric-cards.tsx` | ✅ Built |
| Analytics Overview Chart | Time series engagement/impressions chart | `components/analytics/analytics-overview.tsx` | ✅ Built |
| Audience Growth Chart | Follower growth over time per platform | `components/analytics/audience-growth-chart.tsx` | ✅ Built |
| Content Ranking Table | Top and bottom performing posts by engagement rate | `components/analytics/content-ranking-table.tsx` | ✅ Built |
| Best Times Heatmap | Day-of-week x hour-of-day engagement heatmap | `components/analytics/best-times-heatmap.tsx` | ✅ Built |
| Platform Comparison | Side-by-side platform performance comparison | `components/analytics/platform-comparison.tsx` | ✅ Built |
| Confidence Correlation Chart | Correlates AI confidence levels with actual engagement | `components/analytics/confidence-correlation-chart.tsx` | ✅ Built |
| Publishing Reliability Table | Success/fail rates per platform | `components/analytics/publishing-reliability-table.tsx` | ✅ Built |
| Post Frequency Chart | Posts per day with streak tracking, engagement per follower | `components/analytics/post-frequency-chart.tsx` | ✅ Built |
| Optimal Times Recommendations | AI-suggested best posting times | `components/analytics/optimal-times-recommendations.tsx` | ✅ Built |
| Period Selector | 7/30/90 day period toggle | `components/analytics/period-selector.tsx` | ✅ Built |
| Analytics Overview API | Aggregated analytics data | `app/api/analytics/overview/route.ts` | ✅ Built |
| Analytics Audience Growth API | Follower growth data | `app/api/analytics/audience-growth/route.ts` | ✅ Built |
| Analytics Performance API | Performance metrics | `app/api/analytics/performance/route.ts` | ✅ Built |
| Analytics Content Ranking API | Post ranking data | `app/api/analytics/content-ranking/route.ts` | ✅ Built |
| Analytics Recommendations API | AI recommendations | `app/api/analytics/recommendations/route.ts` | ✅ Built |

---

## 7. Reddit Trending Radar

| Feature | Description | Location | Status |
|---|---|---|---|
| Reddit Trending Page | Full trending radar with summary cards, subreddit filters, period filters | `app/(dashboard)/reddit/trending/page.tsx` | ✅ Built |
| Subreddit Manager | Add/remove tracked subreddits | `components/reddit/subreddit-manager.tsx` | ✅ Built |
| Trending Table | Sortable/filterable trending posts table with action handoff, trend phase badges, engagement depth column | `components/reddit/trending-table.tsx` | ✅ Built |
| Trending Empty State | Empty state for no trending data | `components/reddit/trending-empty-state.tsx` | ✅ Built |
| Action Handoff Dialog | Dialog for taking action on trending posts | `components/reddit/action-handoff-dialog.tsx` | ✅ Built |
| Trending Post Chips | Platform-colored post indicators | `components/reddit/trending-post-chip.tsx` | ✅ Built |
| Reddit Trending API | Fetch trending posts | `app/api/reddit/trending/route.ts` | ✅ Built |
| Reddit Trending Trigger API | Manual refresh/trigger scraping with database-backed job tracking | `app/api/reddit/trending/trigger/route.ts` | ✅ Built |
| Reddit Trending Status API | Check scraping status from database | `app/api/reddit/trending/status/route.ts` | ✅ Built |
| Reddit Trending Action API | Take action on a trending post | `app/api/reddit/trending/[id]/action/route.ts` | ✅ Built |
| Reddit Trending Analyze API | AI analysis of a trending post | `app/api/reddit/trending/analyze/[id]/route.ts` | ✅ Built |
| Reddit Subreddit API | Subreddit config CRUD | `app/api/reddit/subreddit/route.ts` | ✅ Built |
| Reddit Scraper | Scrapes Reddit for trending content with smart caching | `lib/reddit/scraper.ts` | ✅ Built |
| Reddit Trending Analysis | AI relevance scoring of trending posts with comment scraping, intent scoring, velocity tracking | `lib/reddit/trending-analysis.ts` | ✅ Built |
| Reddit Cloak Integration | Uses cloakbrowser for Reddit scraping | `lib/reddit/cloak.ts` | ✅ Built |
| Cron Reddit Trending | Scheduled trending refresh | `lib/cron/reddit-trending.ts` | ✅ Built |
| Reddit Validation | Input validation for Reddit features | `lib/reddit/validation.ts` | ✅ Built |
| Automated Cron Scraping | Cron job runs every 2 hours to scrape active subreddits with rotation | `app/api/cron/reddit-scrape/route.ts` | ✅ Built |
| Reddit OAuth Integration | Full OAuth 2.0 flow with token encryption, refresh support, authenticated API access | `lib/reddit/oauth.ts`, `app/api/auth/reddit-callback/route.ts`, `app/api/settings/accounts/reddit/route.ts` | ✅ Built |
| Comment Thread Scraping | Scrapes top 20 comments per post with sentiment and buying signal detection | `lib/reddit/comment-scraper.ts` | ✅ Built |
| Engagement Depth Scoring | Calculates engagement depth score based on comment count, length, reply chains, velocity | `lib/reddit/engagement-analyzer.ts` | ✅ Built |
| Intent Scoring | Detects buying intent patterns (looking for, recommend, alternative to) with 0-100 scoring | `lib/reddit/intent-scorer.ts` | ✅ Built |
| Keyword Alert System | Users create alerts with keywords, subreddits, thresholds; triggers notifications on matches | `app/api/reddit/alerts/route.ts`, `app/api/reddit/alerts/[id]/route.ts` | ✅ Built |
| Alert Management UI | Full CRUD interface for alerts with toggle, test, and history | `components/reddit/alert-manager.tsx` | ✅ Built |
| Daily Digest Email | Cron job sends top 10 trends from last 24h via email at 8 AM | `app/api/cron/reddit-digest/route.ts` | ✅ Built |
| Push Notifications for High-Intent Leads | Immediate push notifications when intentScore >= 80 AND relevanceScore >= 0.7 | `lib/reddit/trending-analysis.ts` | ✅ Built |
| Trend Velocity Tracking | Calculates upvote/comment velocity, classifies trends as emerging/peaking/declining | `lib/reddit/velocity-tracker.ts` | ✅ Built |
| Cross-Subreddit Clustering | Groups posts by topic using keyword overlap, identifies cross-community trends in 3+ subreddits | `lib/reddit/cluster-analyzer.ts` | ✅ Built |
| Trend Clusters API | Fetch cross-subreddit trend clusters with pagination | `app/api/reddit/clusters/route.ts` | ✅ Built |
| Historical Trend Analysis | Aggregates trends by week/month with growth rates, seasonal patterns, brand mention frequency | `app/api/reddit/trends/history/route.ts` | ✅ Built |
| Trend Phase Badge | Visual badge showing Emerging (green), Peaking (yellow), Declining (red) with tooltips | `components/reddit/trend-phase-badge.tsx` | ✅ Built |
| Engagement Depth Chart | Mini bar chart showing comment depth distribution, highlights deep discussions | `components/reddit/engagement-depth-chart.tsx` | ✅ Built |
| Intent Score Card | Prominent card for high-intent leads (score >= 70) with signals and Engage Now CTA | `components/reddit/intent-score-card.tsx` | ✅ Built |
| Trend Cluster View | Card showing cross-subreddit trends with subreddit list and total reach | `components/reddit/trend-cluster-card.tsx` | ✅ Built |
| Data Retention Cleanup | Weekly cron deletes posts/comments older than 90 days, archives high-relevance posts | `app/api/cron/reddit-cleanup/route.ts` | ✅ Built |
| Rate Limiting & Cost Control | Tracks API calls, implements exponential backoff, cost alerts at $10/$25/$50 | `lib/reddit/rate-limiter.ts` | ✅ Built |

---

## 8. Brand Context & AI Agent System

| Feature | Description | Location | Status |
|---|---|---|---|
| Brand Context Management | Business name, tagline, industry, tone, banned words, voice examples, audience, competitors, goals | `prisma/schema.prisma` (BrandContext), `lib/db/brand-context.ts` | ✅ Built |
| Platform-Specific Context | Per-platform tone, content mix, posting cadence, hashtag strategy, visual style, engagement style | `prisma/schema.prisma` (PlatformContext) | ✅ Built |
| Brand Context API | CRUD for brand context | `app/api/brand-context/route.ts` | ✅ Built |
| Brand Context Stream API | SSE streaming for brand context operations | `app/api/brand-context/stream/route.ts` | ✅ Built |
| Brand Context Analyze API | AI analysis of brand context | `app/api/brand-context/analyze/route.ts` | ✅ Built |
| Brand Context Suggest API | AI suggestions for brand context | `app/api/brand-context/suggest/route.ts` | ✅ Built |
| Brand Context Learn API | Learning from user feedback | `app/api/brand-context/learn/route.ts` | ✅ Built |
| Brand Context Apply Suggestions API | Apply AI suggestions to brand context | `app/api/brand-context/apply-suggestions/route.ts` | ✅ Built |
| Brand Context Resume API | Resume brand context session | `app/api/brand-context/resume/route.ts` | ✅ Built |
| Brand Learning Signals | Thumbs up/down, post edit diffs, auto-detected signals with confidence and magnitude | `prisma/schema.prisma` (BrandLearningSignal) | ✅ Built |
| Brand Field State | Tracks confidence and stability of each brand field | `prisma/schema.prisma` (BrandFieldState) | ✅ Built |
| Brand Learning Aggregator | Aggregates learning signals | `lib/brand/learning-signal-aggregator.ts` | ✅ Built |
| Brand Learning Extractor | Extracts learning from interactions | `lib/brand/learning-extractor.ts` | ✅ Built |
| Cron Brand Learning | Scheduled brand learning processing | `lib/cron/brand-learning.ts` | ✅ Built |
| Brand Analyzer Form | Form to analyze brand context | `components/settings/brand-analyzer-form.tsx` | ✅ Built |
| Brand Context Card | Display brand context info | `components/settings/brand-context-card.tsx` | ✅ Built |
| Brand Context Review | Review brand context | `components/settings/brand-context-review.tsx` | ✅ Built |
| Brand Context Inline Edit | Edit brand context inline | `components/settings/brand-context-inline-edit.tsx` | ✅ Built |
| Brand Learning Card | Display learning signals | `components/settings/brand-learning-card.tsx` | ✅ Built |
| Brand Conversational UI | Chat-based brand configuration | `components/settings/brand-conversational-ui.tsx` | ✅ Built |
| LangGraph Agent Graph | Full LangGraph workflow for onboarding/brand context | `lib/agent/graph.ts` | ✅ Built |
| Agent Nodes | Greeting, user info collector, audience collector, account connector, profile analyzer, brand voice, brand context collector/saver/wait, brand platform adapter, brand sample generator, completion, orchestrator | `lib/agent/nodes/` | ✅ Built |
| Agent Tools | Brand voice tools, brand context tools, audience tools, scraper tools, social tools | `lib/agent/tools/` | ✅ Built |
| Agent State | Typed LangGraph state with Annotation.Root | `lib/agent/state.ts` | ✅ Built |
| Agent Debug/Logging | Debug trace wrappers, routed router logging | `lib/agent/debug.ts`, `lib/agent/logging.ts` | ✅ Built |
| Agent UI Component Prompts | OpenUI component generation prompts | `lib/agent/ui-component-prompts.ts` | ✅ Built |
| OpenUI Library | Dynamic UI component rendering from agent responses | `lib/openui/library.ts` | ✅ Built |
| Brand Analyzer Graph | Separate LangGraph graph for brand analysis | `lib/agent/brand-analyzer-graph.ts` | ✅ Built |
| Brand Context Loader | Loads brand context for AI operations | `lib/ai/brand-context-loader.ts` | ✅ Built |
| Brand Voice Model | Tone presets, per-platform voice, examples | `prisma/schema.prisma` (BrandVoice) | ✅ Built |
| Crawler | Web crawler for brand context gathering | `lib/agent/crawler.ts` | ✅ Built |
| Invisible AI Visibility Control | User-controllable AI label visibility; invisible by default | `lib/invisible-ai-context.tsx` | ✅ Built |

---

## 9. Settings & Configuration

| Feature | Description | Location | Status |
|---|---|---|---|
| Settings Page | Main settings with tabs for accounts, brand voice, OAuth apps | `app/(dashboard)/settings/page.tsx`, `app/(dashboard)/settings/brand/page.tsx` | ✅ Built |
| Connected Accounts Management | View/manage connected social accounts | `app/api/settings/accounts/route.ts` | ✅ Built |
| Account Connect API | Connect new social account | `app/api/settings/accounts/connect/route.ts` | ✅ Built |
| Platform Account API | Per-platform account operations | `app/api/settings/accounts/[platform]/route.ts` | ✅ Built |
| OAuth App Configuration | User-managed OAuth app configs (clientId, clientSecret) | `app/api/settings/oauth-apps/route.ts` | ✅ Built |
| Per-Platform OAuth App API | Per-platform OAuth app config | `app/api/settings/oauth-apps/[platform]/route.ts` | ✅ Built |
| Connect Dialog | UI for connecting accounts | `app/(dashboard)/dashboard/settings/components/connect-dialog.tsx` | ✅ Built |
| Disconnect Dialog | Confirmation dialog for disconnecting accounts | `app/(dashboard)/dashboard/settings/components/disconnect-dialog.tsx` | ✅ Built |
| OAuth App Config Dialog | Configure OAuth app credentials | `app/(dashboard)/dashboard/settings/components/oauth-app-config-dialog.tsx` | ✅ Built |
| Account Card | Display connected account status | `app/(dashboard)/dashboard/settings/components/account-card.tsx` | ✅ Built |
| Brand Page | Brand voice/settings sub-page | `app/(dashboard)/settings/brand/page.tsx` | ✅ Built |
| Cron Token Refresh | Automatic OAuth token refresh | `app/api/cron/refresh-tokens/route.ts` | ✅ Built |
| Token Refresh Logic | Refreshes expired OAuth tokens | `lib/oauth/token-refresh.ts` | ✅ Built |
| Account Info Fetch | Fetches account info after OAuth | `lib/oauth/account-info.ts` | ✅ Built |
| OAuth Platforms | Meta (Instagram/Facebook), X, LinkedIn, TikTok, Pinterest OAuth implementations | `lib/oauth/platforms/` | ✅ Built |
| OAuth Crypto | Encryption for tokens/credentials | `lib/oauth/crypto.ts` | ✅ Built |
| OAuth Credentials | Credential management | `lib/oauth/credentials.ts` | ✅ Built |

---

## 10. AI Credit System

| Feature | Description | Location | Status |
|---|---|---|---|
| AI Credit Balance | Per-workspace credit tracking (default 100 free, tier system) | `prisma/schema.prisma` (AiCreditBalance) | ❌ Removed |
| Credits API | Fetch/manage credit balance | `app/api/credits/route.ts` | ❌ Removed |
| Credit Indicator Component | Displays credit balance in UI | `components/dashboard/credit-indicator.tsx` | ❌ Removed |

---

## 11. Landing & Marketing Pages

| Feature | Description | Location | Status |
|---|---|---|---|
| Landing Home | Main landing page with nav, content, footer CTA | `app/page.tsx`, `components/landing/` | ✅ Built |
| Landing Nav | Navigation bar for landing pages | `components/landing/landing-nav.tsx` | ✅ Built |
| Landing Footer CTA | Footer call-to-action | `components/landing/landing-footer-cta.tsx` | ✅ Built |
| Landing Hero | Hero section | `components/landing/landing-hero.tsx` | ✅ Built |
| Landing Features | Feature showcase | `components/landing/landing-features.tsx` | ✅ Built |
| Landing Pricing | Pricing tiers | `components/landing/landing-pricing.tsx` | ✅ Built |
| Landing Social Proof | Testimonials/social proof | `components/landing/landing-social-proof.tsx` | ✅ Built |
| Landing FAQ | Frequently asked questions | `components/landing/landing-faq.tsx` | ✅ Built |
| Landing Page Shell | Reusable shell for landing pages | `components/landing/landing-page-shell.tsx` | ✅ Built |
| Features Page | Detailed features overview | `app/(landing)/features/page.tsx` | ✅ Built |
| Pricing Page | Pricing tiers and plans | `app/(landing)/pricing/page.tsx` | ✅ Built |
| Use Cases Page | Target audience use cases | `app/(landing)/use-cases/page.tsx` | ✅ Built |
| How It Works Page | Product explanation | `app/(landing)/how-it-works/page.tsx` | ✅ Built |
| Blog Page | Blog listing | `app/(landing)/blog/page.tsx` | 🚧 Stub |
| Help/Support Page | Help documentation | `app/(landing)/help/page.tsx` | 🚧 Stub |
| Terms Page | Terms of service | `app/(landing)/terms/page.tsx` | 🚧 Stub |
| Privacy Page | Privacy policy | `app/(landing)/privacy/page.tsx` | 🚧 Stub |
| Contact Page | Contact form | `app/(landing)/contact/page.tsx` | 🚧 Stub |
| Status Page | System status | `app/(landing)/status/page.tsx` | 🚧 Stub |
| Alternatives Pages | Competitor comparison pages: Buffer, Hootsuite, Later, Metricool, Sprout Social, general alternatives | `app/(landing)/alternatives/` | 🚧 Stub/Partial |
| Platform Pages | Platform-specific landing: Instagram, X, TikTok, Facebook, LinkedIn, Pinterest | `app/(landing)/platforms/` | 🚧 Stub/Partial |
| API Page | MCP server documentation with OAuth 2.1+PKCE auth, 7 tool scopes, AI agent integration guide | `app/(landing)/api/page.tsx` | ✅ Built |

---

## 12. Database Models

| Model | Description | Status |
|---|---|---|
| User | Email, name, password, workspaces, OAuth apps | ✅ Built |
| Workspace | Name, autonomy level, profile, accounts, brand voice, posts, Reddit configs, brand context, AI credits | ✅ Built |
| Post | Title, content (JSON), status, confidence, scheduledAt, publishedAt, platforms, analytics | ✅ Built |
| PostPlatform | Per-platform content, media URLs, status, external ID, errors | ✅ Built |
| AnalyticsSnapshot | Likes, comments, shares, impressions, reach, clicks, saves, video views, profile visits, website clicks, engagement rate | ✅ Built |
| FollowerSnapshot | Followers/following counts per platform over time | ✅ Built |
| UserProfile | Bio, tone, post types, image analysis, audience data | ✅ Built |
| ConnectedAccount | Platform, tokens (encrypted), expiry, status, username, avatar, follower count | ✅ Built |
| OnboardingSession | Current step, step data, completion timestamp | ✅ Built |
| BrandVoice | Tone preset, description, examples, per-platform config | ✅ Built |
| UserOAuthApp | User-managed OAuth app credentials per platform | ✅ Built |
| RedditSubredditConfig | Tracked subreddits with sort order, active status | ✅ Built |
| RedditTrendingPost | Scraped posts with relevance score, sentiment, risk level, topic tags, suggested action | ✅ Built |
| BrandContext | Full brand profile: name, tagline, industry, tone, banned words, audience, competitors, goals, training status | ✅ Built |
| PlatformContext | Per-platform tone, content mix, posting cadence, hashtag strategy, visual/engagement style, rules | ✅ Built |
| AiCreditBalance | Balance, tier, total spent, last refill | ❌ Removed |
| BrandLearningSignal | Signal type, direction, magnitude, confidence, source, applied status | ✅ Built |
| BrandFieldState | Per-field confidence, stability, signal count | ✅ Built |

---

## 13. UI Component Library

| Category | Components | Status |
|---|---|---|
| shadcn/ui Primitives | Button, Card, Input, Label, Badge, Dialog, Tabs, DropdownMenu, Avatar, Separator, Progress, Skeleton, Tooltip, Switch, Accordion, Select, Textarea, Table, Alert, Sheet, Sonner | ✅ Built |
| Confirm Dialog | Reusable confirmation dialog | ✅ Built |
| Providers | SessionProvider, theme provider wrapper | ✅ Built |
| Micro-interactions | Shimmer skeleton animation, smooth progress bars, drag-over calendar feedback, hover states, button press feedback, sort indicator animations, tab fade transitions, prefers-reduced-motion support | `app/globals.css`, `components/ui/skeleton.tsx`, `components/ui/progress.tsx`, `components/ui/button.tsx`, `components/calendar/day-cell.tsx`, `components/compose/compose-form.tsx`, `app/(dashboard)/layout.tsx`, `components/reddit/trending-table.tsx` | ✅ Built |

---

## 14. Infrastructure & Utilities

| Feature | Description | Location | Status |
|---|---|---|---|
| Centralized Logging | Pino singleton with correlation IDs, structured logging | `lib/logger.ts` | ✅ Built |
| Auth Configuration | NextAuth 5 config with credentials + Google providers | `lib/auth.ts` | ✅ Built |
| Prisma Client | Database client singleton | `lib/prisma.ts` | ✅ Built |
| Date Utilities | date-fns wrappers (subHours, subDays) | `lib/utils/dates.ts` | ✅ Built |
| Utility Functions | cn() class merging, other helpers | `lib/utils.ts` | ✅ Built |
| Request Context | Correlation ID propagation | `lib/request-context.ts` | ✅ Built |
| Activity Tracker | Bidirectional linking between ActivityLog and ScraperProcess with atomic status sync | `lib/activity-tracker.ts` | ✅ Built |
| Process Registry | In-memory registry for running processes with cancellation support | `lib/processes/process-registry.ts` | ✅ Built |
| Process Log Store | Ring buffer for process logs with pub/sub | `lib/processes/process-log-store.ts` | ✅ Built |
| Activity Logs API | Enhanced with `include=process` param to join ActivityLog with ScraperProcess data | `app/api/activity/logs/route.ts` | ✅ Built |
| Activity Log SSE Stream | Real-time SSE stream for activity logs with progress, logs, and status events | `app/api/activity/logs/[id]/stream/route.ts` | ✅ Built |
| Activity Log Cancel | Cancel running processes via activity log ID | `app/api/activity/logs/[id]/cancel/route.ts` | ✅ Built |

---

## 15. CloakBrowser Scraping Infrastructure

| Feature | Description | Location | Status |
|---|---|---|---|
| CloakBrowser Package | `cloakbrowser` npm dependency for headless browser with anti-detection | `package.json`, `next.config.ts` | ✅ Built |
| Shared Browser Service | Singleton browser, `withPage()`, stealth injection, User-Agent rotation, timeout protection | `lib/cloakbrowser/service.ts` | ✅ Built |
| Cookie Management | Per-platform cookie persistence (env + file cache) | `lib/cloakbrowser/cookies.ts` | ✅ Built |
| Error Types | CookieExpiredError, OperationTimeoutError, ScrapingBlockedError, RateLimitedError | `lib/cloakbrowser/errors.ts` | ✅ Built |
| Scraper Interface | `PlatformScraperResult<T>`, `PageOptions` types | `lib/cloakbrowser/types.ts` | ✅ Built |
| Cookie Extraction Scripts | Platform-specific scripts for manual login cookie extraction | `scripts/extract-<platform>-cookie.mjs` | ✅ Built |
| LinkedIn Scraper | Post analytics scraping with cookie injection, stealth, session validation | `lib/linkedin/browser.ts` | ✅ Built |
| LinkedIn Inbox Scraper | Feed discovery, post scraping, comment extraction with avatar, reply posting | `lib/inbox/scrapers/linkedin-scraper.ts` | ✅ Built |
| LinkedIn Mention Scraper | Scrape mentions from notifications page | `lib/inbox/scrapers/linkedin-mention-scraper.ts` | ✅ Built |
| LinkedIn DM Scraper | Scrape direct messages from messaging page | `lib/inbox/scrapers/linkedin-dm-scraper.ts` | ✅ Built |
| Reddit Scraper | JSON API primary, browser fallback via CloakBrowser | `lib/reddit/scraper.ts`, `lib/reddit/cloak.ts` | ✅ Built |
| Brand Website Crawler | Crawlee + CloakBrowser integration, sitemap discovery, zone-based content extraction | `lib/agent/crawler.ts` | ✅ Built |
| Instagram Scraper | Profile browsing, post/comment scraping, DMs | `lib/cloakbrowser/platforms/instagram.ts` | ✅ Built |
| X/Twitter Scraper | Timeline, comments, mentions, DMs scraping | `lib/cloakbrowser/platforms/x.ts` | ✅ Built |
| TikTok Scraper | Profile browsing with lazy-load scroll, comments, DMs | `lib/cloakbrowser/platforms/tiktok.ts` | ✅ Built |
| Facebook Scraper | Feed, comments, mentions, Messenger scraping | `lib/cloakbrowser/platforms/facebook.ts` | ✅ Built |
| Pinterest Scraper | Board browsing, pin/comment scraping | `lib/cloakbrowser/platforms/pinterest.ts` | ✅ Built |
| YouTube Scraper | Video comments, community posts, notifications | `lib/cloakbrowser/platforms/youtube.ts` | ✅ Built |
| Threads Scraper | Profile, thread comments scraping | `lib/cloakbrowser/platforms/threads.ts` | ✅ Built |
| Bluesky Scraper | Profile, post comments, notifications | `lib/cloakbrowser/platforms/bluesky.ts` | ✅ Built |
| Hybrid Inbox Adapters | API primary + browser fallback for Instagram, X, Facebook, TikTok, Pinterest | `lib/inbox/adapters/*-hybrid.ts` | ✅ Built |

---

## Not Yet Built (From MVP Scope)

| Feature | Priority | Notes |
|---|---|---|
| Media Library | P0 | Dedicated page for managing images/videos |
| Post Templates | P1 | Reusable post templates |
| Content Queue | P1 | Evergreen content recycling |
| Bulk CSV Upload | P1 | Bulk post import via CSV |
| Thread Scheduling | P1 | Schedule Twitter/X threads |
| First Comment Scheduling | P1 | Auto-post first comment after publish |
| Team Collaboration | P2 | Multi-user workspace features |
