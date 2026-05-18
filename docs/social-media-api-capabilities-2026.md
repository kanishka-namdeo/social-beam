# Social Media API Capabilities Research — May 2026

Comprehensive analysis of X/Twitter, LinkedIn, and TikTok API capabilities for building a social media management tool.

---

## 1. X/Twitter API v2

### Authentication
- **OAuth 1.0a** (user context) and **OAuth 2.0** (Bearer Token for app-only, PKCE for user context)
- Both v1.1 and v2 share the same auth tokens — no re-authentication needed when migrating
- Each app must be linked to a **Project** in the Developer Portal
- No formal app review for Basic access — instant upon signup. Enterprise requires approved application

### Pricing (Early 2026 — Pay-Per-Use Model)

X eliminated the subscription tiers ($200 Basic, $5,000 Pro) in early 2026 and switched to credit-based pay-per-use. New users can only access this model.

| Resource | Unit Cost |
|---|---|
| Posts: Read | $0.005 per resource fetched |
| Posts: Create | $0.010 per request |
| Users: Read | $0.010 per resource fetched |
| Following/Followers: Read | $0.010 per resource fetched |
| DM Events: Read | $0.010 per resource fetched |
| DM Interaction: Create | $0.015 per request |
| User Interaction: Create (like, follow) | $0.015 per request |
| Analytics: Read | $0.005 per resource fetched |
| Lists/Spaces/Communities/Media: Read | $0.005 per resource fetched |
| Trends: Read | $0.010 per resource fetched |

**Key pricing details:**
- No monthly subscription — buy credits upfront
- 24-hour deduplication: fetching the same resource twice in one UTC day only charges once
- Hard cap of **2 million post reads per month** on standard accounts
- Auto-recharge, spending limits, and Usage API for monitoring
- xAI (Grok) credits bundled: 10-20% kickback based on spend tiers

**Legacy tiers (existing subscribers only):**

| Tier | Price | Posts/Month | Environments |
|---|---|---|---|
| Free (discontinued for new users) | $0 | 500 posts + 100 reads | 1 |
| Basic (legacy) | $200/mo ($175 annual) | 10K | 2 |
| Pro (legacy) | $5,000/mo ($4,500 annual) | 1M | 3 |
| Enterprise (legacy) | $42,000+/mo | 50M+ | 3+ |

### Content Publishing

| Capability | Status |
|---|---|
| **Text tweets** | YES — `POST /2/tweets` |
| **Media (images/video/GIF)** | YES — requires two-step: upload media first, then reference in tweet |
| **Threads** | YES — chain tweets using `reply` field with `in_reply_to_tweet_id` |
| **Polls** | YES — poll object supported in tweet creation |
| **Scheduling (native)** | **NO** — `POST /2/tweets` publishes immediately; no `scheduled_at` parameter. Must build own scheduling queue |
| **Editing tweets** | **YES** — tweets editable for **30 minutes**, up to **5 edits**. Use `edit_options` in `POST /2/tweets`. Creates new tweet ID per edit, with edit history chain |
| **Deleting tweets** | **YES** — `DELETE /2/tweets/:id` (50 per 15 min per user) |

**Cannot edit:** tweets with polls, retweets, non-self-thread replies, promoted/nullcast/community/superfollow/collaborative posts.

### Analytics
- **YES** — advanced metrics available: impressions, video views, clicks, URL clicks, profile clicks
- Organic and promoted context separated
- Request via `tweet.fields` with `public_metrics`, `organic_metrics`, `promoted_metrics`, `non_public_metrics`
- Analytics reads cost $0.005 per resource

### Comments & Replies
- **Read replies:** YES — use `GET /2/tweets/:id` with expansions to get replied-to tweets, or search by conversation ID
- **Write replies:** YES — post a tweet with `reply.in_reply_to_tweet_id` set
- **Read/write comments:** Same as replies (X treats replies as the comment system)
- **Like/unlike tweets:** YES — `POST/DELETE /2/users/:id/likes`
- **Retweet/unretweet:** YES — `POST/DELETE /2/users/:id/retweets`
- **Bookmarks:** YES — read/write bookmark management

### Rate Limits

