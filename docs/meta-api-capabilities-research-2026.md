# Meta Platform API Capabilities Research (May 2026)

Comprehensive analysis of Meta's platform APIs for building a social media management tool.

---

## Table of Contents

1. [Instagram Graph API](#1-instagram-graph-api)
2. [Facebook Graph API](#2-facebook-graph-api)
3. [Threads API](#3-threads-api)
4. [WhatsApp Business API](#4-whatsapp-business-api)
5. [Cross-Platform Comparison Summary](#5-cross-platform-comparison-summary)
6. [Known Pain Points & Restrictions](#6-known-pain-points--restrictions)

---

## 1. Instagram Graph API

### Authentication

**Method:** OAuth 2.0 with two login options:

- **Instagram Login for Business** (recommended, new as of 2025): Users log in with their Instagram credentials
  - Authorization URL: `https://www.instagram.com/oauth/authorize`
  - Token exchange: `https://api.instagram.com/oauth/access_token`
  - Long-lived token: `https://graph.instagram.com/access_token` (60 days)
  - Token refresh: `https://graph.instagram.com/refresh_access_token`

- **Facebook Login for Instagram** (legacy): Users log in with Facebook, granting access to their connected Instagram Business account
  - Uses `graph.facebook.com` host URL

**Key Permissions (Scopes):**

| Scope (Instagram Login) | Scope (Facebook Login) | Purpose |
|---|---|---|
| `instagram_business_basic` | `instagram_basic` | Read account info, media, insights |
| `instagram_business_content_publish` | `instagram_content_publish` | Publish posts, stories, reels |
| `instagram_business_manage_comments` | `instagram_manage_comments` | Read, reply, hide, delete comments |
| `instagram_business_manage_messages` | — | Read/manage direct messages |
| `instagram_business_manage_insights` | `instagram_manage_insights` | Access analytics |
| `pages_read_engagement` | `pages_read_engagement` | Required for Facebook Login flow |

**Token Lifecycle:**
- Authorization code: 1 hour, single-use
- Short-lived token: 1 hour
- Long-lived token: 60 days, refreshable if at least 24 hours old and not expired
- Permission grants from public profiles: valid for 90 days, extendable via token refresh

**Access Levels:**
- **Standard Access**: Auto-approved, usable only by users with roles on the app (devs, testers)
- **Advanced Access**: Requires App Review + Business Verification (mandatory since Feb 1, 2023), usable by any user

**App Review Requirements:**
- Required when using Advanced Access (serving multiple businesses / Tech Provider model)
- Apps serving only a single owned business do NOT require App Review
- Submission needs: 1+ successful API call within 30 days, screen recordings (1080p+), publicly accessible app
- Review timeline: typically 2-3 days, up to 1 week

### Content Publishing

#### Supported Content Types

| Content Type | Supported | Details |
|---|---|---|
| Single Image | Yes | JPG/PNG, `alt_text` supported (added March 2025) |
| Single Video | Yes | MP4/MOV, up to 60 min for feed posts |
| Carousel | Yes | Up to 10 items (images + videos), video uses resumable upload |
| Reels | Yes | 9:16 aspect ratio, 3-90 sec, 24-60 fps, original audio tagging only |
| Stories | Yes | Image or video (not both simultaneously), expires after 24h |
| Stories with stickers | No | Link, poll, location stickers NOT supported |
| Stories with user tags | Yes | Added July 2025 via `user_tags` field |
| Music tagging | Limited | Only for original audio, not licensed music |

#### Publishing Workflow

Two-step process:
1. **Create media container**: `POST /{ig-user-id}/media` — uploads media, returns container ID
2. **Publish container**: `POST /{ig-user-id}/media_publish` — publishes the container

Containers expire after 24 hours if not published.

**Account prerequisites:**
- Must be a Professional (Business or Creator) account
- Must be connected to a Facebook Page (for Facebook Login flow)

#### Scheduling

**Native API scheduling: NOT SUPPORTED.** The Instagram Graph API does not have a `scheduled_publish_time` parameter. Attempts to use Facebook's scheduling parameter return "User must be on whitelist" errors, suggesting it's either partner-only or unavailable.

**Workarounds:**
- Build your own queue/cron system that calls the publish API at the desired time
- Use Meta Business Suite (free, desktop-based, supports scheduling up to 75 days)
- Instagram's in-app scheduler (Business/Creator accounts, up to 75 days)

#### Edit / Delete Published Posts

| Action | Supported | Details |
|---|---|---|
| Edit caption | **No** | No API endpoint to update captions after publishing |
| Edit media | **No** | Cannot replace media after publishing |
| Edit alt text | **Yes** (on publish only) | Set during creation, not editable after |
| Delete post | **Yes** | Added December 2025 via DELETE endpoint |
| Delete story | **Yes** | Before natural 24h expiration |
| Delete reel | **Yes** | Added December 2025 |
| Enable/disable comments | **Yes** | `POST /{IG_MEDIA_ID}` to toggle |
| Tag users on published images | **Yes** | Can add user tags after publishing |

### Comments & Messaging

| Capability | Supported | Endpoint |
|---|---|---|
| Read comments on media | Yes | `GET /{IG_MEDIA_ID}/comments` |
| Read replies to comments | Yes | `GET /{IG_COMMENT_ID}/replies` |
| Reply to comments | Yes | `POST /{IG_COMMENT_ID}/replies` |
| Hide/unhide comments | Yes | `POST /{IG_COMMENT_ID}` with hide parameter |
| Delete comments | Yes | `DELETE /{IG_COMMENT_ID}` |
| Disable comments on media | Yes | `POST /{IG_MEDIA_ID}` |
| Read DMs | Yes | Requires `instagram_business_manage_messages` |

**Best practice:** Use webhooks for comment retrieval to avoid rate limiting.

### Insights / Analytics

**Account-Level Metrics:**
- Reach, impressions (deprecated; replaced by `views` as of April 2025)
- Follower count, follower growth
- Profile views
- Audience demographics (age, gender, location — top 45 segments only)
- Online followers (last 30 days only)

**Media-Level Metrics:**
- Comments, likes, shares, saves
- Views (replaces deprecated `plays` and `impressions`)
- Video views
- Total interactions

**Required Permissions:** `instagram_business_manage_insights` or `instagram_manage_insights`

**Limitations:**
- Data delayed up to 48 hours
- Insights stored for max 2 years
- Follower count unavailable for accounts with <100 followers
- Demographic data: top 45 audience segments only
- Several metrics deprecated as of v22.0 (April 21, 2025): `plays`, `impressions`, `clips_replays_count`

### Rate Limits

| Limit | Value | Details |
|---|---|---|
| Content publishing | **50 posts per 24h** | Rolling window per IG account; includes posts + stories + reels; carousels count as 1 |
| Media container creation | **400 containers per 24h** | Rolling window; containers expire after 24h |
| API call rate | **200 calls per user per hour** | Platform-level rate limit (standard Graph API) |

**Check usage:** `GET /{ig-user-id}/content_publishing_limit` returns `quota_usage`, `quota_total` (50), `quota_duration` (86400s).

### API Cost

- **Free** — No per-call charges for the Instagram Graph API
- Requires a Meta developer account and (for Advanced Access) Business Verification

---

## 2. Facebook Graph API

### Authentication

**Method:** OAuth 2.0 via Facebook Login

- Authorization URL: `https://www.facebook.com/v25.0/dialog/oauth`
- Token exchange via server-side call
- Page Access Tokens obtained by exchanging User Access Token with `/me/accounts`

**Key Permissions:**

| Permission | Purpose |
|---|---|
| `pages_manage_posts` | Create, edit, schedule, delete Page posts |
| `pages_read_engagement` | Read Page content, posts, engagement |
| `pages_manage_metadata` | Manage Page settings |
| `pages_messaging` | Send/receive Page messages |
| `pages_show_list` | List Pages user manages |
| `pages_read_user_content` | Read user-generated content on Pages |
| `instagram_basic` | Access connected Instagram account basics |

**Access Token Types:**
- **User Access Token**: Subject to Platform Rate Limits (200 calls/user/hour)
- **Page Access Token**: Subject to Business Use Case (BUC) Rate Limits (higher quotas)
- **System User Access Token**: Subject to BUC Rate Limits (recommended for server-side apps)

**Token Lifecycle:**
- Short-lived: ~1-2 hours
- Long-lived: ~60 days, refreshable

**App Review Requirements:**
- Advanced Access requires App Review + Business Verification
- Review timeline: 2-3 days typically, up to 1 week

### Content Publishing

#### Supported Content Types

| Content Type | Supported | Details |
|---|---|---|
| Text post | Yes | Simple text to Page feed |
| Photo | Yes | Image upload via URL or multipart |
| Video | Yes | Resumable upload support, up to various lengths |
| Link post | Yes | With preview |
| Carousel | Yes | Via photo albums or multi-photo posts |
| Reels | Yes | `POST /{page_id}/video_reels`, 9:16, 3-90 sec, 1080x1920 min |
| Stories | Yes | Photo (up to 10MB) or video (up to 60 sec, 90 sec max for API) |
| Scheduled post | **Yes** (native!) | `scheduled_publish_time` parameter, 10 min to 30 days in advance |

#### Publishing Workflow

**Immediate publish:**
```
POST /{page_id}/feed
  - message: "Post text"
  - published: true
```

**Native scheduling:**
```
POST /{page_id}/feed
  - message: "Post text"
  - published: false
  - scheduled_publish_time: <UNIX timestamp or ISO 8601>
```

**View scheduled posts:**
```
GET /{page_id}/scheduled_posts
```

#### Edit / Delete Published Posts

| Action | Supported | Details |
|---|---|---|
| Edit post | Yes | `POST /{post_id}` with updated fields |
| Delete post | Yes | `DELETE /{post_id}` |
| Edit scheduled post | Yes | Before publish time |
| Delete scheduled post | Yes | Before publish time |

### Group Posting

**CRITICAL: Facebook Groups API was DEPRECATED as of April 2024.**

- The `publish_to_groups` permission has been **removed**
- Third-party tools **cannot** post to Facebook groups programmatically
- Group posting endpoints are no longer available
- Rationale: spam prevention and community protection
- Only manual posting via Facebook app/website works
- Facebook's native scheduling only works for groups you admin

### Page Inbox / Messaging (Messenger Platform)

| Capability | Supported | Details |
|---|---|---|
| List conversations | Yes | `GET /{page-id}/conversations` |
| Read individual messages | **No** | Page Messages endpoint does not support GET |
| Send text messages | Yes | `POST /{page-id}/messages` |
| Send media attachments | Yes | IMAGE, VIDEO, AUDIO, FILE, LOCATION, TEMPLATE, REEL, IG_REEL, POST, IG_POST, STICKER |
| Quick replies | Yes | |
| Message templates | Yes | |
| Sender actions | Yes | MARK_SEEN, TYPING_ON, TYPING_OFF, REACT, UNREACT |
| Messaging types | Yes | RESPONSE, UPDATE, MESSAGE_TAG, UTILITY |

**Required Permissions:** `pages_manage_metadata`, `pages_read_engagement`, `pages_messaging`

**Note:** The Messenger Platform (separate from Graph API Pages messaging) provides richer messaging features including webhooks, persistent menus, and chatbot capabilities.

### Insights / Analytics

**Page Insights Endpoint:** `GET /{page-id}/insights`

**Available Metrics:**
- Page views, page fans, page followers
- Post reach, impressions, engagement
- Video views
- Audience demographics

**Limitations:**
- Only available for Pages with 100+ likes
- Most metrics update every 24 hours
- Only last 2 years of data available
- Max 90 days viewable at once with `since`/`until` parameters
- Demographic metrics only returned for 100+ people
- **Reels interactions are NOT included** in Page Insights
- Several Page Insights metrics deprecated by June 15, 2026

### Rate Limits

**Two Rate Limit Frameworks:**

| Token Type | Rate Limit Framework |
|---|---|
| Application/User Access Token | **Platform Rate Limits**: 200 calls per active user per rolling 1-hour window |
| System User/Page Access Token | **Business Use Case (BUC) Rate Limits**: Higher, app-specific quotas |

**Specific Known Limits:**

| Endpoint | Limit | Details |
|---|---|---|
| Reels publishing | **30 posts per 24h** | `POST /{page_id}/video_reels` |
| Platform general | **200 calls/user/hour** | Rolling window |

BUC rate limits are calculated per app based on usage patterns and are not publicly documented with fixed numbers. Apps with higher usage get higher BUC allocations. Use the `x-business-use-case-usage` response header to monitor usage.

### API Cost

- **Free** — No per-call charges
- Requires Meta developer account + Business Verification for production use

---

## 3. Threads API

### Authentication

**Method:** OAuth 2.0 via Threads Login

- Authorization URL: `https://threads.net/oauth/authorize`
- Token exchange on server
- Uses Instagram account as the identity provider

**Key Permissions:**

| Permission | Purpose |
|---|---|
| `threads_basic` | Required for ALL endpoints (read profile, media) |
| `threads_content_publish` | Publish posts, carousels, quotes |
| `threads_manage_replies` | Create replies (POST) |
| `threads_read_replies` | Read replies (GET) |
| `threads_manage_insights` | Access analytics |

**Token Lifecycle:**
- Short-lived: 1 hour
- Long-lived: 60 days, refreshable if at least 24 hours old and not expired
- Permission grants from public profiles: 90 days validity, extendable via token refresh

**App Review Requirements:**
- Same as Instagram: Standard Access for own accounts, Advanced Access (with App Review + Business Verification) for multi-business use

### Content Publishing

#### Supported Content Types

| Content Type | Supported | Details |
|---|---|---|
| Text post | Yes | Up to 500 characters |
| Image | Yes | With optional `alt_text` (max 1,000 chars) |
| Video | Yes | |
| Carousel | Yes | Multiple images/videos; counts as ONE post against rate limit |
| Quote post | Yes | Via `quote_post_id` parameter |
| Reply | Yes | Via `reply_to_id` parameter |
| Poll | Yes | Via poll attachment parameter |
| GIF | Yes | Via GIF attachment |
| Link attachment | Yes | |
| Topic tags | Yes | |
| Spoiler indicator | Yes | |
| Auto-publish (text) | Yes | Single-step publish for text-only posts |

#### Publishing Workflow

**Two-step (media posts):**
1. Create media container: `POST /{threads-user-id}/threads`
2. Publish container: `POST /{threads-user-id}/threads_publish`

**One-step (text-only):**
```
POST /{threads-user-id}/threads_publish
  - text: "Post content"
  - auto-publish: true
```

#### Scheduling

**Native API scheduling: NOT SUPPORTED.** No `scheduled_publish_time` parameter exists for Threads API. Build your own queue system to call publish at desired times.

#### Edit / Delete Published Posts

| Action | Supported | Details |
|---|---|---|
| Edit post | **No** | No edit endpoint |
| Delete post | Yes | `DELETE /{threads-media-id}` |
| Delete reply | Yes | |

### Comments & Replies

| Capability | Supported | Endpoint |
|---|---|---|
| Read replies | Yes | `GET /{threads-media-id}/replies` |
| Create replies | Yes | `POST /{threads-user-id}/threads` with `reply_to_id` |
| Reply control settings | Yes | everyone, accounts_you_follow, mentioned_only, parent_post_author_only, followers_only |

### Insights / Analytics

**Media-Level Metrics:**
- Views, likes, replies, reposts, quotes, shares

**User-Level Metrics:**
- Profile-level aggregates

**Required Permissions:** `threads_basic` + `threads_manage_insights`

**Limitations:**
- Media insights do NOT capture nested replies metrics
- User insights default to 2-day range (yesterday through today)
- Earliest queryable data: April 13, 2024 (Unix timestamp 1712991600)

### Rate Limits

Threads uses an impression-based rate limit system:

| Metric | Limit | Details |
|---|---|---|
| API calls | **4,800 calls per impression per 24h** | Minimum 10 impressions baseline |
| CPU time | **720,000** (total_cputime) | Per impression per day |
| Total time | **2,880,000** (total_time) | Per impression per day |

**Specific Action Limits:**

| Action | Limit | Window |
|---|---|---|
| Posts published | **250** | Per 24h rolling window |
| Replies created | **1,000** | Per 24h rolling window |
| Deletions | **100** | Per 24h rolling window |

Carousels count as ONE post against the 250 limit.

### API Cost

- **Free** — No per-call charges
- Requires Meta developer account + Instagram account linkage

---

## 4. WhatsApp Business API (Cloud API)

### Authentication & Setup

**Method:** Cloud API uses system-to-system authentication via:
- Permanent System Access Tokens (generated in Meta Business Portfolio)
- Short-lived User Access Tokens (OAuth, for testing)

**Setup Requirements:**
1. Meta Developer Account
2. Meta Business Portfolio (separate from personal Facebook)
3. WhatsApp Business App created in developer dashboard
4. Phone number registration (cannot be actively registered on WhatsApp/WhatsApp Business app)
5. Webhook configuration for incoming messages and delivery status
6. Message template approval before sending production messages

**Business Verification:** Required for production access; can take days.

**Phone Number:**
- Becomes your WhatsApp sender identity
- Can use Meta's free virtual phone numbers during testing
- Solution providers can register multiple numbers via API
- As of October 7, 2025: messaging limits are shared across entire Business Portfolio (not per phone number)

### Messaging Capabilities

#### Message Types

| Type | Supported | Details |
|---|---|---|
| Text messages | Yes | Plain text |
| Media messages | Yes | Image, video, audio, document, sticker |
| Interactive messages | Yes | Buttons, list messages, reply buttons |
| Location messages | Yes | |
| Contact messages | Yes | vCard format |
| Template messages | Yes | Pre-approved templates |
| Catalog/product messages | Yes | Product carousels |
| Call-to-action messages | Yes | Call buttons, deep links |
| Multi-product messages | Yes | |

#### Message Categories (for pricing)

| Category | Description | Pricing |
|---|---|---|
| **Marketing** | Promotions, offers, campaigns | Highest rate (~$0.013-$0.18+ per message) |
| **Utility** | Order confirmations, shipping, receipts | Free within 24h service window; charged outside |
| **Authentication** | OTPs, 2FA codes | Always charged (lowest rate) |
| **Service** | Customer replies | **Always FREE** (no monthly cap) |

#### Messaging Windows

- **Customer Service Window**: 24-hour window opened when a customer initiates contact
  - Utility templates sent within this window: FREE
  - Service replies: always FREE
- **Ad Click Window**: 72-hour window when customer clicks WhatsApp ad or FB Page CTA
  - All messages during this window: FREE

### Templates

**Template Categories:**
- Custom marketing templates
- Utility templates
- Authentication templates
- Interactive/calling templates
- Coupon code templates
- Limited-time-offer templates
- Location templates
- Media card carousel templates

**Template Approval:**
- All outbound templates must be submitted to Meta for review
- Review typically takes minutes to hours
- Templates must comply with WhatsApp Commerce Policy
- Meta enforces strict rules against misclassifying promotional content as utility

### Broadcasting

**Supported:** Yes, but with constraints:
- Must use pre-approved templates
- Must respect daily messaging tier limits
- Can segment recipients by phone number lists
- Webhooks required for delivery status tracking

### Edit / Delete Messages

| Action | Supported | Details |
|---|---|---|
| Edit sent message | **No** | Messages are immutable after delivery |
| Delete sent message | **No** | Cannot recall delivered messages |
| Delete for everyone (within 24h) | Limited | Via app, not via API |

### Rate Limits

**Daily Messaging Tiers (unique customers per 24h rolling window):**

| Tier | Limit | Qualification |
|---|---|---|
| Tier 1 (default) | **1,000** | New businesses start at 250, verify to reach 1,000 |
| Tier 2 | **10,000** | Send 2,000+ delivered messages in 30 days |
| Tier 3 | **100,000** | Continued high volume, maintain quality |
| Tier 4 | **Unlimited** | Highest tier, Yellow or Green quality score required |

**Throughput (messages per second):**

| Level | Throughput |
|---|---|
| Standard | **80 mps** (default) |
| High | **Up to 1,000 mps** (requires unlimited tier, 100K+ unique/day, Yellow/Green quality) |

**Quality Rating:**
- Based on user blocks and reports
- Green/Yellow: Full capabilities
- Red: Messaging capabilities may be restricted

**Important:** Rate limits only apply to business-initiated messages. Customer replies within the 24-hour window do NOT count against limits.

### App Review Requirements

- **Business Verification** required (different from standard App Review)
- Phone number must be verified
- Message templates must be individually approved
- No traditional "App Review" like Instagram/Facebook — instead uses Business Portfolio verification
- Solution Partners have additional onboarding requirements

### API Cost

**Pricing Model: Per-message billing (effective July 1, 2025)**

Previously conversation-based (flat fee per 24h window), now charged per individual template message delivered.

**Example Rates by Country (per message):**

| Country | Marketing | Utility | Authentication |
|---|---|---|---|
| India | ~$0.002 | ~$0.002 | ~$0.002 |
| Turkey | ~$0.013 | varies | varies |
| US | ~$0.03-0.05 | ~$0.01-0.02 | ~$0.02-0.03 |
| Netherlands | ~$0.18+ | varies | varies |
| Brazil | ~$0.02-0.04 | ~$0.01 | ~$0.01-0.02 |

**Key Cost Notes:**
- Service (customer replies): **Always FREE**
- Utility within 24h window: **FREE**
- Ad click messages (72h): **FREE**
- Volume discounts available for utility and authentication at scale
- Rates may be updated quarterly
- Free tier: 1,000 service conversations/month (deprecated concept with per-message pricing; now: unlimited free service replies)

---

## 5. Cross-Platform Comparison Summary

### Capability Matrix

| Capability | Instagram | Facebook Pages | Threads | WhatsApp Business |
|---|---|---|---|---|
| **Text posts** | No (media only) | Yes | Yes (500 chars) | N/A (messaging) |
| **Image posts** | Yes | Yes | Yes | Yes (as media msg) |
| **Video posts** | Yes | Yes | Yes | Yes (as media msg) |
| **Carousel** | Yes (10 items) | Yes | Yes | Yes (product msg) |
| **Stories** | Yes | Yes (Pages only) | No | No |
| **Reels** | Yes | Yes | No | No |
| **Native scheduling** | **No** | **Yes** | **No** | N/A |
| **Edit published** | **No** | Yes | **No** | **No** |
| **Delete published** | Yes (Dec 2025) | Yes | Yes | **No** |
| **Read comments** | Yes | Yes | Yes | N/A |
| **Reply to comments** | Yes | Yes | Yes | N/A |
| **Read DMs** | Yes | Limited | N/A | Yes |
| **Send DMs** | Limited | Yes (Pages) | N/A | Yes (templates) |
| **Analytics** | Yes | Yes | Yes | Yes (delivery) |
| **Group posting** | N/A | **No** (deprecated) | N/A | Group messages Yes |
| **API cost** | Free | Free | Free | Per-message paid |

### Rate Limits Comparison

| Platform | Post Limit | API Call Limit |
|---|---|---|
| Instagram | 50 posts/24h | 200 calls/user/hour |
| Facebook (Pages) | 30 reels/24h | 200 calls/user/hour (Platform) or BUC |
| Threads | 250 posts/24h, 1K replies/24h | 4,800 calls/impression/24h |
| WhatsApp | 1K-100K+ unique customers/24h | 80-1000 mps throughput |

### Authentication Comparison

| Platform | OAuth Provider | Token Lifespan | App Review |
|---|---|---|---|
| Instagram | Instagram Login / Facebook Login | 60 days (refreshable) | Required for Advanced Access |
| Facebook | Facebook Login | 60 days (refreshable) | Required for Advanced Access |
| Threads | Instagram account (via Threads.net) | 60 days (refreshable) | Required for Advanced Access |
| WhatsApp | System Access Token (Meta Business) | Permanent / long-lived | Business Verification required |

---

## 6. Known Pain Points & Restrictions

### Instagram

1. **No native scheduling** — Must build your own queue/cron system
2. **Cannot edit published posts** — Once published, caption/media are immutable
3. **Stories limitations** — No stickers (link, poll, location), can't combine video + story formats
4. **400 container limit** — High-volume tools may hit this before the 50-post limit
5. **48-hour insights delay** — Analytics are not real-time
6. **Deprecation churn** — Metrics regularly deprecated (April 2025 wave)
7. **Account requirement** — Must be Business/Creator account; personal accounts not supported
8. **Reels restrictions** — No music tagging for licensed tracks, can't appear in carousels
9. **Container expiration** — 24-hour window to publish after container creation

### Facebook

1. **Groups API fully deprecated** — Cannot post to groups programmatically at all
2. **Page Insights limited** — Requires 100+ likes, excludes Reels interactions, deprecated metrics
3. **BUC rate limits opaque** — Not publicly documented with fixed numbers, quota depends on usage patterns
4. **Reels limit low** — Only 30 API-published reels per 24 hours
5. **Page messaging read limitation** — Cannot read individual messages via Page Messages endpoint
6. **Scheduling window** — Max 30 days in advance (not unlimited)
7. **Access token complexity** — Multiple token types (user, page, system user) with different rate limit implications

### Threads

1. **New API, evolving** — Launched mid-2024, still maturing; earliest data from April 2024
2. **No editing** — Cannot edit published posts
3. **No native scheduling** — Must build own queue
4. **Limited nested reply insights** — Media insights don't capture nested reply metrics
5. **Impression-based rate limits** — Complex calculation that varies by user's impression count
6. **Instagram account required** — Identity tied to Instagram, separate auth flow
7. **500 character limit** — Shorter than some competitors

### WhatsApp Business

1. **Per-message pricing** — Can become expensive at scale (especially marketing messages)
2. **Template approval required** — Every outbound message template needs Meta approval
3. **Strict content policies** — Misclassifying marketing as utility can result in penalties
4. **No editing/deleting messages** — Immutable after delivery
5. **Quality score dependency** — User blocks/reports can reduce your messaging tier
6. **Business Verification required** — Production access requires verified business entity
7. **Phone number constraint** — Number cannot be active on WhatsApp/WhatsApp Business app
8. **24-hour window rules** — Complex rules around when you can/can't message users
9. **Rates change quarterly** — Pricing can be updated frequently

### General Meta Platform

1. **Business Verification mandatory** — As of Feb 2023, Advanced Access requires it
2. **90-day permission expiry** — Public profile permissions expire after 90 days without token refresh
3. **Review timeline variability** — 2-3 days typical but can take 1+ week during peak periods
4. **Version deprecation** — API versions have limited lifespans; must keep updating
5. **Single point of failure** — All platforms go through Meta's infrastructure; outages affect all

---

## Recommendations for Social Media Management Tool

### What's Feasible

- **Multi-platform posting** to Instagram, Facebook Pages, and Threads (build scheduling queue)
- **Unified analytics dashboard** pulling from all three APIs
- **Comment management** (read, reply, moderate) across platforms
- **Content calendar** with own scheduling system for Instagram and Threads
- **Cross-posting** between Instagram and Facebook Pages

### What's NOT Feasible

- **Facebook Group posting** via API (fully deprecated)
- **Editing published Instagram/Threads posts** (no API support)
- **Native scheduling for Instagram/Threads** (no API parameter)
- **Free WhatsApp broadcasting** (per-message costs add up)
- **Real-time analytics** (24-48 hour delays on insights)

### Architecture Implications

- **Scheduler**: Must implement your own cron/queue system for Instagram and Threads scheduling
- **Token management**: 60-day token refresh cycle across Instagram/Facebook/Threads
- **Rate limit tracking**: Different frameworks per platform (fixed vs impression-based vs BUC)
- **Webhook integration**: Critical for comment/message real-time handling
- **Content storage**: Store media URLs before container creation (containers expire in 24h)
- **Cost management**: WhatsApp messages require budget tracking and optimization
