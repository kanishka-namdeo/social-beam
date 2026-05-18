# Meta Platform APIs Research — May 2026

> Comprehensive API capabilities, limitations, and pricing for building a social media management tool across Instagram, Facebook, Threads, and WhatsApp Business.

---

## Table of Contents

1. [Instagram Graph API](#1-instagram-graph-api)
2. [Facebook Graph API](#2-facebook-graph-api)
3. [Threads API](#3-threads-api)
4. [WhatsApp Business API](#4-whatsapp-business-api)
5. [Cross-Platform Summary](#5-cross-platform-summary)

---

## 1. Instagram Graph API

### Authentication

| Aspect | Detail |
|---|---|
| **Methods** | Instagram Business Login (direct OAuth) OR Facebook Login for Business |
| **Token lifespan** | Short-lived (1 hour) → Long-lived (60 days), auto-refreshable |
| **Account types** | Business and Creator accounts ONLY (personal accounts excluded) |
| **FB Page required?** | No for Instagram Login; Yes for Facebook Login |
| **App review** | Required for apps serving multiple businesses; single-business apps can skip |
| **Key permissions (FB Login)** | `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`, `pages_read_engagement` |
| **Key permissions (IG Login)** | `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_comments`, `instagram_business_manage_insights`, `instagram_business_manage_messages` |
| **Token refresh** | `GET /refresh_access_token` resets 60-day window; automate every 30-45 days |

### Content Publishing

| Content Type | Supported | Notes |
|---|---|---|
| Image post | Yes | Supports `alt_text` (added March 2025) |
| Video post | Yes | Requires container processing time before publish |
| Carousel (images + videos mixed) | Yes | Create individual containers, then parent container |
| Reels | Yes | Use `media_type=REELS`; supports `share_to_feed=true` |
| Stories | Yes | Supports `user_tags` for mentions with x,y coords (July 2025) |
| Text-only post | No | Instagram is media-first |

**Publishing workflow (all content types):**
1. Create container: `POST /{ig-user-id}/media`
2. Poll status: `GET /{container-id}?fields=status_code` — wait for `FINISHED`
3. Publish: `POST /{ig-user-id}/media_publish`

### Scheduling

| Capability | Supported |
|---|---|
| **Native API scheduling** | No — the API does NOT support native scheduled publishing |
| **Workaround** | Build your own queue: create containers, store them, and call `media_publish` at the desired time |
| **Container expiry** | 24 hours — containers expire if not published |

### Post Management

| Capability | Supported | Endpoint |
|---|---|---|
| Delete published post | Yes | `DELETE /{ig-media-id}` |
| Edit published post | No — **cannot edit** caption, media, or metadata after publishing |
| Read media metadata | Yes | `GET /{ig-media-id}` |

### Comments & Messaging

| Capability | Detail |
|---|---|
| Read comments | `GET /{ig-media-id}/comments` — supports nested replies via field expansion |
| Reply to comments | `POST /{ig-media-id}/comments` or `POST /{ig-comment-id}/replies` |
| Delete comments | `DELETE /{ig-comment-id}` |
| Hide/unhide comments | `POST /{ig-comment-id}?hide=true/false` |
| Disable/enable comments on media | Yes |
| DMs (messaging) | Via Messenger Platform — **24-hour window only** (must be user-initiated); up to 200 automated DMs/hour/account |

### Insights & Analytics

| Metric Type | Available | Notes |
|---|---|---|
| Media-level | Impressions, reach, likes, comments, shares, saved, video views | Up to 48-hour delay; data stored up to 2 years |
| Account-level | Impressions, reach, profile_views, follower_count | Period granularity: day/week/month |
| Story-level | Impressions, reach, exits, replies | Available while story is live + 24h after |
| Aggregated metrics (Apr 2026) | `total_likes`, `total_comments`, `total_views` across all surfaces including boosted content | |
| **Cost** | Insights are high-cost API operations — use field expansion to combine with media fetches |

### Rate Limits

| Type | Limit | Window |
|---|---|---|
| **BUC (main)** | 200 API calls per Instagram Business account | Rolling 1 hour |
| **App-level (Platform)** | 200 × Number of Users (DAU) | Rolling 1 hour |
| **DM limit** | 200 automated DMs per hour per account | Rolling 1 hour |
| **Media containers** | 400 containers per 24 hours | Rolling 24 hours |
| **Published posts** | 50 posts per account per 24 hours | Rolling 24 hours |
| **Conversations API** | 2 calls/second per account | — |
| **Send API (text)** | 100 calls/second per account | — |
| **Send API (audio/video)** | 10 calls/second per account | — |
| **Private replies to posts/reels** | 750 calls/hour per account | — |
| **Private replies to Live** | 100 calls/second per account | — |

**Monitoring:** Response header `X-Business-Use-Case-Usage` shows `call_count` (percentage). At 80-90%, throttle. At 100%, HTTP 429.

### Known Pain Points

- **No native scheduling** — must build own publish queue; containers expire in 24h
- **Cannot edit posts** after publishing — must delete and repost
- **Personal accounts excluded** — users must convert to Business/Creator
- **Insights are expensive** — each insight call burns quota; batch via field expansion
- **Hashtag search limited** — only 30 unique hashtag ID queries per week per account
- **Rate limits are per-account** — multiple tools sharing one account share the 200/hr pool
- **Basic Display API is dead** (Dec 2024) — no fallback for personal accounts
- **Media must be publicly accessible** via HTTPS URL at publish time — no direct upload

### Cost

**Free.** No charges for API usage. App review is free.

---

## 2. Facebook Graph API

### Authentication

| Aspect | Detail |
|---|---|
| **Method** | Facebook Login → Page Access Token (or System User Token) |
| **Token types** | User token, Page token, System User token, App token |
| **App review** | Required for apps used by external users; single-business apps can skip |
| **Key permissions** | `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`, `publish_video`, `pages_messaging` |

### Content Publishing (Pages)

| Content Type | Supported | Notes |
|---|---|---|
| Text post | Yes | `POST /{page-id}/feed` with `message` field |
| Image post | Yes | Attach via `url` or multipart upload |
| Video post | Yes | Requires `publish_video` permission |
| Link post | Yes | `POST /{page-id}/links` |
| Reels | Yes | Via video upload with Reels formatting |
| Stories | Yes | Via Page story endpoint |
| Carousel | Limited | Via photo album or link attachments |
| Scheduled posts | **Yes** — native! | Set `published=false` + `scheduled_publish_time` (10 min to 30 days ahead) |

**Native scheduling endpoint:**
- `POST /{page-id}/scheduled_posts` — create, read, update, delete scheduled posts
- Posts can be scheduled 10 minutes to 30 days in advance
- `GET /{page-id}/scheduled_posts` — list all scheduled posts

### Post Management

| Capability | Supported | Endpoint |
|---|---|---|
| Delete published post | Yes | `DELETE /{post-id}` |
| Edit published post | **Limited** — can update message/text via `POST /{post-id}` | Not all fields editable |
| Read posts | Yes | `GET /{page-id}/posts` and `GET /{page-id}/published_posts` |

### Groups Posting

| Capability | Status |
|---|---|
| **API posting to groups** | **DEPRECATED** (April 2024) — completely removed |
| Third-party scheduling to groups | **NOT POSSIBLE** — no API exists |
| Manual posting only | Yes, via Facebook's native interface |
| **Impact** | Social media management tools (Buffer, Hootsuite, etc.) cannot post to groups |

### Comments & Messaging (Pages)

| Capability | Detail |
|---|---|
| Read page comments | `GET /{post-id}/comments` |
| Reply to comments | `POST /{post-id}/comments` |
| Delete/hide comments | Yes, with `pages_manage_engagement` |
| **Messenger Platform** | Full Send API support: text, images, videos, audio, files, locations, templates, quick replies, sender actions |
| 24-hour messaging window | Yes — can only message users who contacted you within 24h OR agreed to receive messages |
| Message tags | RESPONSE, UPDATE, MESSAGE_TAG, UTILITY (no promotional) |
| PSID-based | Page-Scoped User IDs are unique per User-Page pair |

### Insights & Analytics

| Metric Type | Available |
|---|---|
| Page insights | Followers, reach, engagement, video views, page views |
| Post insights | Reach, impressions, engagement, clicks, shares |
| Video insights | Views, retention, average watch time |
| Ad insights | Via Marketing API (separate permission tier) |

### Rate Limits

| Type | Limit | Window | Formula |
|---|---|---|---|
| **Platform (app token)** | 200 × Number of Users | Rolling 1 hour | Based on DAU |
| **Platform (user token)** | Per-user, undisclosed | Rolling 1 hour | Privacy-protected |
| **BUC (Page/System token)** | 4,800 × Number of Engaged Users | Rolling 24 hours | Based on page engagement |
| **Messenger Send API (text)** | 300 calls/second per Page | — | |
| **Messenger Send API (AV)** | 10 calls/second per Page | — | |
| **Conversations API** | 2 calls/second per Page | — | |
| **Private replies** | 750 calls/hour per Page | — | |

**Monitoring:** `X-App-Usage` header (Platform) or `X-Business-Use-Case-Usage` header (BUC). Error codes: 4 (app), 17 (user), 32 (page), 613 (custom).

### Known Pain Points

- **Groups API is DEAD** (April 2024) — zero programmatic access to groups
- **24-hour messaging window** — cannot proactively message users outside the window (except with message tags)
- **Page access tokens require admin role** — the authenticating user must have Page permissions
- **Edit limitations** — not all post fields are editable after publishing
- **Complex permission matrix** — different tokens trigger different rate limit tiers
- **Rate limits scale with engagement** — low-engagement pages get lower quotas

### Cost

**Free.** No charges for API usage.

---

## 3. Threads API

### Authentication

| Aspect | Detail |
|---|---|
| **Method** | Facebook Login → Threads User Access Token |
| **App review** | NOT required for webhooks; required only if accessing data you don't own/manage |
| **Testing** | Optional unless submitting for App Review |
| **Permissions** | Required and optional permissions configurable in App Dashboard |

### Content Publishing

| Content Type | Supported | Notes |
|---|---|---|
| Text post | Yes | Up to **10,000 characters** with formatting |
| Text formatting | Yes | Bold, italic, underline, strikethrough, highlighter |
| Image post | Yes | |
| Video post | Yes | |
| Carousel | Yes | Counts as ONE post against the limit |
| GIF support | Yes | Via GIPHY integration |
| Polls | Yes | (2025 addition) |
| Location tags | Yes | (2025 addition) |
| Spoiler tags | Yes | Hide content in text, images, videos, carousels |
| Ghost posts | Yes | Ephemeral text-only posts that auto-archive after 24h |
| Cross-share to IG Stories | Yes | Share Threads posts to IG Stories via linked accounts (2026) |

### Reply Management

| Capability | Detail |
|---|---|
| Post replies | Yes — up to 1,000 replies per 24h |
| Reply approvals | **New (2026)** — approve or ignore pending replies on your posts |
| Read replies | Yes |
| Delete replies | Yes |

### Post Management

| Capability | Supported | Limit |
|---|---|---|
| Delete post | Yes | 100 deletions per 24h |
| Edit post | No — **cannot edit** after publishing |
| Read own posts | Yes | |
| Read other users' posts | Yes (public) | |

### Insights & Analytics

| Capability | Detail |
|---|---|
| Post insights | Available (engagement metrics) |
| Account insights | Available |
| Publishing limit endpoint | `GET /{threads-user-id}/threads_publishing_limit` — check usage |

### Discovery & Embedding

| Capability | Detail |
|---|---|
| Search by media type | Yes |
| Search by username | Yes |
| Profile discovery threshold | Lowered from 1,000 to 100 followers |
| Tokenless oEmbed API | Yes — embed public Threads posts without API tokens or App Review |
| Web intents | Pre-configure topic tags, set reply controls, compose replies or quotes |

### Webhooks

| Event Type | Supported |
|---|---|
| Post published | Yes |
| Post deleted | Yes |
| Mentions | Yes |

### Rate Limits

| Type | Limit | Window |
|---|---|---|
| **Posts** | 250 API-published posts | Per 24 hours |
| **Replies** | 1,000 replies | Per 24 hours |
| **Deletions** | 100 deletions | Per 24 hours |
| **General API calls** | 4,800 × Number of Impressions | Per 24 hours |
| **Min impression baseline** | 10 (if actual < 10, defaults to 10) | — |
| **Total CPU time** | 720,000 × impressions | Per day |
| **Total time** | 2,880,000 × impressions | Per day |

### Known Pain Points

- **No post editing** — must delete and repost
- **Reply-centric limits** — 1,000 replies/day may be tight for active brands
- **Deletion cap** — 100/day limits bulk cleanup operations
- **Relatively young API** — fewer third-party integrations vs Instagram/Facebook
- **App still evolving** — Meta added many features in 2025-2026; more changes expected

### Cost

**Free.** No charges for API usage.

---

## 4. WhatsApp Business API (Cloud API)

### Authentication

| Aspect | Detail |
|---|---|
| **Method** | Cloud API via Meta's hosted infrastructure (no self-hosted BSIP needed) |
| **Setup** | WhatsApp Business Account (WABA) in Meta Business Manager |
| **Phone number** | Must register a business phone number |
| **Business verification** | Required for full messaging tiers; unverified = 250 conversations/24h |
| **App review** | Required for production use |

### Messaging

| Message Type | Supported | Notes |
|---|---|---|
| Text | Yes | |
| Image | Yes | |
| Video | Yes | |
| Audio | Yes | |
| Document | Yes | |
| Location | Yes | |
| Stickers | Yes | |
| Interactive (buttons, lists) | Yes | Quick replies, call-to-action |
| Template messages | Yes | **Required** for business-initiated messages outside 24h window |
| Reactions | Yes | React to messages |

### Templates

| Aspect | Detail |
|---|---|
| **Required for** | All business-initiated messages outside the 24-hour customer service window |
| **Categories** | Marketing, Utility, Authentication, Service (free) |
| **Structure** | Header (text/image/video/doc) + Body (with {{1}} variables) + Footer (optional) + up to 3 buttons |
| **Review time** | Minutes to 24 hours |
| **Button types** | URL, phone call, quick reply |
| **Language** | Must match user's language |

### 24-Hour Service Window

| Rule | Detail |
|---|---|
| Customer-initiated | When a user messages you, you have 24 hours to respond freely (Service messages — **FREE**) |
| After 24h | Must use a pre-approved Template message (paid) |
| Within window | Any message type, unlimited messages |

### Broadcasting

| Capability | Detail |
|---|---|
| Bulk sends | Yes, via Template messages to multiple users |
| Subject to | Tier limits (see below) and quality rating |
| Click-to-WhatsApp ads | Messages within 72h window from ad clicks are **free** |

### Rate Limits

| Type | Limit | Notes |
|---|---|---|
| **Throughput** | 80 messages/second default per phone number | Automatic upgrade to 1,000 mps eligible |
| **1,000 mps upgrade reqs** | Unlimited messaging tier + 100K+ unique users in 24h + quality ≥ YELLOW | Automatic, no cost |
| **Coexistence mode** | Fixed 20 mps | If using both WhatsApp Business app AND Cloud API |

### Messaging Tiers (Daily Unique Users)

| Tier | Limit | How to reach |
|---|---|---|
| **Unverified** | 250 unique users/24h | Default before business verification |
| **Tier 1** | 1,000 unique users/24h | Starting tier after verification |
| **Tier 2** | 10,000 unique users/24h | Send ≥50% of Tier 1 for 7 days + High/Medium quality |
| **Tier 3** | 100,000 unique users/24h | Send ≥50% of Tier 2 for 7 days + High/Medium quality |
| **Tier 4 (Unlimited)** | No daily cap | Sustained Tier 3 volume + High quality rating |

**Tier scaling (2025 update):** Evaluated every 6 hours (was 24h). Multi-phone-number accounts share a single account-wide limit (highest-tier number).

### Post-Message Management

| Capability | Supported |
|---|---|
| Delete sent messages | No — **cannot delete** messages after sending |
| Edit sent messages | No — **cannot edit** |
| Read message status | Yes — sent, delivered, read receipts via webhooks |
| Read conversation history | Yes |

### Webhooks

| Event Type | Supported |
|---|---|
| Message received | Yes |
| Message status updates | Yes (sent/delivered/read) |
| Template status | Yes |
| Account updates | Yes |

### Known Pain Points

- **No editing/deleting** sent messages
- **Template approval required** — can be rejected for policy violations; review takes up to 24h
- **24-hour window** — restrictive for proactive outreach without templates
- **Quality rating impact** — high block/spam rates downgrade your quality score, which can reduce tier
- **Coexistence limitation** — running both Business app and Cloud API caps at 20 mps
- **Cost per message** — can add up quickly for marketing campaigns
- **PSID model** — user IDs are phone-number based; no anonymous addressing

### Cost (Per-Message Pricing, effective July 2025)

| Category | Price Range (per message) | Notes |
|---|---|---|
| **Service** | **FREE** | Replies within 24h of customer-initiated message |
| **Utility** | $0.004 - $0.0456 | Order confirmations, shipping updates, etc. |
| **Authentication** | $0.004 - $0.0456 | OTPs, verification codes |
| **Marketing** | $0.025 - $0.1365 | Promotions, offers, newsletters |

**Pricing notes:**
- Rates vary by recipient's country code (not sender's location)
- Marketing is 80-90% more expensive than Utility/Auth
- Click-to-WhatsApp ad messages (72h window) are free
- Cloud API hosting is free (no per-message infrastructure cost from Meta)

---

## 5. Cross-Platform Summary

### Feature Matrix

| Feature | Instagram | Facebook Pages | Facebook Groups | Threads | WhatsApp Business |
|---|---|---|---|---|---|
| **Text-only post** | No | Yes | N/A (deprecated) | Yes (10K chars) | Yes |
| **Image post** | Yes | Yes | N/A | Yes | Yes (as media) |
| **Video post** | Yes | Yes | N/A | Yes | Yes |
| **Reels** | Yes | Yes | N/A | — | — |
| **Carousel** | Yes | Limited | N/A | Yes | — |
| **Stories** | Yes | Yes | N/A | Cross-share from Threads | Status (separate) |
| **Native scheduling** | **No** | **Yes** (10m-30d) | N/A | **No** | **No** |
| **Edit after publish** | **No** | Limited | N/A | **No** | **No** |
| **Delete after publish** | Yes | Yes | N/A | Yes (100/day) | **No** |
| **Read comments** | Yes | Yes | N/A | Yes | — |
| **Reply to comments** | Yes | Yes | N/A | Yes (1K/day) | — |
| **Read insights** | Yes | Yes | N/A | Yes | Delivery/read receipts |
| **Messaging (1:1)** | Yes (24h window) | Yes (24h window) | — | — | Yes (24h + templates) |
| **Rate limit (main)** | 200/hr/account | 4800×engaged users/24h | N/A | 250 posts/24h | 80 msg/sec |
| **Cost** | Free | Free | Free | Free | Per-message ($0-$0.1365) |
| **App review needed** | For multi-business | For multi-business | N/A | Only for external data | For production |

### Key Architectural Decisions for Social Media Management Tool

1. **Scheduling engine:** Only Facebook Pages has native scheduling. For Instagram, Threads, and WhatsApp, you must build your own job queue that fires API calls at the scheduled time.

2. **Content creation is irreversible:** Across Instagram, Threads, and WhatsApp, you cannot edit published content. Design a preview + approval flow before publishing.

3. **Rate limit strategy:** Implement per-account token buckets with the `X-Business-Use-Case-Usage` headers. Use exponential backoff on 429 errors.

4. **Multi-account architecture:** Rate limits are per-account, not per-app. A SaaS tool with 100 Instagram accounts effectively has 20,000 API calls/hr (200 × 100).

5. **Groups are a gap:** Facebook Groups API was deprecated in April 2024. No third-party tool can post to groups via API. This is a hard limitation to communicate to users.

6. **WhatsApp cost modeling:** Marketing messages cost up to $0.1365 each. A broadcast to 10,000 users could cost $1,365. Service messages are free but require customer initiation.

7. **Token management:** All platforms use OAuth tokens with expiry. Instagram/Threads tokens last 60 days and can be auto-refreshed. Build a token refresh scheduler.