| Endpoint | Per App | Per User | Window |
|---|---|---|---|
| POST tweet | 10,000 | 100 | 24h (app) / 15min (user) |
| DELETE tweet | -- | 50 | 15 min |
| GET tweets (batch lookup) | 3,500 | 5,000 | 15 min |
| GET tweets search recent | 450 | 300 | 15 min |
| GET tweets search all (archive) | 300 + 1/sec | 1/sec | 15 min |
| GET user timeline | 10,000 | 900 | 15 min |
| GET followers/following | 300 | 300 | 15 min |
| POST likes | -- | 50 + 1,000/24h | Dual |
| POST retweets | -- | 50 | 15 min |
| POST follows | -- | 50 | 15 min |
| Filtered stream | 50 connections | -- | 1 active, 1000 rules |

**App-level POST limits (across all authenticated users):**
- Tweets + Retweets (combined): 300 per 3 hours
- Likes: 1,000 per 24 hours
- Follows: 1,000 per 24 hours
- DMs: 15,000 per 24 hours

Rate limits return HTTP 429 with `x-rate-limit-reset` header.

### App Review/Approval
- **Basic write access:** No formal review — available immediately upon developer account creation
- **Full-archive search:** Only available on paid plans (not on free/pay-per-use basic tier)
- **Enterprise:** Requires Google Form application, selective approval, can take weeks

### Known Pain Points
1. **No native scheduling** — all third-party tools (Buffer, Hootsuite, etc.) build their own scheduling layer
2. **Pay-per-use costs add up fast** — $0.005/post read means 100K reads = $500/month just for reads
3. **2M post read hard cap** — cannot exceed without Enterprise ($42K+/mo)
4. **Free tier effectively dead** — no free credits, must purchase before any call
5. **Edit creates new tweet ID** — breaks bookmarked links and external references
6. **Error 226** — X blocks likes/replies/follows when it detects "bot-like behavior"
7. **Pricing instability** — has changed dramatically since 2023 (free → $100 → $200 → pay-per-use)

---

## 2. LinkedIn API (Marketing / Community Management)

### Authentication
- **OAuth 2.0** with specific permission scopes
- Required headers: `Linkedin-Version: {YYYYMM}` and `X-Restli-Protocol-Version: 2.0.0`
- Must apply through LinkedIn Developer Portal and undergo review

**Permission scopes for posting:**
| Scope | Purpose |
|---|---|
| `w_organization_social` | Post, comment, like on behalf of organization |
| `r_organization_social` | Read organization posts, comments, likes |
| `w_member_social` | Post, comment, like on behalf of authenticated member (personal profile) |
| `r_member_social` | Read member posts, comments, likes (restricted, approved users only) |

**Company page role requirements:** Must have CONTENT_ADMIN, ADMINISTRATOR, or DIRECT_SPONSORED_CONTENT_POSTER role on the organization page.

### Access Tiers

| Tier | Capabilities |
|---|---|
| **Development** | Read unlimited data; POST for up to 5 ad accounts; create 1 test account; GET unlimited. Apply via Developer Portal Product tab. |
| **Standard** | Unlimited read; create unlimited ad accounts; unlimited edits. Must first build/test on Development tier. LinkedIn reviews and selects partners at discretion. |

**Program Terms:** Governed by LinkedIn Marketing API Program Terms. All API calls operate on production data.

### Content Publishing

| Capability | Status |
|---|---|
| **Text-only posts** | YES — organic and sponsored |
| **Image posts** | YES — upload via Images API first, get Image URN |
| **Video posts** | YES — upload via Videos API first, get Video URN |
| **Document posts** | YES — upload via Documents API, get Document URN |
| **Article posts** | YES — set source URL, thumbnail, title, description manually (no URL scraping) |
| **Multi-image posts** | YES — organic only (via MultiImage API); sponsored uses Carousel API |
| **Carousel posts** | YES — sponsored only (via Carousel API); organic carousel NOT supported |
| **Poll posts** | YES — organic only (via Poll API) |
| **Celebration posts** | YES — organic only |
| **Reshares** | YES — with `reshareContext.parent` field |
| **Dark posts** | YES — non-page-visible posts for ad campaigns |
| **Targeted posts** | YES — audience targeting by geography, job function, industry, seniority (must exceed 300 members) |
| **Scheduling (native)** | **NO** — no `scheduled_at` parameter; posts publish immediately with `lifecycleState: PUBLISHED` |
| **Draft state** | YES — `lifecycleState: DRAFT` for unpublished content |

