# Platform Integration Feasibility Analysis

> Date: 2026-05-14
> Status: Research Complete
> Purpose: Assess technical feasibility of integrating each social platform, including available API functions, limitations, and implementation scope for SocialBeam -- an **AI-native** social media management platform.
> **AI-Native Context**: These platform adapters serve a dual purpose: (1) enabling manual post creation/scheduling, and (2) providing the execution layer for AI-generated content. The adapter interface must expose platform constraints (character limits, media requirements, privacy settings, rate limits) to the AI agent so it can generate compliant content. See [user-flows-ai-native.md](user-flows-ai-native.md) Section 3.1 for platform-specific AI adaptation rules.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Platform Capability Matrix](#2-platform-capability-matrix)
3. [Tier 1 Platforms (Launch Priority)](#3-tier-1-platforms-launch-priority)
4. [Tier 2 Platforms (Month 3)](#4-tier-2-platforms-month-3)
5. [Tier 3 Platforms (Month 6)](#5-tier-3-platforms-month-6)
6. [Shared Infrastructure Requirements](#6-shared-infrastructure-requirements)
7. [Implementation Risk Assessment](#7-implementation-risk-assessment)
8. [Cost Analysis](#8-cost-analysis)
9. [Feature-to-Platform Mapping](#9-feature-to-platform-mapping)
10. [Recommendations](#10-recommendations)

---

## 1. Executive Summary

### Overall Feasibility: HIGH for core features, MEDIUM for advanced features

All 15 target platforms offer some level of API access for programmatic posting. However, capabilities vary dramatically:

**What works well across most platforms:**
- Publishing text, image, and video content
- Reading basic engagement metrics
- Deleting published posts
- Comment/reply management (except Pinterest, Snapchat)

**What requires our own infrastructure everywhere:**
- **Scheduling**: Only Facebook, YouTube, Google Business Profile, and Telegram offer native scheduling. All others require us to build a queue/cron system.
- **Content adaptation**: No platform auto-adapts content for cross-posting.

**Major limitations:**
- Facebook Group posting: API fully deprecated (April 2024)
- WhatsApp: Outbound messages require pre-approved templates, per-message pricing
- YouTube: Extremely restrictive quota (6 uploads/day default)
- Snapchat: Allowlist-only access, primarily ad-focused
- Reddit: Commercial API costs $0.24/1K calls, no analytics endpoint
- No platform supports editing posts after publishing except Facebook, LinkedIn, Pinterest, YouTube, and Reddit

### Platform Coverage Summary

| Capability | Platforms Supporting | Percentage |
|------------|---------------------|------------|
| Post text | 12/15 | 80% |
| Post images | 14/15 | 93% |
| Post video | 13/15 | 87% |
| Post carousels | 6/15 | 40% |
| Post stories | 4/15 | 27% |
| Post threads | 5/15 | 33% |
| Native scheduling | 4/15 | 27% |
| Edit after publish | 7/15 | 47% |
| Delete after publish | 14/15 | 93% |
| Read analytics | 10/15 | 67% |
| Read/write comments | 9/15 | 60% |
| Free API access | 11/15 | 73% |

---

## 2. Platform Capability Matrix

### 2.1 Core Publishing Capabilities

| Platform | Text | Image | Video | Carousel | Stories | Reels/Shorts | Threads | Polls | GIFs |
|----------|------|-------|-------|----------|---------|--------------|---------|-------|------|
| **Instagram** | Via caption | Yes | Yes (<=60s) | Yes (10) | Yes | Yes | No | No | No |
| **Facebook** | Yes | Yes | Yes (<=240min) | Yes | Yes | Yes | No | Yes | No |
| **Threads** | Yes (500) | Yes | Yes | Yes | No | No | Via replies | Yes | Yes |
| **X/Twitter** | Yes (280/25K) | Yes (4) | Yes (<=140s) | No | No | No | Via replies | Yes | No |
| **LinkedIn** | Yes (3K) | Yes | Yes (<=10min) | Doc carousel | No | No | No | Yes | No |
| **TikTok** | Caption only | No | Yes (<=15min) | No | No | Yes | No | No | No |
| **YouTube** | Description | Thumbnail | Yes (<=256GB) | No | No | Yes (auto) | No | No | No |
| **Pinterest** | Desc (800) | Yes | Yes | Yes (2-5) | No | Idea Pins (not via API) | No | No | No |
| **Google Business** | Yes | Yes | Yes | No | No | No | No | No | No |
| **Reddit** | Yes (40K) | Yes (20MB) | Yes (20MB) | No | No | No | No | No | No |
| **Bluesky** | Yes (300) | Yes (1MB x4) | Yes (100MB, 3min) | No | No | No | Yes | No | No |
| **Telegram** | Yes | Yes | Yes (50MB/2GB) | Yes (10) | No | No | No | Yes | No |
| **WhatsApp** | Template only | In template | In template | No | Status | No | No | No | No |
| **Mastodon** | Yes (500) | Yes (4) | Yes (40MB) | No | No | No | Yes | Yes | No |
| **Snapchat** | Caption | Yes | Yes | No | Yes | Spotlight | No | No | No |

### 2.2 Management Capabilities

| Platform | Schedule | Edit | Delete | Analytics | Comments | Rate Limit | Cost |
|----------|----------|------|--------|-----------|----------|------------|------|
| **Instagram** | No (our queue) | No | Yes | Yes (48hr delay) | Full CRUD | 50 posts/24h | Free |
| **Facebook** | Yes (native) | Yes | Yes | Limited | Full CRUD | 30 reels/24h | Free |
| **Threads** | No (our queue) | No | Yes | Yes (impressions) | Full CRUD | 250+1K replies/24h | Free |
| **X/Twitter** | No (our queue) | Yes (30min) | Yes | Yes | Full CRUD | Varies by tier | Pay-per-use |
| **LinkedIn** | No (our queue) | Partial | Yes | Yes | Full CRUD | Opaque | Free |
| **TikTok** | No (our queue) | No | Yes | Yes (Business) | Full CRUD | 6/min upload | Free |
| **YouTube** | Yes (native) | Yes | Yes | Yes (separate API) | Full CRUD | 10K units/day (~6 uploads) | Free |
| **Pinterest** | No (our queue) | Yes | Yes | Yes (90+ metrics) | No API | 100 calls/sec | Free |
| **Google Business** | Yes (recurring) | Yes | Yes | Yes | Reviews only | 300 QPM, 10 edits/min | Free |
| **Reddit** | No (our queue) | Yes | Yes | No (basic only) | Full CRUD | 100 QPM | Free/$0.24/1K calls |
| **Bluesky** | No (our queue) | No | Yes | Basic | Full CRUD | 1,666 posts/hr | Free |
| **Telegram** | Yes (native, 1K queue) | Yes | Yes | View counts | Via discussion | 30/min, 20/sec | Free |
| **WhatsApp** | Via templates | No | No | Yes (Business API) | Full CRUD | 1K-100K/day tier | Per-message |
| **Mastodon** | No (our queue) | Yes | Yes | Basic | Full CRUD | 300 req/5min | Free |
| **Snapchat** | No (our queue) | Limited | Yes | Limited (Ads: full) | No API | 20 req/sec | Free/Allowlist |

### 2.3 Authentication & Approval Complexity

| Platform | Auth Method | App Review Required | Review Time | Difficulty |
|----------|-------------|---------------------|-------------|------------|
| **Instagram** | OAuth 2.0 (Meta) | Yes (App Review) | 1-4 weeks | Hard |
| **Facebook** | OAuth 2.0 (Meta) | Yes (App Review) | 1-4 weeks | Hard |
| **Threads** | OAuth 2.0 (Meta) | Yes (App Review) | 1-4 weeks | Medium |
| **X/Twitter** | OAuth 1.0a / 2.0 | No (for posting) | N/A | Easy |
| **LinkedIn** | OAuth 2.0 | Yes (with demo) | 1-2 weeks | Medium |
| **TikTok** | OAuth 2.0 | Yes (manual review) | 1-2 weeks | Hard |
| **YouTube** | OAuth 2.0 (Google) | Yes (consent screen) | 2-4 weeks | Hard |
| **Pinterest** | OAuth 2.0 | Yes (developer access) | 1-2 weeks | Medium |
| **Google Business** | OAuth 2.0 (Google) | Yes (14-day review) | Up to 14 days | Medium |
| **Reddit** | OAuth 2.0 | No (free) / Yes (commercial) | 2-4 weeks (commercial) | Easy/Medium |
| **Bluesky** | OAuth / App Password | None | N/A | Trivial |
| **Telegram** | Bot Token | None | N/A | Trivial |
| **WhatsApp** | OAuth + Business Verification | Yes (Business Verification) | 2-4 weeks | Hard |
| **Mastodon** | OAuth 2.0 | None (per-instance) | N/A | Easy |
| **Snapchat** | OAuth 2.0 | Yes (allowlist-only) | Varies | Hard |

---

## 3. Tier 1 Platforms (Launch Priority)

These platforms must be supported at launch. They represent the highest user demand and cover the most common use cases.

### 3.1 Instagram Graph API

**Feasibility: HIGH**

**What We Can Build:**
- Publish image posts, video posts (<=60s), carousels (up to 10 items), and reels
- Write captions with hashtags and mentions
- Read and manage comments (CRUD)
- Read engagement insights (likes, comments, saves, reach, impressions)
- Delete published posts

**What We Cannot Build:**
- Edit posts after publishing (Instagram API does not support this)
- Native scheduling (must use our own queue)
- Stories publishing (API supports it but with limitations)
- Direct message management (separate Messenger API)

**Rate Limits:**
- 50 posts per 24 hours per Instagram account
- 400 media containers per 24 hours
- Insights: 48-hour data delay

**Implementation Notes:**
- Requires Meta App Review with `instagram_content_publish` and `instagram_manage_comments` permissions
- Media creation is a two-step process: create media container, then publish
- Video upload supports remote URLs or direct upload
- `is_carousel_item` flag required for carousel items
- Must handle token refresh (60-day short-lived, extendable to 90-day long-lived)

**Key Constraint:** 50 posts/day limit is generous for most users but limits bulk-scheduling features for power users.

### 3.2 Facebook Graph API

**Feasibility: HIGH**

**What We Can Build:**
- Publish text, photo, video (<=240 min), reel, and carousel posts to Pages
- **Native scheduling** via `scheduled_publish_time` (10 min to 30 days ahead)
- Edit and delete published posts
- Read and manage comments (CRUD)
- Read Page Insights (limited to Pages with 100+ likes for some metrics)
- Manage Page content

**What We Cannot Build:**
- Group posting (Groups API fully deprecated April 2024)
- Read individual Page messages (can send but not read)
- Reels interaction analytics (excluded from Insights)

**Rate Limits:**
- 30 reels per 24 hours
- Standard Graph API rate limits (varies by endpoint)
- Video upload via Resumable Upload API for large files

**Implementation Notes:**
- Requires Meta App Review with `pages_manage_posts`, `pages_manage_engagement`, `pages_read_engagement` permissions
- Native scheduling is a significant advantage -- we can use Facebook's own scheduler or build ours
- Reels have separate publishing flow (`/reels` edge)
- Facebook Link Preview API available for debugging shared URLs

**Key Advantage:** Only platform with native scheduling among Tier 1, reducing our queue complexity.

### 3.3 X/Twitter API v2

**Feasibility: MEDIUM** (due to pricing)

**What We Can Build:**
- Publish tweets (text, media up to 4 images, polls)
- Thread posting via `reply` parameter (chain of tweets)
- Upload media (images, GIFs, video <=140s)
- Edit tweets within 30 minutes (up to 5 edits)
- Delete tweets
- Read and manage replies, likes, retweets
- Read tweet analytics via `tweets/counts` endpoints

**What We Cannot Build:**
- Native scheduling (must use our own queue)
- Edit tweets after 30-minute window
- Spaces (live audio) management

**Rate Limits (API v2, Basic tier):**
- Tweet create: 1,800/month
- Tweet read: 150,000/month
- Media upload: 1,500/month
- User lookup: 300/15 min
- Additional API calls: pay-per-use

**Pricing (Pay-per-use, 2026):**
- Tweet read: $0.005 per post
- Tweet create: $0.01 per post
- Media upload: varies
- Basic tier: ~$100/month for moderate usage
- Pro tier: $5,000/month for heavy usage

**Implementation Notes:**
- OAuth 1.0a for user context (posting on behalf of users)
- No app review required for basic write access
- Thread creation requires careful sequencing (post first, then reply in chain)
- Media upload is separate endpoint, must upload before tweeting with media
- Rate limits vary significantly by tier -- must implement adaptive rate limiting

**Key Risk:** X's API pricing and policies have been volatile. Budget for API costs in per-user pricing calculations. At $0.01/post, a power user posting 10 times/day costs us $3/month just in API fees.

### 3.4 LinkedIn Marketing API

**Feasibility: HIGH**

**What We Can Build:**
- Publish text posts (up to 3,000 chars), image posts, video posts (<=10 min)
- Document/carousel posts (PDF-based carousel)
- Article posts (long-form)
- Edit posts (limited fields: title, description, content body)
- Delete posts
- Read and manage comments (CRUD via Comments API)
- Read engagement analytics (likes, comments, impressions)
- Post to both personal profiles and company pages

**What We Cannot Build:**
- Native scheduling (must use our own queue)
- Poll creation via API (polls supported in UI only)
- Full analytics suite (some metrics require enterprise access)

**Rate Limits:**
- Opaque limits -- must check Developer Portal
- Recommended: implement exponential backoff on 429 responses
- No published per-endpoint limits

**Implementation Notes:**
- Requires OAuth 2.0 with `w_member_social` and `r_organization_social` scopes
- App approval requires demonstration of the application
- Image upload: register upload URL, upload image, then create post with URN
- Video upload: register upload, upload via streaming, poll for processing, create post
- Document posts require PDF upload via UGC Post API
- Company page posting requires `r_organization_social` + `w_organization_social`

**Key Advantage:** Free API with generous limits, strong analytics support.

### 3.5 TikTok Content Posting API

**Feasibility: MEDIUM**

**What We Can Build:**
- Publish video content (via 3-step chunked upload)
- Set video metadata: title, description, privacy settings, allow/disallow comments, duets, stitches
- Read video analytics (via Business API)
- Read and manage comments (via Business API)
- Delete videos

**What We Cannot Build:**
- Photo posts or text-only posts (video-only API)
- Native scheduling (must use our own queue)
- Edit videos after publishing
- Stories or live streaming management

**Rate Limits:**
- Upload init: 6 calls per minute
- General endpoints: varies (check Developer Portal)
- Video upload is the most constrained operation

**Implementation Notes:**
- OAuth 2.0 with `video.upload` scope
- **Strict manual app review** (1-2 weeks) -- must demonstrate the integration
- Three-step upload: init upload (get upload ID), upload video file (chunked), create post with upload ID
- Privacy settings are mandatory on every post (PUBLIC, FRIENDS, SELF)
- Content must pass TikTok moderation before appearing publicly
- Requires HTTPS and specific video format requirements (MP4, H.264)

**Key Constraint:** Video-only platform limits usefulness for text-based social strategies. Strict app review process.

### 3.6 YouTube Data API v3

**Feasibility: MEDIUM** (quota is very restrictive)

**What We Can Build:**
- Upload videos (long-form and Shorts -- same endpoint, auto-classified)
- **Native scheduling** via `publishAt` + `privacyStatus: "private"`
- Edit video metadata (title, description, tags, category, privacy)
- Set custom thumbnails (separate API call)
- Delete videos
- Full comment management (CRUD on comments and replies)
- Read analytics via separate YouTube Analytics API (views, watch time, engagement, demographics, revenue)
- Add captions/subtitles

**What We Cannot Build:**
- Text-only posts (YouTube is video-first)
- Community tab posts (separate API, limited)
- Upload more than ~6 videos/day on default quota

**Rate Limits:**
- **Default quota: 10,000 units/day**
- Video upload: 1,600 units per upload = **max 6 uploads/day**
- Video update: 50 units
- Video list: 1 unit
- Search: 100 units (very expensive)
- Comment create: 50 units
- Quota increase requests: free but takes days to weeks to approve

**Implementation Notes:**
- OAuth 2.0 with `youtube.upload` scope
- **OAuth consent screen verification required** -- Google audits apps
- Resumable upload required for production uploads
- Shorts are auto-detected: <=60 seconds + vertical (9:16) or square (1:1)
- `publishAt` only works with `privacyStatus: "private"` (critical gotcha)
- Thumbnails must be uploaded separately (<2 MB, min 1280x720)
- Category IDs are numeric and region-specific

**Key Constraint:** The 6 uploads/day default quota is the biggest bottleneck. For a multi-channel management tool, we MUST request quota increases. This should be done early in development.

### 3.7 Pinterest API v5

**Feasibility: HIGH**

**What We Can Build:**
- Publish image pins, video pins, and carousel pins (2-5 images)
- Set pin metadata: title (100 chars), description (800 chars), link, board, alt text
- Edit pins (title, description, link)
- Delete pins
- Read comprehensive analytics (90+ metrics per pin)
- Batch analytics for up to 100 pins per request
- Manage boards (CRUD)

**What We Cannot Build:**
- Native scheduling (must use our own queue)
- Idea Pin creation (not supported via API)
- Comment management (no comments API in v5)
- Stories or live content

**Rate Limits:**
- 100 calls/second per user per app
- HTTP 429 on exceed -- implement retry with backoff

**Implementation Notes:**
- OAuth 2.0 with `pins:write`, `boards:read`, `boards:write`, `analytics:read` scopes
- Access tokens expire in 30 days, refresh tokens in 60 days -- need token refresh logic
- Video pin upload: two-step (POST /v5/media, then create pin with media URN)
- Carousel pins use `source_type: "multiple_image_urls"` with `items` array
- 90+ analytics metrics available -- one of the richest analytics APIs

**Key Advantage:** Rich analytics API with 90+ metrics, high rate limits, free access.

---

## 4. Tier 2 Platforms (Month 3)

These platforms are important for competitive differentiation but have moderate complexity or lower immediate demand.

### 4.1 Threads API

**Feasibility: HIGH**

**What We Can Build:**
- Publish text posts (500 characters)
- Publish image, video, carousel, quote, poll, and GIF posts
- Thread creation via reply chaining
- Delete posts
- Read analytics (impressions, likes, replies, quotes, reposts)
- Read and manage comments (CRUD)

**What We Cannot Build:**
- Native scheduling (must use our own queue)
- Edit posts after publishing
- Direct messaging

**Rate Limits:**
- 250 posts per 24 hours
- 1,000 replies per 24 hours
- 4,800 API calls per 24 hours per impression (complex impression-based limiting)

**Implementation Notes:**
- OAuth 2.0 via Meta App Review
- Uses same Meta App infrastructure as Instagram/Facebook
- Media upload follows same two-step pattern as Instagram
- Still maturing -- API may change without extensive notice
- Impression-based rate limiting is unique and requires careful tracking

**Key Note:** Since this shares Meta's OAuth infrastructure, integrating Instagram/Facebook makes Threads relatively easy to add.

### 4.2 Google Business Profile API

**Feasibility: HIGH**

**What We Can Build:**
- Publish CTA posts (BOOK, ORDER, SHOP, LEARN_MORE, SIGN_UP, CALL)
- Publish event posts with start/end dates
- Publish offer/promotional posts
- Upload photos and videos
- **Native recurring scheduling** via `RecurrenceInfo`
- Edit and delete posts
- Read location insights and performance metrics
- Manage reviews (read + reply)
- Search keyword impression data

**What We Cannot Build:**
- Comments on posts (not supported)
- Standard social interactions (likes, shares)

**Rate Limits:**
- 300 QPM across most endpoints
- 10 edits/minute (hard limit, non-increasable)
- 300 QPD for Create/Search Location

**Implementation Notes:**
- OAuth 2.0 via Google Cloud Console
- **Must request API access explicitly** -- approval takes up to 14 days
- Businesses must demonstrate legitimate use (valid business email, website, GBP compliance)
- Batch insight calls limited to 10 locations per request
- API is v4 and relatively stable

**Key Advantage:** Niche but valuable for local businesses. Native recurring scheduling is unique.

### 4.3 Reddit API

**Feasibility: MEDIUM**

**What We Can Build:**
- Publish text posts (up to 40,000 characters)
- Publish link posts
- Publish image posts (up to 20 MB)
- Edit and delete posts and comments
- Full comment management (CRUD, nested replies)
- Read basic engagement data (upvote/downvote scores)

**What We Cannot Build:**
- Dedicated analytics/insights API (only basic post scores)
- Native scheduling (must use our own queue)
- Subreddit-specific features (some require moderator access)

**Rate Limits:**
- 100 QPM with OAuth
- 10 QPM without OAuth
- Commercial access: ~$0.24 per 1,000 API calls (requires contract)

**Implementation Notes:**
- OAuth 2.0 with script, web, or installed app types
- **Commercial use requires formal contract with Reddit**
- Free tier explicitly prohibits commercial use
- Many subreddits prohibit automated/bot posting
- Must handle subreddit-specific rules and moderation

**Key Risk:** Reddit's API access has been increasingly restrictive post-2023. Commercial pricing can add up. Many communities resist automated posting.

### 4.4 Mastodon API

**Feasibility: HIGH**

**What We Can Build:**
- Publish text posts (500 characters, configurable per instance)
- Publish image posts (up to 4 images)
- Publish video posts (up to 40 MB)
- Edit and delete posts (instance-dependent)
- Thread creation via reply chaining
- Full comment/interaction management
- Read basic analytics (favorites, reblogs, replies)

**What We Cannot Build:**
- Centralized analytics (decentralized network, no unified API)
- Cross-instance guaranteed delivery

**Rate Limits:**
- 300 requests per 5 minutes (typical, varies by instance)
- Per-instance rate limits

**Implementation Notes:**
- OAuth 2.0, but each Mastodon instance has its own auth server
- Must implement instance discovery and per-instance OAuth flows
- API is relatively standardized across instances (Mastodon API spec)
- No app review required per se, but each instance may have its own policies
- Open-source, well-documented API

**Key Advantage:** No app review, open protocol, easy to implement. Great for decentralized social presence.

---

## 5. Tier 3 Platforms (Month 6)

These platforms have lower demand, higher integration complexity, or restrictive access requirements.

### 5.1 Bluesky API (AT Protocol)

**Feasibility: HIGH** (technically easiest, but platform is still maturing)

**What We Can Build:**
- Publish text posts (300 graphemes)
- Publish image posts (up to 4 images, 1 MB each)
- Publish video posts (up to 100 MB, 3 minutes)
- Thread creation via reply references
- Delete posts
- Full comment/interaction management (replies, likes, reposts, quotes)
- Read engagement data (public, unauthenticated)

**What We Cannot Build:**
- Edit posts (no native edit support)
- Dedicated analytics API
- Native scheduling

**Rate Limits:**
- 1,666 posts/hour (5,000 points/hour, CREATE = 3 points)
- 35,000 points/day
- 3,000 requests per 5 minutes (per IP)
- 25 videos or 10 GB total per day
- 100 MB max file size

**Implementation Notes:**
- OAuth recommended for production (app passwords deprecated)
- **No app review required** -- open protocol
- Rich text requires `@atproto/api` SDK for grapheme counting and facet detection
- Email verification required for video uploads
- Other AT Protocol providers may have different limits

**Key Advantage:** Zero friction to integrate. No corporate approval. Open protocol. But platform is still early-stage.

### 5.2 Telegram Bot API

**Feasibility: HIGH** (technically trivial)

**What We Can Build:**
- Publish text messages with Markdown/HTML formatting
- Publish photos, videos, documents, audio
- Publish polls
- Publish media albums (up to 10 items)
- **Native scheduling** via `messages.sendScheduledMessage` (up to 1,000 messages per channel)
- Edit and delete messages
- Read message view counts
- Full comment management (via linked discussion groups)

**What We Cannot Build:**
- Dedicated analytics API
- Direct channel comments (requires linked discussion group)

**Rate Limits:**
- 30 messages per minute per chat
- 20 messages per second globally
- HTTP 420 `FLOOD_WAIT_X` when rate limited

**Implementation Notes:**
- Bot token from @BotFather -- no OAuth needed
- **No app review required**
- Bot must be admin in target channel
- MTProto protocol available for high-volume (2 GB file uploads vs 50 MB)
- Adaptive retry logic needed for FLOOD_WAIT responses

**Key Advantage:** Easiest platform to integrate. No approval, simple auth, native scheduling. But limited analytics.

### 5.3 WhatsApp Business API

**Feasibility: LOW-MEDIUM** (complex and expensive)

**What We Can Build:**
- Send templated outbound messages (marketing, utility, service categories)
- Receive and respond to inbound messages
- Read message delivery status and analytics
- Full conversation management

**What We Cannot Build:**
- Free-form outbound posting (requires pre-approved templates)
- Edit or delete sent messages
- Native scheduling (must queue and send at scheduled time)
- Broadcast lists (replaced by template-based messaging)

**Rate Limits:**
- Tiered by phone number quality rating: 1K, 10K, 100K+ messages/day
- 80-1,000 messages/second throughput (tier-dependent)

**Pricing (Per-message, since July 2025):**
- Marketing: ~$0.013-$0.18+ per message (region-dependent)
- Utility: variable by region
- Service: **always free** (user-initiated conversations)

**Implementation Notes:**
- OAuth 2.0 + Business Verification required
- All outbound messages require **pre-approved templates**
- Template approval process adds latency to campaign planning
- Business Verification takes 2-4 weeks
- Per-message pricing can become expensive at scale

**Key Risk:** This is fundamentally a messaging platform, not a social posting platform. The template requirement and per-message pricing make it a poor fit for social media management. Consider dropping from scope or limiting to customer service use case only.

### 5.4 Snapchat Marketing API

**Feasibility: LOW** (restrictive access, ad-focused)

**What We Can Build:**
- Publish Stories (ephemeral, 24-hour)
- Publish Saved Stories (permanent on Public Profile)
- Publish Spotlights (permanent video content)
- Manage public profile assets
- Read limited organic analytics
- Full advertising campaign management (Ads API)

**What We Cannot Build:**
- Native scheduling
- Edit stories (ephemeral by nature)
- Comment management (not supported)
- Organic analytics (limited compared to Ads)

**Rate Limits:**
- 20 requests/second per app
- 10 requests/second per access token

**Implementation Notes:**
- OAuth 2.0 via Snap Business Manager
- **Allowlist-only access** -- must contact Snap representative
- Media upload is complex: AES-256-CBC encryption, file chunking for >32MB
- API documentation migrating (marketingapi.snapchat.com -> developers.snap.com)
- Primarily an advertising platform

**Key Risk:** Allowlist-only access is a blocker for self-serve onboarding. Consider dropping or limiting to enterprise customers who can wait for manual approval.

---

## 6. Shared Infrastructure Requirements

### 6.1 Scheduling Engine (Required for 11 of 15 platforms)

Only 4 platforms (Facebook, YouTube, Google Business, Telegram) offer native scheduling. For the other 11, we must build a robust scheduling engine:

**Architecture:**
```
User schedules post -> Store in DB with publish timestamp
                          │
                          ▼
              Scheduler Service (cron/polling)
              Check for posts due in next 60s
                          │
                          ▼
              Queue System (Redis/Bull or AWS SQS)
              Rate-limited per platform
                          │
                          ▼
              Platform API Adapter
              Handle retries, dead-letter queue
                          │
                          ▼
              Status tracking (published, failed, retrying)
              Notify user of failures
```

**Key Requirements:**
- Timezone-aware scheduling (user schedules in their timezone, we convert to UTC)
- Retry logic with exponential backoff per platform's rate limits
- Dead-letter queue for permanently failed posts
- User notifications on failure (email, in-app, push)
- Post-publish status tracking (published, failed, partially published)
- Idempotency (prevent duplicate posts on retry)

### 6.2 Token Management System

**Requirements:**
- OAuth 2.0 token storage and refresh for all platforms
- Token expiry monitoring and auto-refresh
- Re-authentication prompts when refresh fails
- Per-platform token scope tracking
- Secure token storage (encrypted at rest)

**Token Lifetimes:**
| Platform | Access Token | Refresh Token | Notes |
|----------|-------------|---------------|-------|
| Instagram | 60 days | Extendable to 90 days | Meta token |
| Facebook | 60 days | Extendable to 90 days | Meta token |
| Threads | 60 days | Extendable to 90 days | Meta token |
| X/Twitter | 2 hours | Refreshable | OAuth 1.0a or 2.0 |
| LinkedIn | 60 days | Refreshable | |
| TikTok | 24 hours | 30 days | Must refresh daily |
| YouTube | 1 hour | Refreshable | Google token |
| Pinterest | 30 days | 60 days | Must refresh monthly |
| Google Business | 1 hour | Refreshable | Google token |
| Reddit | 1 hour | Refreshable | |
| Bluesky | Short-lived | Refreshable | Or app password |
| Telegram | N/A | N/A | Bot token (no expiry) |
| WhatsApp | 24 hours | 30 days | Meta token |
| Mastodon | Varies | Varies | Per-instance |
| Snapchat | Varies | Varies | |

### 6.3 Media Upload Pipeline

Different platforms have vastly different media upload requirements:

| Platform | Upload Method | Max Size | Format | Steps |
|----------|--------------|----------|--------|-------|
| Instagram | Remote URL or direct | 1 GB | MP4, MOV, JPG, PNG | 2-step (create container, publish) |
| Facebook | Direct or resumable | 10 GB | MP4, MOV, JPG, PNG | 1-2 steps |
| X/Twitter | Separate media endpoint | 512 MB | MP4, MOV, JPG, PNG, GIF | 2-step (upload, attach to tweet) |
| LinkedIn | Register + upload + poll | 5 GB | MP4, JPG, PNG, PDF | 3-step (register, upload, create post) |
| TikTok | Chunked upload | Varies | MP4 (H.264) | 3-step (init, upload, create) |
| YouTube | Resumable upload | 256 GB | MP4, MOV, AVI, etc. | 1-step (resumable) |
| Pinterest | URL or base64 | Varies | JPG, PNG, MP4 | 1-2 steps |
| Bluesky | Upload blob first | 100 MB | MP4, JPG, PNG, WebP | 2-step (upload blob, create record) |
| Snapchat | AES-256 encrypted, chunked | Varies | MP4, JPG | Multi-step (encrypt, chunk, upload, create) |

### 6.4 Rate Limit Management

Each platform has different rate limiting strategies. We need a unified rate limiter:

| Strategy | Platforms | Implementation |
|----------|-----------|----------------|
| Daily quota | Instagram, Threads, YouTube | Track daily count, reset at midnight (platform timezone) |
| Per-minute QPM | Pinterest, Google Business, Reddit, Mastodon | Sliding window counter |
| Impression-based | Threads (complex) | Track impression count, derive call budget |
| Points-based | Bluesky, YouTube quota | Each action costs points, refill over time |
| Sliding window | X/Twitter, Telegram | Track requests in rolling time window |
| Tiered | WhatsApp, X/Twitter | Different limits per account tier |
| Hard cap | Google Business (10 edits/min) | Absolute limit, cannot exceed |

---

## 7. Implementation Risk Assessment

### 7.1 Per-Platform Risk

| Platform | Technical Risk | Business Risk | Overall | Notes |
|----------|---------------|---------------|---------|-------|
| **Instagram** | Medium | Low | Medium | Meta API changes frequent, but well-documented |
| **Facebook** | Low | Low | Low | Stable API, native scheduling helps |
| **Threads** | Medium | Medium | Medium | API still maturing, may change |
| **X/Twitter** | Low | High | High | API pricing volatile, policy changes frequent |
| **LinkedIn** | Low | Low | Low | Stable, free API, good docs |
| **TikTok** | Medium | Medium | Medium | Strict app review, video-only limitation |
| **YouTube** | Medium | Low | Medium | Quota extremely restrictive, must request increase |
| **Pinterest** | Low | Low | Low | Well-documented, high rate limits, free |
| **Google Business** | Low | Low | Low | Stable v4 API, 14-day access approval |
| **Reddit** | Low | Medium | Medium | Commercial costs, community resistance |
| **Bluesky** | Low | Medium | Low | Open protocol, but platform still early |
| **Telegram** | Low | Low | Low | Trivial to implement, no restrictions |
| **WhatsApp** | High | High | High | Template requirement, per-message pricing |
| **Mastodon** | Low | Low | Low | Open, but per-instance complexity |
| **Snapchat** | High | High | High | Allowlist-only, ad-focused, complex upload |

### 7.2 Cross-Cutting Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Platform API deprecation** | Critical | Medium | Abstraction layer per platform; rapid adaptation team |
| **OAuth token revocation** | High | Medium | Auto-re-auth prompts; token health monitoring |
| **Rate limit changes** | Medium | Medium | Configurable rate limits; monitoring and alerts |
| **Platform policy changes** | High | High (X/Twitter, Reddit) | Legal review of API ToS; budget flexibility |
| **App review delays** | Medium | Medium | Start app review process early in development |
| **Media upload failures** | Medium | Medium | Resumable uploads; retry logic; user notification |
| **Scheduling drift** | Low | Medium | NTP-synced servers; timezone-aware scheduling |
| **Data loss** | Critical | Low | Database backups; event sourcing for post history |

---

## 8. Cost Analysis

### 8.1 API Costs Per Platform

| Platform | API Cost | Estimated Cost Per 100 Users/Month | Notes |
|----------|----------|-----------------------------------|-------|
| **Instagram** | Free | $0 | Meta API is free |
| **Facebook** | Free | $0 | Meta API is free |
| **Threads** | Free | $0 | Meta API is free |
| **X/Twitter** | Pay-per-use | $30-$300 | $0.01/post create, $0.005/post read; varies by usage |
| **LinkedIn** | Free | $0 | Free API |
| **TikTok** | Free | $0 | Free API after approval |
| **YouTube** | Free | $0 | Free within quota; quota increase is free |
| **Pinterest** | Free | $0 | Free API |
| **Google Business** | Free | $0 | Free API |
| **Reddit** | Free (personal) / Paid (commercial) | $0-$50 | $0.24/1K calls for commercial; varies |
| **Bluesky** | Free | $0 | Open protocol |
| **Telegram** | Free | $0 | Bot API is free |
| **WhatsApp** | Per-message | $130-$1,800+ | $0.013-$0.18/message; highly usage-dependent |
| **Mastodon** | Free | $0 | Open protocol |
| **Snapchat** | Free (organic) | $0 | Free for organic posting (if allowlisted) |

### 8.2 Infrastructure Cost Estimates

| Component | Estimated Monthly Cost | Scales With |
|-----------|----------------------|-------------|
| Database (PostgreSQL) | $50-200 | Number of users, post history |
| Queue/Cache (Redis) | $20-100 | Number of scheduled posts, rate limiting |
| Media Storage (S3) | $10-500 | User media uploads (1 GB free tier limit) |
| CDN (CloudFront) | $20-200 | Media delivery bandwidth |
| Compute (servers) | $100-500 | API request volume, scheduling engine |
| SSL/Certificates | $0-20 | Let's Encrypt (free) or paid |
| Monitoring (Sentry/Datadog) | $25-100 | Error tracking, performance monitoring |
| **Total Infrastructure** | **$225-1,620** | Scales with user base |

### 8.3 Total Platform Cost Summary

| Scenario | Free Users | AI Users | API Costs | Infrastructure | Total Monthly |
|----------|-----------|----------|-----------|---------------|---------------|
| **Launch (1K free, 100 AI)** | 1,000 | 100 | $30-50 | $225-400 | $255-450 |
| **Growth (10K free, 1K AI)** | 10,000 | 1,000 | $300-500 | $400-800 | $700-1,300 |
| **Scale (100K free, 10K AI)** | 100,000 | 10,000 | $3,000-5,000 | $800-1,620 | $3,800-6,620 |

**Note:** WhatsApp costs excluded from above (only relevant if WhatsApp is included). If WhatsApp is included for 10% of users, add $130-$1,800 depending on usage volume.

---

## 9. Feature-to-Platform Mapping

### 9.1 Core Feature Availability by Platform

| SocialBeam Feature | Instagram | Facebook | Threads | X/Twitter | LinkedIn | TikTok | YouTube | Pinterest | Google Business | Reddit | Bluesky | Telegram | WhatsApp | Mastodon | Snapchat |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Schedule post** | Yes (our queue) | Yes (native) | Yes (our queue) | Yes (our queue) | Yes (our queue) | Yes (our queue) | Yes (native) | Yes (our queue) | Yes (native) | Yes (our queue) | Yes (our queue) | Yes (native) | Limited (template) | Yes (our queue) | Yes (our queue) |
| **Post image** | Yes | Yes | Yes | Yes | Yes | No | No (thumb) | Yes | Yes | Yes | Yes | Yes | Template | Yes | Yes |
| **Post video** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Template | No | Yes |
| **Post carousel** | Yes | Yes | Yes | No | Yes (doc) | No | No | Yes | No | No | No | Yes | No | No | No |
| **Post thread** | No | No | Via replies | Via replies | No | No | No | No | No | No | Yes | No | No | Yes | No |
| **Edit post** | No | Yes | No | Yes (30min) | Partial | No | Yes | Yes | Yes | Yes | No | Yes | No | Yes | Limited |
| **Delete post** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes | Yes |
| **Read analytics** | Yes | Partial | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Basic | Basic | Yes | Basic | Limited |
| **Manage comments** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Reviews | Yes | Yes | Yes | Yes | Yes | No |
| **Cross-post adapt** | Yes | Yes | Yes | Yes | Yes | Yes | Partial | Yes | Yes | Yes | Yes | Yes | Limited | Yes | Yes |

### 9.2 Feature Priority vs Platform Support

**P0 Features (Must Work on All Tier 1 Platforms):**

| Feature | Instagram | Facebook | Threads | X/Twitter | LinkedIn | TikTok | YouTube | Pinterest |
|---------|-----------|----------|---------|-----------|----------|--------|---------|-----------|
| Schedule & publish image | Supported | Supported | Supported | Supported | Supported | N/A | N/A | Supported |
| Schedule & publish video | Supported | Supported | Supported | Supported | Supported | Supported | Supported | Supported |
| Schedule & publish text | Caption | Supported | Supported | Supported | Supported | Caption | Description | Caption |
| Read basic analytics | Supported | Partial | Supported | Supported | Supported | Supported | Supported | Supported |
| Delete post | Supported | Supported | Supported | Supported | Supported | Supported | Supported | Supported |

**P1 Features (Should Work on Most Platforms):**

| Feature | Instagram | Facebook | Threads | X/Twitter | LinkedIn | TikTok | YouTube | Pinterest |
|---------|-----------|----------|---------|-----------|----------|--------|---------|-----------|
| Edit post | No | Yes | No | 30 min | Partial | No | Yes | Yes |
| Manage comments | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Carousel/multi-image | Yes | Yes | Yes | No | Doc | No | No | Yes |
| Thread posting | No | No | Yes | Yes | No | No | No | No |

---

## 10. Recommendations

### 10.1 Platform Inclusion Strategy

**Launch (Tier 1) - Must Include:**
1. Instagram (high demand, free API, well-documented)
2. Facebook (high demand, native scheduling, stable API)
3. X/Twitter (high demand, but budget for API costs)
4. LinkedIn (high demand, free API, good analytics)
5. TikTok (growing demand, video-first, strict review)
6. YouTube (video/Shorts, native scheduling, quota-limited)
7. Pinterest (visual content, rich analytics, easy integration)

**Month 3 (Tier 2) - Add:**
8. Threads (shares Meta infrastructure with Instagram/Facebook)
9. Google Business Profile (local business niche, native scheduling)
10. Reddit (community engagement, commercial costs)
11. Mastodon (open protocol, no review, easy to add)

**Month 6 (Tier 3) - Evaluate:**
12. Bluesky (open protocol, but early-stage platform)
13. Telegram (trivial to add, but limited analytics)
14. WhatsApp (complex and expensive -- consider dropping or limiting to customer service)
15. Snapchat (allowlist-only, ad-focused -- consider dropping or enterprise-only)

### 10.2 Platforms to Consider Dropping

**WhatsApp Business API:**
- Fundamentally a messaging platform, not social posting
- Pre-approved template requirement breaks social media workflow
- Per-message pricing scales poorly
- **Recommendation:** Drop from general social management. Consider as separate "customer service" module for unified inbox only.

**Snapchat Marketing API:**
- Allowlist-only access prevents self-serve onboarding
- Primarily ad-focused; organic posting API is secondary
- Complex media upload (AES encryption, chunking)
- **Recommendation:** Drop or limit to Enterprise tier where manual approval is acceptable.

### 10.3 Technical Architecture Recommendations

1. **Build a platform adapter pattern:** Each platform gets its own adapter class implementing a common interface (`PostAdapter`). This isolates platform-specific logic and makes adding new platforms straightforward. **AI-NATIVE NOTE**: Adapters must expose a `getConstraints()` method returning character limits, media requirements, privacy options, and rate limit status -- the AI agent uses these constraints to generate platform-compliant content (see [user-flows-ai-native.md](user-flows-ai-native.md) Section 3.1, Platform-Specific AI Adaptation).

2. **Centralized scheduling engine:** Since 11 of 15 platforms need our own scheduling queue, build a robust, timezone-aware scheduler from day one. Use Redis/Bull or AWS SQS with retry logic.

3. **Abstract rate limiting:** Build a unified rate limiter that supports all strategies (daily quota, QPM, points-based, sliding window, tiered). Each adapter registers its rate limit rules.

4. **Media upload abstraction:** Create a media pipeline that handles platform-specific upload requirements (direct, resumable, chunked, encrypted). Normalize to a common flow.

5. **Token management service:** Centralized OAuth token storage, refresh, and health monitoring. Alert users before token expiry.

6. **Failure notification system:** Since posts can fail silently on some platforms (known user pain point), build proactive failure detection and user notification.

### 10.4 App Review Timeline

Start app review processes in parallel with development:

| Platform | When to Apply | Expected Approval |
|----------|--------------|-------------------|
| Meta (Instagram, Facebook, Threads) | Week 1 of development | 1-4 weeks |
| Google (YouTube, Google Business) | Week 1 of development | 2-4 weeks |
| LinkedIn | Week 2 of development | 1-2 weeks |
| TikTok | Week 2 of development | 1-2 weeks |
| Pinterest | Week 3 of development | 1-2 weeks |
| Reddit (commercial) | Month 1 | 2-4 weeks |
| Snapchat | Month 4 (if pursuing) | Varies |

**Critical Path:** Meta and Google reviews are the longest. Start these immediately.

---

## 11. Open-Source Implementations & Code References

This section catalogs the latest open-source libraries, SDKs, and reference implementations for each platform. All entries are from 2025-2026. Production-ready libraries are marked; reference-quality libraries are useful for understanding API patterns but should not be used directly in production.

### 11.1 Instagram Graph API

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **talha-ansarii/Instagram-graph-api-sdk** | https://github.com/talha-ansarii/Instagram-graph-api-sdk | Feb 2026 | - | TS | **Production-ready.** Clean class-based API, full type safety, ESM/CJS. Covers posting (images, videos, reels, stories, carousels), messaging, comments, hashtags, insights. npm: `instagram-graph-api-sdk`. Apache 2.0. |
| **Up-to-code/Instagram-Meta-Business-API-Handler** | https://github.com/Up-to-code/Instagram-Meta-Business-API-Handler | Nov 2025 | - | TS | **Production-ready.** Comprehensive wrapper covering full IG Graph API surface. Post creation, stories, comments, DMs, analytics, hashtags, mentions. |
| **dilame/instagram-private-api** | https://github.com/dilame/instagram-private-api | Ongoing | 6,400+ | TS | Uses unofficial private API. **NOT suitable for SocialBeam** -- ToS violation risk. |

**API Call Pattern (from implementations):**
```
Step 1: POST /{ig-user-id}/media
  Body: { image_url: "...", caption: "..." }
  Response: { id: "container_id" }

Step 2: GET /{ig-user-id}/container_status?container_id={id}
  Poll until status = "FINISHED"

Step 3: POST /{ig-user-id}/media_publish
  Body: { creation_id: "container_id" }
```

### 11.2 Facebook Graph API

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **facebook/facebook-nodejs-business-sdk** | https://github.com/facebook/facebook-nodejs-business-sdk | Mar 2026 (v25.0.1) | 590 | JS/TS | **Production-ready.** Official Meta SDK. Covers Marketing API, Pages API, scheduled posts, media uploads. npm: `facebook-nodejs-business-sdk`. 257K weekly downloads. |
| **ralphcrisostomo/n8n-nodes-meta-publisher** | https://github.com/ralphcrisostomo/n8n-nodes-meta-publisher | Aug 2025 | - | TS | **Production-ready patterns.** n8n community node covering Instagram, Facebook, Threads. Great reference for the complete posting pipeline with media creation, polling, retries. |

**Scheduling Pattern:**
```typescript
POST /{page-id}/feed
Body: {
  message: "Post content",
  published: false,
  scheduled_publish_time: 1747267200  // Unix timestamp
}
```

### 11.3 Threads API

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **artisbautra/threads-api-ai** | https://github.com/artisbautra/threads-api-ai | 2026 | - | TS | **Production-ready.** Full TypeScript support. OAuth 2.0, publish text/image/video/carousel. |
| **saadiq/threads-cli** | https://github.com/saadiq/threads-cli | Jan 2026 | - | TS | CLI tool showing the API flow clearly. Reference-quality for posting patterns. |
| **MetaThreads/meta-threads-sdk** | https://github.com/MetaThreads/meta-threads-sdk | Jan 2026 | - | Python | Well-designed with sync + async clients, Pydantic models. Python only. |

**API Call Pattern:** Same two-step as Instagram (create container -> poll -> publish). Shares Meta OAuth infrastructure.

### 11.4 X/Twitter API v2

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **plhery/node-twitter-api-v2** | https://github.com/plhery/node-twitter-api-v2 | Jan 2026 | 1,600 | TS | **Production-ready.** Most mature community library. Zero deps, 23kb gzipped, strongly typed. 272K weekly npm downloads. Covers posting, media upload (chunked), OAuth 1.0a + OAuth2, streaming. MIT. |
| **xdevplatform/twitter-api-typescript-sdk** | https://github.com/xdevplatform/twitter-api-typescript-sdk | Jan 2024 | 990 | TS | Official X SDK but **stale** (last updated 2024). Marked beta by X. Use community library instead. |

**Usage Pattern:**
```typescript
import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  appKey: '...', appSecret: '...',
  accessToken: '...', accessSecret: '...'
});

// Simple tweet
await client.v2.tweet('Hello from SocialBeam!');

// Tweet with media
const mediaId = await client.v1.uploadMedia('./image.png');
await client.v2.tweet({ text: 'With image!', media: { media_ids: [mediaId] } });

// Thread (reply chain)
const first = await client.v2.tweet({ text: 'Part 1' });
await client.v2.tweet({ text: 'Part 2', reply: { in_reply_to_tweet_id: first.data.id } });
```

### 11.5 LinkedIn Marketing API

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **linkedin-developers/linkedin-api-js-client** | https://github.com/linkedin-developers/linkedin-api-js-client | Jul 2024 | 126 | TS | **Official, beta stage.** Full Rest.li protocol v2 support, OAuth2, generic CRUD. Use as base but build custom UGC post helpers on top. |
| **gfiocco/linkedin-node-api** | https://github.com/gfiocco/linkedin-node-api | Jun 2025 | 14 | JS | **Reference quality.** Minimalistic but useful for 3-step image upload pattern. MIT. |

**UGC Post Pattern:**
```typescript
import { RestliClient } from 'linkedin-api-client';

const restliClient = new RestliClient();

await restliClient.create({
  resourcePath: '/ugcPosts',
  entity: {
    author: 'urn:li:person:ABC123',
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: 'Hello from SocialBeam!' },
        shareMediaCategory: 'NONE'
      }
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
  },
  accessToken: '...',
  versionString: '202401'  // Date format, not semver
});
```

**Key Quirks:** URN format required (`urn:li:person:abc123`), 3-step image upload (initialize -> binary PUT -> create share with URN), `LinkedIn-Version: 202401` header, 60-day token expiry.

### 11.6 TikTok Content Posting API

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **redonvn/tiktok-sdk** | https://github.com/redonvn/tiktok-sdk | Oct 2025 | 6 | TS | **Promising but untested.** Clean API coverage, full TypeScript. npm: `@redonvn/tiktok-sdk`. Few downloads. Useful TypeScript reference. MIT. |
| **Inoue-AI/TikTok-Python-SDK** | https://github.com/Inoue-AI/TikTok-Python-SDK | Feb 2026 | 0 | Python | **Reference quality.** Async, Pydantic v2 typed responses, `post_video_from_url()`, `wait_for_post_completion()`. Python only. |

**API Call Pattern:**
```
Step 1: POST https://open.tiktokapis.com/v2/post/publish/video/init/
  Body: {
    post_info: { title: "...", privacy_level: "PUBLIC" },
    source_info: { source: "PULL_FROM_URL", video_url: "https://..." }
  }
  Response: { publish_id: "...", upload_url: "..." }

Step 2: PUT {upload_url}  (upload video binary)

Step 3: GET /v2/post/publish/status/fetch/{publish_id}
  Poll until status = "PUBLISH_COMPLETE"
```

### 11.7 YouTube Data API v3

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **googleapis/google-api-nodejs-client** | https://github.com/googleapis/google-api-nodejs-client | May 2026 | 12,145+ | TS | **Production-ready.** Official Google client. `videos.insert` with `publishAt` scheduling, OAuth 2.0, JWT. npm: `googleapis` or standalone `@googleapis/youtube` (v31.0.0, 35K weekly downloads). |
| **microfox-ai/microfox** | https://github.com/microfox-ai/microfox/tree/main/packages/youtube | 2026 | - | TS | Clean wrapper with `uploadVideo()`, built-in OAuth token management, Zod validation. Good reference for token refresh patterns. |

**Scheduling Pattern:**
```typescript
import { google } from 'googleapis';

const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

await youtube.videos.insert({
  part: ['snippet', 'status'],
  requestBody: {
    snippet: { title: 'My Video', description: 'Description' },
    status: {
      privacyStatus: 'private',  // Must be private to schedule!
      publishAt: '2026-06-01T10:00:00Z'
    }
  },
  media: { body: fs.createReadStream('video.mp4') }
});
```

### 11.8 Pinterest API v5

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **pinterest/api-quickstart** | https://github.com/pinterest/api-quickstart | Apr 2026 | 179 | JS/Python | **Production-ready reference.** Official Pinterest examples. OAuth 2.0, create pins, manage boards, media upload. Node.js directory with full examples. |
| **vijaypatoliya/pinterest-node-api** | https://github.com/vijaypatoliya/pinterest-node-api | 2025 | - | JS/TS | Clean async/await wrapper. Pin creation, board management, media upload. |

**Direct REST calls (no SDK needed):**
```typescript
POST /v5/pins
Body: {
  board_id: "board_id",
  media_source: { source_type: "image_url", url: "https://..." },
  title: "Pin Title",
  description: "Pin Description (max 800 chars)",
  link: "https://..."
}
```

### 11.9 Google Business Profile API

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **googleapis/google-api-nodejs-client** | https://github.com/googleapis/google-api-nodejs-client | 2026 | 12,145+ | TS | **Production-ready.** `@googleapis/mybusinessbusinessinformation` sub-package. Location management, posts/updates, OAuth 2.0. Same package as YouTube. |

### 11.10 Reddit API

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **bag-man/tsraw** | https://github.com/bag-man/tsraw | Mar 2025 | - | TS | **Good for new projects.** TypeScript-first, `submit()`, `edit()`, `sticky()`, rate limit protection. Active maintenance. |
| **not-an-aardvark/snoowrap** | https://github.com/not-an-aardvark/snoowrap | May 2021 | 1,200+ | JS | **Archived (Feb 2023).** Battle-tested but unmaintained. `submitSelfpost()`, `submitLinkpost()`, rate limit protection, token refresh. Use with caution. |

### 11.11 Bluesky AT Protocol

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **bluesky-social/atproto** | https://github.com/bluesky-social/atproto | May 2026 | 9,300+ | TS | **Production-ready, best-in-class.** npm: `@atproto/api` v0.19.16. 115.8K weekly downloads, 110+ contributors. `Agent.post()`, OAuth, rich text, feed generators. |
| **@atproto/oauth-client-node** | Same repo | May 2026 | - | TS | OAuth client for Node.js applications. |

**Usage Pattern:**
```typescript
import { AtpAgent } from '@atproto/api';

const agent = new AtpAgent({ service: 'https://bsky.social' });
await agent.login({ identifier: 'user.bsky.social', password: 'app-password' });

// Simple post
await agent.post({ text: 'Hello from SocialBeam!' });

// Post with image
const blob = await agent.uploadBlob(imageBuffer, { encoding: 'image/jpeg' });
await agent.post({
  text: 'Check this out!',
  embed: {
    $type: 'app.bsky.embed.images',
    images: [{ image: blob.data.blob, alt: 'Description' }]
  }
});
```

### 11.12 Telegram Bot API

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **telegraf/telegraf** | https://github.com/telegraf/telegraf | Jan 2025 (v4.16.3) | 9,133+ | TS | **Production-ready.** 472K weekly downloads, 140 contributors. Full Bot API 7.1, middleware, webhooks. **Note:** Telegram does NOT allow bot-side scheduling (`schedule_date` returns `SCHEDULE_BOT_NOT_ALLOWED`). Must implement server-side cron. |
| **yagop/node-telegram-bot-api** | https://github.com/yagop/node-telegram-bot-api | Ongoing | 9,140+ | JS | Simple API, needs `@types/node-telegram-bot-api` for TS. |

### 11.13 Mastodon API

| Library | URL | Updated | Stars | Lang | Notes |
|---------|-----|---------|-------|------|-------|
| **neet/masto.js** | https://github.com/neet/masto.js/ | Mar 2026 (v7.10.2) | - | TS | **Production-ready.** 238 releases since 2018, 40 contributors, 100% test coverage. `masto.v1.statuses.create()`, media upload, OAuth, quotes (Mastodon 4.5+). 6KB gzipped. Node.js >= 20.x. |

**Usage Pattern:**
```typescript
import { login } from 'masto';

const masto = await login('https://mastodon.social', { accessToken: '...' });

const status = await masto.v1.statuses.create({
  status: 'Hello from SocialBeam!',
  visibility: 'public'
});
```

### 11.14 Full-Platform Open-Source Management Tools

These complete open-source social media management tools are valuable architecture references:

| Tool | URL | Updated | Stars | Stack | Platforms | Notes |
|------|-----|---------|-------|-------|-----------|-------|
| **Postiz (gitroomhq/postiz-app)** | https://github.com/gitroomhq/postiz-app | Apr 2026 (v2.21.7) | 30,354 | Next.js + NestJS + PostgreSQL + Prisma + Temporal + Redis | 30+ | **Most relevant to SocialBeam.** 194 releases, 70 contributors. AI scheduling, visual calendar, team collaboration. AGPL-3.0. |
| **BrightBean Studio** | https://github.com/brightbeanxyz/brightbean-studio | May 2026 | 1,666 | Django/Python | 10+ | Multi-workspace, approval workflows, unified inbox, media library. AGPL-3.0. |
| **Mixpost** | https://github.com/inovector/mixpost | Mar 2026 (v2.6.0) | 3,234 | Vue + PHP/Laravel | 10+ | Free self-hosted + Pro version. FB Graph API v24/v25 support. Instagram/Threads in Pro only. |
| **chronex** | https://github.com/prncexe/chronex | 2026 | 19 | Next.js 16 + Cloudflare Workers + Drizzle + Neon | 6 | Distributed job processing, 12-hour cron, media uploads to B2. MIT. |
| **latewiz** | https://github.com/zernio-dev/latewiz | 2026 | 24 | TypeScript | 13 | Visual calendar, smart queue, media up to 5GB. MIT. |
| **hayon** | https://github.com/devxtra-community/hayon | Dec 2025 | 4 | Next.js + Express + MongoDB + Redis + RabbitMQ | Multi | AI captions (Gemini), smart scheduling, Stripe. |
| **Postflow (kv100)** | https://github.com/kv100/Postflow | Apr 2026 | 29 | Next.js + React 19 + TailwindCSS 4 + Supabase | Threads + IG | AI reply assistant (Groq/Llama), crisis detection. MIT. |
| **OpenPost** | https://github.com/rodrgds/openpost | May 2026 (v1.0.3) | 1 | Go + Svelte | 5 | X, Mastodon, Bluesky, Threads, LinkedIn. Encrypted tokens (AES-256-GCM), SQLite scheduling. MIT. |
| **Upload-Post SDK** | https://github.com/Upload-Post/upload-post-npm | Feb 2026 (v2.0.3) | 6 | JS/TS | 10 | Commercial SDK but open-source code. 958 weekly npm downloads. Unified multi-platform posting interface. MIT. |
| **all-social-media-api** | https://github.com/akash80/all-social-media-api | 2026 | - | TS | FB, IG, LinkedIn, Threads | Zero deps (native fetch), cross-post, batch reply. npm: `all-social-media-api`. MIT. **Most directly relevant.** |

### 11.15 Recommended Library Selection for SocialBeam

| Platform | Library to Use | Rationale |
|----------|---------------|-----------|
| **Instagram** | `talha-ansarii/Instagram-graph-api-sdk` or build from Meta docs | Clean TS SDK, full coverage, actively maintained |
| **Facebook** | `facebook/facebook-nodejs-business-sdk` | Official SDK, 257K weekly downloads |
| **Threads** | Build from Meta docs (same infrastructure as Instagram) | Shares Meta OAuth, same posting pattern |
| **X/Twitter** | `plhery/node-twitter-api-v2` | Best community library, 1.6K stars, 272K downloads |
| **LinkedIn** | `linkedin-developers/linkedin-api-js-client` + custom UGC layer | Official Rest.li handling, build UGC helpers |
| **TikTok** | Build from official API docs + reference `@redonvn/tiktok-sdk` | No dominant TS library; official docs are primary source |
| **YouTube** | `googleapis` or `@googleapis/youtube` | Official Google client, `publishAt` scheduling |
| **Pinterest** | Direct REST calls (reference `pinterest/api-quickstart`) | Simple REST API, no SDK needed |
| **Google Business** | `googleapis` (mybusiness sub-package) | Same package as YouTube |
| **Reddit** | `bag-man/tsraw` | Active TS wrapper, snoowrap is archived |
| **Bluesky** | `@atproto/api` | Official, best-in-class, 115K downloads |
| **Telegram** | `telegraf/telegraf` | Most popular, 472K downloads, server-side scheduling needed |
| **Mastodon** | `masto` (neet/masto.js) | 238 releases, 100% tested, lightweight |

---

*Document Version: 1.1*
*Last Updated: 2026-05-14*
*Research Data Current As Of: May 2026*
*Author: SocialBeam Team*
