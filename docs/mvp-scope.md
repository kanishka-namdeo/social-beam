# SocialBeam — MVP Scope

> Version 1.4.0
> Date: 2026-05-25
> Status: Living document
> Purpose: Define what is in and out of scope for the MVP (Phase 1: Free Platform Foundation + Phase 2: AI Monetization Layer). See [tool-vision-and-market-research.md](tool-vision-and-market-research.md) for the full product vision and roadmap.
> Updated: Buffer screenshot analysis complete (10 screenshots across 2 flow folders: `flow-02-dashboard-home/screenshots/`, `flow-03-post-creation/screenshots/`). Visually verified: Community engagement tab, Ideas board with AI generation + conversion, inline AI actions (Rewrite/Shorten/Lengthen), post template library with categories, compose interface with post-type selector, content feeds (RSS/Blog/Podcast/YouTube), and media upload. Previous: text-based flow parity analysis from 8 flow docs.

---

## MVP Definition

The MVP covers **Phase 1 (Free Platform Foundation)** and **Phase 2 (AI Monetization Layer)** from the product vision document. Everything in Phase 3 is out of scope.

### Core MVP Principles

1. **Free scheduling is the acquisition engine** — must be fully functional, not a crippled demo
2. **AI is the monetization layer** — must deliver quantifiable time savings to justify pricing
3. **Web-first** — Next.js 16 web app; mobile native apps are Post-MVP
4. **Human-in-the-loop by default** — autonomous AI features require explicit opt-in

---

## In Scope (MVP)

### Authentication & Onboarding

| Feature | Priority | Notes |
|---------|----------|-------|
| Email/password + OAuth login | P0 | |
| Goal-first onboarding flow (Flow 1.4) | P0 | Connect account → first action, not feature tour |
| Workspace creation | P0 | Single workspace per user for MVP |
| Brand Voice Setup (Flow 1.6) | P1 | Upload brand guidelines, past posts, tone samples |

### Social Platform Management

| Feature | Priority | Notes |
|---------|----------|-------|
| Connect Instagram Business | P0 | Via Meta Graph API |
| Connect Facebook Pages | P0 | Via Meta Graph API |
| Connect X/Twitter | P0 | Via X API v2 |
| Connect LinkedIn (Company Pages) | P0 | Via LinkedIn REST API |
| Connect TikTok Business | P0 | Via TikTok Content Posting API |
| Connect Pinterest | P1 | |
| Account status indicator (connected/disconnected/expired token) | P0 | |

### Post Creation & Publishing

| Feature | Priority | Notes |
|---------|----------|-------|
| AI Compose (Flow 3.1) | P0 | Conversational Input (10.75) component — topic/URL/image modes |
| Traditional compose form (fallback) | P0 | Manual text entry + media upload |
| Platform selector with badges | P0 | Per-platform selection for each post |
| Multi-platform publishing from single compose | P0 | |
| Platform-specific character limit validation | P0 | |
| Inline AI actions (Rewrite/Shorten/Lengthen) | P0 | One-click post transformations directly in compose — confirmed from Buffer AI assistant screenshot |
| Platform-specific content variations | P1 | Override text/media per platform from single compose (Buffer Flow 3.5) |
| Accurate post previews | P0 | Must match actual platform rendering |
| Post type selector (Post/Story/Reel) | P1 | Per-platform content type selection — confirmed from Buffer new post dialog screenshot |
| Publish immediately | P0 | |
| Schedule for later | P0 | |
| Drafts | P1 | Save and resume |
| Post templates library | P0 | Categorized reusable templates (Promotional, Educational, Engagement, Curated, Behind-the-scenes) — confirmed from Buffer Templates screenshot. Elevated from P1 to P0 given visual evidence of implementation simplicity. |
| AI idea generation | P0 | Topic-based idea generation with tone selector (Casual/Professional/Humorous/Informative) and quantity control — confirmed from Buffer Generate Ideas dialog screenshot |
| Idea-to-post conversion | P0 | Convert saved/AI-generated ideas to posts with one click — confirmed from Buffer Ideas Board screenshot |
| Content Repurposing (Flow 3.11) | P1 | Adapt existing post for different platforms |
| Thread scheduling (X/Twitter, LinkedIn) | P1 | |
| First comment scheduling | P1 | For links/hashtags on Instagram |