**Upload flow for media:** Two-step — upload asset to get URN, then reference URN in post creation.

### Editing & Deleting
| Capability | Status |
|---|---|
| **Edit post** | YES — partial update on `commentary`, `contentCallToActionLabel`, `contentLandingPage`, `lifecycleState`, `adContext`. Use `X-RestLi-Method: PARTIAL_UPDATE` |
| **Delete post** | YES — `DELETE /rest/posts/{urn}`; idempotent, batch delete NOT supported |
| **Edit after publish** | YES — limited fields only (commentary, CTA, landing page) |

### Analytics
- **Post analytics:** YES — retrieve post performance via Posts API and related analytics endpoints
- **Video analytics:** YES — watch time, views, viewers via Videos API
- **Member engagement:** YES — track reactions, comments, engagement metrics
- **Ad analytics:** YES — `adAnalytics` endpoint with single pivot, multi-pivot (Statistics), and revenue attribution (AttributedRevenueMetrics)
- **Audience counts:** YES — `GET /rest/audienceCounts` for targeting audience sizing

### Comments & Replies
- **Read comments:** YES — via Comments API on organization and member posts
- **Write comments:** YES — post comments on behalf of organization or member
- **Like/unlike:** YES — via Reactions API
- **Enable/disable comments:** YES — via Social Metadata API (toggle comments section on a post)

### Rate Limits
- LinkedIn does **not publish specific rate limit numbers** publicly
- Rate limits are visible in the Developer Portal Analytics tab (requires at least one prior request to endpoint)
- Two types: **application-level** (total calls per day) and **member-level** (per user per day)
- Reset daily at **midnight UTC**
- Returns HTTP 429 when exceeded
- Email alerts at 75% application-level threshold (1-2 hour delay)
- Practical limit reported by developers: ~**100 API calls per user per day** for posting operations

### App Review/Approval
- Must have established business and use case aligned with supported solutions
- Development tier: Apply via Developer Portal — generally straightforward
- Standard tier: Requires demonstration video of use cases; LinkedIn reviews at discretion
- May not be upgraded even if minimum requirements are met
- Must comply with LinkedIn Marketing API Program Terms

### Known Pain Points
1. **No native scheduling** — all scheduling tools build their own queue/cron layer
2. **Two-step media upload** — must upload asset first, get URN, then create post
3. **Carousel posts are sponsored-only** — cannot create organic carousel posts via API
4. **r_member_social is restricted** — requires LinkedIn approval for personal profile read access
5. **Versioned APIs** — monthly versioning (e.g., 202504 sunset), requires regular migration
6. **Opaque rate limits** — no published numbers; must check portal after making requests
7. **Strict comment matching for mentions** — organization mentions must match full name exactly, case-sensitive

### API Cost
- **No direct per-call cost** — unlike X, LinkedIn does not charge per API call
- Free to use within the Marketing Developer Program (Development and Standard tiers)
- Cost is developer time for integration, token management, and compliance

---

## 3. TikTok Content Posting API

### Authentication
- **OAuth 2.0 PKCE flow** (Authorization Code Grant)
- Redirect to `https://www.tiktok.com/v2/auth/authorize/` with `client_key`, `scope`, `redirect_uri`
- Exchange code for tokens at `https://open.tiktokapis.com/v2/oauth/token/`
- **Access token:** 24-hour TTL
- **Refresh token:** 365-day TTL
- **Required scopes:** `video.upload`, `video.publish`, `user.info.basic`

### Content Publishing

| Capability | Status |
|---|---|
| **Video posts** | YES — primary and only content type supported |
| **Photo posts** | **NO** — API is video-only. TikTok supports photo carousels in-app but no API endpoint exists |
| **Text-only posts** | **NO** |
| **Scheduling (native)** | **NO** — no `scheduled_publish_time` parameter. Publish immediately or save as draft |
| **Draft posts** | YES — via Upload to Inbox flow (`/v2/post/publish/inbox/video/init/`) |
| **Direct publish** | YES — via Direct Post flow (`/v2/post/publish/video/init/`) |
| **Edit after publish** | **NO** — cannot update caption, privacy, cover image. Must delete and re-upload |
| **Delete posts** | YES — `DELETE /v2/video/delete/` by video_id |