### Scheduling & Calendar

| Feature | Priority | Notes |
|---------|----------|-------|
| Visual content calendar (month/week/day views) | P0 | |
| Drag-and-drop rescheduling | P0 | |
| AI-suggested posting times (Flow 4.7) | P0 | Best time to post based on audience data |
| Post status badges (draft/scheduled/published/failed) | P0 | Use semantic tokens (`bg-post-*`) |
| Content Queue (evergreen recycling) | P0 | Elevated from P1 — 383 votes on Buffer, core differentiator |
| Duplicate post from queue/calendar | P1 | Quick copy with next-available-slot placement (Buffer Flow 6.13) |
| Bulk upload via CSV | P1 | |
| Account-wide search for posts, drafts & ideas | P1 | 155 votes on Buffer. Prevents lost scheduled posts. |

### Analytics & Reporting

| Feature | Priority | Notes |
|---------|----------|-------|
| Unified analytics dashboard | P0 | Cross-platform overview |
| Engagement rate tracking | P0 | Per-post, per-platform, per-period |
| Audience growth analytics | P0 | Follower growth over time |
| AI Insights Engine | P0 | "What to do next" recommendations (not just charts) |
| Post-level analytics with engagement breakdown | P0 | Likes, comments, shares, saves with trend indicators (Buffer Flow 5.7) |
| Data freshness indicators | P1 | "Last updated" timestamp + stale data warning (Buffer Flow 5) |
| Custom report builder | P1 | |
| Sent posts history (filter/export) | P1 | Full audit log of published posts with platform links (Buffer Flow 8.4) |
| Top posts by reach | P1 | Surfaces best-performing content visually with reach metrics — confirmed from Buffer Community tab screenshot |
| Competitor benchmarking | P2 | Post-MVP |

### Dashboard & Home

| Feature | Priority | Notes |
|---------|----------|-------|
| Personalized dashboard | P0 | Quick actions, recent posts, AI insights summary |
| AI activation empty states | P0 | Conversational input as primary CTA, not static button |
| 7-day calendar preview | P0 | |
| Community engagement tab | P1 | Cross-platform engagement metrics (reach, views, comments, shares), top posts by reach, platform filter chips — confirmed from Buffer Community tab screenshots |

### AI Agent Flows

| Feature | Priority | Notes |
|---------|----------|-------|
| AI Agent Timeline (10.74) | P0 | Real-time visibility for multi-step AI operations |
| Conversational Input (10.75) | P0 | Primary content creation interface |
| Confidence Badge (10.76) | P0 | Categorical labels (High/Medium/Low), never raw percentages |
| Intent Preview (10.77) | P0 | Approval gate for bulk actions (>3 posts) |
| Autonomy Dial (10.78) | P0 | Per-workspace; defaults to "Suggestions only" |
| Action Audit Log (10.79) | P1 | Transparent record with undo for reversible actions |
| Escalation Pathway (10.80) | P0 | Options-not-blockers on errors or low confidence |
| AI Disclosure Badge (10.81) | P1 | Internal workflow indicator |
| Agent command via Cmd+K | P1 | Natural language commands |
| Tone presets for AI generation | P0 | Casual/Professional/Humorous/Informative — confirmed from Buffer Generate Ideas dialog screenshot |

### Settings & Configuration

| Feature | Priority | Notes |
|---------|----------|-------|
| Connected accounts management | P0 | |
| Brand Voice configuration | P1 | |
| AI Guardrails (Autonomy Dial defaults, safety filters) | P1 | |
| Notification preferences | P1 | |
| Credit system management | P1 | AI credit balance, top-up options |

### Media Library

| Feature | Priority | Notes |
|---------|----------|-------|
| Upload and store media assets | P0 | |
| Tag and search media | P1 | |
| Platform dimension preview | P1 | |
| Auto-resize/crop images & videos per platform | P0 | 259 votes on Buffer. Prevents posting failures from size limits. |
| Content feeds aggregation | P1 | RSS/Blog/Podcast/YouTube feed sources with fetch, status tracking, and last-updated timestamps — confirmed from Buffer Feeds tab screenshot |

### Error & Edge Cases

| Feature | Priority | Notes |
|---------|----------|-------|
| Failed post diagnosis + AI remediation | P0 | Explain failure, offer one-click fix |
| Token expiry handling | P0 | Reconnect flow |
| Platform API rate limit handling | P0 | Queue and retry |
| Offline / network error states | P0 | Graceful degradation |
| Empty state framework (all pages) | P0 | Icon + title + description + AI CTA |

### Design System

| Feature | Priority | Notes |
|---------|----------|-------|
| shadcn/ui component primitives | P0 | Button, Card, Input, Dialog, etc. |
| AI component suite (10.74-10.81) | P0 | See [ai-components.md](design-assets/design-system/components/ai-components.md) |
| CSS variable token system | P0 | Defined in `app/globals.css` |
| Dark mode (automatic via CSS) | P0 | |
| Phosphor Icons integration | P0 | |

---

## Out of Scope (MVP)

### Platform Integrations

- Threads
- Google Business Profile
- YouTube
- WhatsApp Business
- Snapchat
- Reddit
- Bluesky
- Lemon8

### Features

| Feature | Rationale | Target Phase |
|---------|-----------|-------------|
| **Mobile native apps (iOS/Android)** | Web-first MVP; React Native/Expo deferred | Phase 3 |
| **Social commerce / shoppable posts** | Complex; requires e-commerce integrations | Phase 3 |
| **Developer API / marketplace** | No developer ecosystem at MVP | Phase 3 |
| **Enterprise features (SSO, compliance, custom AI models)** | No enterprise customers at MVP | Phase 3 |
| **Influencer CRM** | Niche; post-MVP validation needed | Phase 3 |
| **Social listening with sentiment analysis** | Complex; Phase 2 minimum | Phase 2 |
| **Video script writer** | Post-MVP content types | Phase 3 |
| **AI image generation** | Post-MVP media types | Phase 3 |
| **White-label reports** | Agency feature; not MVP | Phase 2 |
| **Team collaboration (multi-user workspaces)** | Single workspace for MVP | Phase 2 |
| **Client approval via shareable links** | Agency workflow; Phase 2 | Phase 2 |
| **CRM integrations (Salesforce, HubSpot)** | Enterprise; Phase 3 | Phase 3 |
| **Zapier/Make/n8n integrations** | Post-MVP ecosystem | Phase 3 |
| **20+ platform support** | Top 5-7 for MVP | Phase 2+ |

### Phase 2 Additions (from Buffer demand analysis + 2026 API feasibility)

These features were identified from Buffer's top suggestions and verified against 2026 platform APIs. See [buffer-features-feasibility-2026.md](competitor-analysis/buffer-features-feasibility-2026.md) for full API feasibility analysis.

#### Phase 2 P1 — Build (Feasible, High Demand)

| Feature | Buffer Votes | Feasibility | Notes |
|---------|-------------|-------------|-------|
| **Video thumbnail customization** | 619 | FEASIBLE | Meta Graph API v25.0: `cover_url` for Reels, `/{video_id}/thumbnails` for FB. TikTok: `video_cover_timestamp_ms` (frame-based only). |
| **Instagram multi-video carousel posts** | 323 | PARTIAL | Videos supported in carousels via `is_carousel_item=true`. **Reels NOT supported in carousels** (API limitation). Max 400 containers/24h. |
| **Ideas/planning on calendar** | 234 | FEASIBLE | New `Idea` entity. AI-generated ideas as differentiator. Drag-to-schedule conversion. |
| **Substack content source** | 333 | FEASIBLE | RSS-based at `{url}/feed`. No official API needed. Connects to Content Repurposer (Flow 3.11). |

#### Phase 2 P2 — Nice-to-Have