**Video specifications:**
| Spec | Requirement |
|---|---|
| Formats | MP4 (H.264 recommended), WebM |
| Max file size | 10 GB (production), 128 MB (sandbox) |
| Max duration | 10 minutes (standard), up to 60 minutes (some accounts) |
| Min resolution | 540x960px (will reject below) |
| Recommended | 1080x1920px (9:16 portrait) |
| Frame rate | 23-60 FPS |
| Audio | AAC stereo, 44.1 or 48 kHz |
| Bitrate | 2-8 Mbps for 1080p |
| Aspect ratio | 9:16 preferred; 1:1 and 16:9 accepted |
| Caption max length | 2,200 characters |
| Hashtag limit | 30 per post |

**Upload flow (3+ API calls minimum):**
1. `POST /v2/post/publish/video/init/` — initialize, get `upload_url` + `publish_id`
2. `PUT {upload_url}` — upload chunks sequentially with `Content-Range` headers
3. Poll `GET /v2/post/publish/status/fetch/` — wait for PUBLISH_COMPLETE
4. Alternatively, `PULL_FROM_URL` source lets TikTok fetch from a public URL directly

**Privacy settings are mandatory** in every publish request:
- `privacy_level`: `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR`, `SELF_ONLY`
- `disable_duet`, `disable_comment`, `disable_stitch` toggles
- Branded content: `brand_content_toggle` and `brand_organic_toggle` required for sponsored content

### Advanced Features
- **Duet/Stitch permissions:** YES — configurable per post
- **Branded content disclosures:** YES — mandatory for paid partnerships
- **Geo-targeting:** YES — video visibility can be geo-targeted
- **Webhook callbacks:** YES — for upload status (though status polling is also supported)
- **URL-based upload:** YES — `PULL_FROM_URL` source for CDN-hosted content

### Analytics
- **Video metadata:** YES — `GET /v2/video/query/` returns metadata for specific videos
- **Video list:** YES — `GET /v2/video/list/` retrieves published videos for authenticated user
- **Native engagement analytics via Content Posting API:** Limited — the Content Posting API focuses on publishing, not deep analytics
- **Business/Marketing API for analytics:** TikTok offers a separate Marketing API for ad analytics (In-Feed Ads, TopView, Spark Ads)
- **Third-party analytics:** Phyllo, SocialKit, PrimeApi, Influtics, and others provide engagement metrics (views, likes, comments, shares) via independent APIs

### Comments & Replies
- **Via Business/Marketing API (for ad accounts):**
  - `comment_list` — retrieve comments on ads
  - `comment_reference` — get related comments
  - `comment_post` — reply to comments
  - `comment_delete` — delete comments
  - `comment_status_update` — hide/unhide comments
  - `comment_task_create/check` — export comment tasks
  - Blocked word management for ad accounts

- **Via Research API:** `GET` video comments with id, text, video_id, parent_comment_id, like_count, reply_count, create_time (read-only)

- **Via Content Posting API:** No direct comment read/write — focus is on publishing only

- **Important distinction:** The TikTok Business/Marketing API (separate product from Content Posting API) has the comment management features. A social media management tool would need access to both.

### Rate Limits
| Endpoint | Limit |
|---|---|
| Video upload init (per user access token) | **6 requests per minute** |
| Content posting | Assigned during app review (not publicly published); typically a handful of publishes per user per day for newly approved apps |
| Token endpoints | Standard OAuth limits — do not call refresh in tight loop |
| Upload endpoints | Large files consume bandwidth; TikTok may throttle rapid large uploads |

- Returns HTTP 429 with `retry-after` header
- Higher limits available with justification during app review
- Per-app limits apply across all accounts managed by one app