| Feature | Buffer Votes | Feasibility | Notes |
|---------|-------------|-------------|-------|
| **Calendar notes/blocks** | 215 | FEASIBLE | New `CalendarNote` entity. Blocked days prevent AI scheduling. |
| **Rich text formatting in posts** | 171 | PARTIAL | Unicode workaround for Facebook. LinkedIn Posts API does not support bold/italic. Screen reader concern. |
| **Instagram collaborator (pre-approved)** | 157 | PARTIAL | `collaborators` param in container creation works for pre-approved accounts only. **No full invite flow via API** — collaborator tagging must be pre-enabled. |
| **Content templates library** | Buffer Flow 3 | FEASIBLE | Reusable compose templates for recurring content types. Matches Buffer's Templates tab. |

#### NOT FEASIBLE via API

| Feature | Buffer Votes | Reason |
|---------|-------------|--------|
| **Full Instagram collaborator invites** | 157 | API is READ-ONLY for collaborators (`GET /collaborators` only). No POST/create endpoint. Users must use Instagram native app for first-time invites. |

### AI Features (Deferred)

| Feature | Rationale |
|---------|-----------|
| Fully autonomous scheduling (default) | Trust research shows only 27% trust autonomous AI; human-in-the-loop required |
| AI-generated social graphics | Post-MVP media type |
| Predictive engagement scoring | Requires historical data; Phase 2 |
| Competitor trend detection | Requires social listening infrastructure |
| Multi-brand voice (agency) | Single workspace for MVP |
| Automated report generation | Phase 2 |

---

## Platform Coverage Summary

| Platform | MVP | Notes |
|----------|-----|-------|
| Instagram Business | Yes | Via Meta Graph API |
| Facebook Pages | Yes | Via Meta Graph API |
| X/Twitter | Yes | Via X API v2 |
| LinkedIn (Company Pages) | Yes | Via LinkedIn REST API |
| TikTok Business | Yes | Via TikTok Content Posting API |
| Pinterest | Yes (P1) | |
| Threads | No | Phase 2 |
| Google Business Profile | No | Phase 2 |
| YouTube | No | Phase 3 |
| WhatsApp Business | No | Phase 3 |

### Content Sources (for Repurposing)

| Source | Phase | Method | Notes |
|--------|-------|--------|-------|
| **RSS feeds** | P1 | RSS parsing (`rss-parser`) | Generic RSS/Blog/Podcast/YouTube feed aggregation — confirmed from Buffer Feeds tab screenshot |
| **Substack** | Phase 2 | RSS feed (`{url}/feed`) | No API needed. Parse RSS → AI repurposing. |
| Blog URLs (any) | MVP | URL scraping + AI | Content Repurposer (Flow 3.11) |

---

## Tech Stack (MVP)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + shadcn/ui (radix-sera style) |
| Styling | Tailwind CSS v4 |
| Icons | Phosphor Icons (`@phosphor-icons/react`) |
| Language | TypeScript |
| State | React Server Components + client state as needed |
| Image Processing | Sharp v0.34.5 (auto-resize/crop) |
| RSS Parsing | `rss-parser` (Substack integration) |
| Search | PostgreSQL FTS (MVP), Meilisearch 1.5 (Phase 2+) |
| Deployment | Vercel (recommended) |

**Not in MVP:** React Native, Expo, mobile native apps. These are Phase 3.

---

*Document Version: 1.4.0*
*Last Updated: 2026-05-25*
*Derived from: [tool-vision-and-market-research.md](tool-vision-and-market-research.md) Sections 7, 8, 14*
*Updated from: [buffer-features-mapping.md](competitor-analysis/buffer-features-mapping.md) — Buffer demand analysis*
*Feasibility verified: [buffer-features-feasibility-2026.md](competitor-analysis/buffer-features-feasibility-2026.md) — 2026 API documentation*
*Screenshot analysis: [flow-02-dashboard-home/screenshots/](buffer-user-flow/flow-02-dashboard-home/screenshots/) (2 screenshots: Community tab, Community filters), [flow-03-post-creation/screenshots/](buffer-user-flow/flow-03-post-creation/screenshots/) (8 screenshots: Ideas board, AI assistant, Compose, Templates, New post dialog, Media upload, Feeds tab, Generate ideas dialog)*