### App Review/Approval
- **Manual review required** for Content Posting API scopes (`video.upload`, `video.publish`)
- **Required for review:**
  - Demo video or screenshots showing API usage
  - Privacy policy URL (must mention TikTok data handling)
  - Terms of service URL
  - Detailed use case description
- **Approval timeline:** 3-5 days (best case), 1-2 weeks (typical), 1-2 weeks per rejection round
- **No expedited review** — cannot pay for faster approval
- **Sandbox mode** available during review with test accounts (posts never published publicly)
- **Common rejection reasons:** vague use case, missing privacy policy, unnecessary scopes, no demo, no branded content disclosure handling

### API Cost
- **Free** — no cost for using the Content Posting API once approved
- Cost is entirely in developer time: building chunked upload, token refresh, error handling, queue management

### Known Pain Points
1. **Video-only API** — no photos, no carousels, no text posts
2. **No native scheduling** — must build own job queue/cron system
3. **No edit after publish** — delete and re-upload is the only option
4. **Chunked uploads are sequential** — cannot parallelize; slow on high-latency connections
5. **Strict app review** — 1-2 weeks minimum, vague descriptions get rejected
6. **Privacy level is mandatory** — no default, omit it and the request fails
7. **Token expiry mid-upload** — 24-hour access token can expire during long upload; must implement proactive refresh
8. **Account trust issues** — TikTok's risk systems flag accounts with unusual patterns, mismatched IPs, or no organic device history
9. **Publish status polling required** — no push notifications; must poll with exponential backoff
10. **Per-account OAuth** — no agency-level token; each account must authorize independently

---

## Comparison Summary

| Feature | X/Twitter | LinkedIn | TikTok |
|---|---|---|---|
| **Auth** | OAuth 1.0a + OAuth 2.0 | OAuth 2.0 | OAuth 2.0 PKCE |
| **Text posts** | YES | YES | NO (video only) |
| **Image posts** | YES (via media upload) | YES (via Images API) | NO |
| **Video posts** | YES (via media upload) | YES (via Videos API) | YES (primary) |
| **Carousel** | NO | Sponsored only | NO |
| **Polls** | YES | YES (organic only) | NO |
| **Threads** | YES | NO (reshares only) | NO |
| **Native scheduling** | **NO** | **NO** | **NO** |
| **Edit published post** | YES (30 min, 5 edits) | YES (limited fields) | **NO** |
| **Delete published post** | YES | YES | YES |
| **Analytics** | YES (impressions, clicks, views) | YES (engagement, video, ad) | Limited (Marketing API for ads) |
| **Read comments** | YES (via conversation/threads) | YES (Comments API) | YES (Business API for ads) |
| **Write comments/replies** | YES (reply tweets) | YES (Comments API) | YES (Business API for ads) |
| **Rate limits** | Published (per-endpoint, per 15min/24h) | Opaque (check portal) | 6/min upload init, publish limits by review |
| **App review** | No for basic; yes for enterprise | Yes (Development → Standard) | Yes (manual, 1-2 weeks) |
| **API cost** | Pay-per-use ($0.005-$0.015 per resource) | Free (Developer Program) | Free (after approval) |
| **Free tier** | Effectively none | Development tier available | Sandbox during review |

### Universal Limitation: No Platform Offers Native Scheduling

All three platforms lack a native `scheduled_at` or `publish_at` parameter. Any social media management tool must implement its own scheduling layer — a database queue with cron jobs or scheduled workers that fire the publish API call at the desired time.

### Key Takeaways for Building a Social Media Management Tool

1. **Scheduling is entirely your responsibility** — every platform publishes immediately only
2. **X is the only platform that charges per API call** — budget carefully for read-heavy workloads
3. **TikTok is the most restrictive** — video-only, chunked uploads, strict review, no edit after publish
4. **LinkedIn is the most generous** — free API access, rich content types, but opaque rate limits
5. **Token management is non-trivial** — TikTok tokens expire in 24 hours, X requires OAuth, LinkedIn requires role validation
6. **Comment management varies** — X uses the tweet system for replies; LinkedIn has a dedicated Comments API; TikTok splits between Content Posting API (publishing) and Business API (comments/analytics)
7. **Media uploads are always two-step** — X, LinkedIn, and TikTok all require uploading media assets separately before creating the post
