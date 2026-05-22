# Buffer Feature Suggestions — API Feasibility Analysis (2026)

> Date: 2026-05-21
> Purpose: Verify API feasibility for each Buffer feature suggestion against latest 2026 platform documentation
> Sources: Meta Graph API v25.0, TikTok Content Posting API, LinkedIn Posts API, YouTube Data API v3, Instagram Graph API, Sharp v0.34.5, Substack RSS

---

## Feasibility Summary

| # | Feature | Buffer Votes | Feasibility | Effort | Risk | Notes |
|---|---------|-------------|-------------|--------|------|-------|
| 1 | Video thumbnail customization | 619 | **FEASIBLE** | Medium | Low | Meta: `cover_url` param, `/{video_id}/thumbnails`. TikTok: `video_cover_timestamp_ms` |
| 2 | Aggregated analytics across channels | 387 | **FEASIBLE** | High | Low | Already in MVP scope. Requires data aggregation layer. |
| 3 | Evergreen content recycling | 383 | **FEASIBLE** | Medium | Low | Already elevated to P0. Pure scheduling logic. |
| 4 | Substack integration | 333 | **FEASIBLE** | Low | Low | RSS-based. No official API needed. |
| 5 | Instagram multi-video carousel | 323 | **PARTIAL** | Medium | Medium | Videos in carousels supported, but NOT Reels. API limit 400 containers/24h. |
| 6 | Auto-resize/crop per platform | 259 | **FEASIBLE** | Low | Low | Sharp v0.34.5 or imgkit. Pure image processing. |
| 7 | Ideas on calendar | 234 | **FEASIBLE** | Medium | Low | New DB entity + UI. AI generation is a differentiator. |
| 8 | Calendar notes/blocks | 215 | **FEASIBLE** | Low | Low | Simple DB + UI addition to calendar. |
| 9 | Multi-workspace for brands | 173 | **FEASIBLE** | High | Medium | Already Phase 2. Requires data isolation architecture. |
| 10 | Rich text in posts | 171 | **PARTIAL** | Medium | Low | Facebook/LinkedIn: limited native support. X: no formatting. |
| 11 | Instagram collaborator invite | 157 | **NOT FEASIBLE** | N/A | High | API is READ-ONLY for collaborators. No POST/create endpoint. |
| 12 | Account-wide search | 155 | **FEASIBLE** | Medium | Low | Postgres FTS or Meilisearch. Quick win. |
| 13 | DM/messaging support | 140 | **FEASIBLE** | High | Medium | Already MVP P0. Per-platform API complexity. |
| 14 | Schedule long YouTube video | 130 | **FEASIBLE** | Medium | Medium | `status.publishAt` + `privacyStatus=private`. Requires API verification audit. |
| 15 | Schedule/publish via API | 128 | **FEASIBLE** | High | Low | Already Phase 3. RESTful API + webhooks. |

---

## Detailed Feasibility Analysis

### 1. Video Thumbnail Customization (619 votes) — Buffer's #1 Feature

**Feasibility: FEASIBLE**

#### Instagram Reels
- **API**: Meta Graph API v25.0, `POST /{ig-user-id}/media` with `cover_url` parameter
- **Specs**: JPEG, 8MB max, 9:16 aspect ratio, sRGB color space
- **Flow**: Upload cover to publicly accessible URL → pass `cover_url` when creating reel container
- **Alternative**: `thumb_offset` parameter for frame-based selection
- **Source**: [Instagram Graph API Media Reference](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/) lines 160-173

#### Facebook Reels/Video
- **API**: `POST /{video_id}/thumbnails` edge
- **Parameters**: `source` (image file), `is_preferred` (boolean)
- **Specs**: 10MB max, same aspect ratio as video recommended
- **Limitations**: Cannot update or delete thumbnails after creation
- **Source**: [Meta Video Thumbnails API](https://developers.facebook.com/docs/graph-api/reference/video-thumbnail/)

#### TikTok
- **API**: `video_cover_timestamp_ms` parameter in `/v2/post/publish/video/init/`
- **Mechanism**: Specify timestamp (ms) for which video frame becomes the cover
- **Default**: First frame if not set or invalid
- **Limitation**: Frame selection only — cannot upload a custom image via API
- **Source**: TikTok Content Posting API Direct Post Reference

#### Implementation Approach
```
1. Media upload: User uploads video + optional custom thumbnail image
2. Process thumbnail through sharp (resize to platform specs)
3. Instagram: Upload thumbnail to CDN, pass cover_url in container creation
4. Facebook: POST thumbnail to /{video_id}/thumbnails after video publish
5. TikTok: Use thumb_offset parameter (frame-based only, no custom image support)
6. UI: Thumbnail preview + cropping tool per platform aspect ratio
```

**Risk**: TikTok does not support custom image covers via API — only frame selection from the video itself. This should be documented as a platform limitation.

**Effort**: Medium. Requires CDN upload for thumbnails, platform-specific API flows, and a cropping UI.

---

### 2. Aggregated Post Analytics Across Channels (387 votes)

**Feasibility: FEASIBLE**

#### Current State
- Already in MVP scope as "Unified analytics dashboard" (P0)
- Buffer status: Beta

#### API Data Sources
| Platform | API | Metrics Available |
|----------|-----|-------------------|
| Instagram | Graph API v25.0 | likes, comments, shares, saves, reach, impressions |
| Facebook | Graph API v25.0 | reactions, comments, shares, reach, video_views |
| X/Twitter | X API v2 | likes, retweets, replies, impressions, profile_clicks |
| LinkedIn | Posts API 2026-01 | likes, comments, shares, impressions, click_rate |
| TikTok | Content Posting API | likes, comments, shares, plays |

#### Implementation Approach
- Pull per-platform data via scheduled jobs
- Store in unified schema with platform-agnostic metric mapping
- Aggregate in PostgreSQL with materialized views for performance
- UI: Cross-platform charts with unified date ranges

**Risk**: Low. Platform APIs all expose the required metrics. Main complexity is normalization (different metric names, rate limits).

**Effort**: High. Requires data pipeline, metric normalization, and cross-platform aggregation.

---

### 3. Evergreen Content Recycling (383 votes)

**Feasibility: FEASIBLE**

#### Current State
- Already elevated to P0 in MVP scope
- Buffer status: Beta

#### Implementation Approach
- When scheduling a post, user can set `recycle: true` + interval (e.g., every 30 days)
- On publish, system checks recycle flag and creates next scheduled instance
- Track recycle count to prevent overposting
- UI: "Recycle this post" toggle in compose form

**Risk**: Low. Pure scheduling logic. No platform API dependencies.

**Effort**: Medium. Requires scheduler modification and recycle tracking.

---

### 4. Substack Integration (333 votes)

**Feasibility: FEASIBLE**

#### Data Source
- **No official public API** — Substack does not provide one
- **RSS Feed**: Available at `https://{subdomain}.substack.com/feed` for all publications
- **Content**: Standard RSS 2.0 with title, link, date, author, HTML body (`content:encoded`), categories, cover images

#### Integration Approach
```
1. User provides Substack URL (e.g., blog.substack.com)
2. SocialBeam fetches RSS feed at {url}/feed
3. Parse RSS: Extract title, body, cover image, date
4. AI Content Repurposer (Flow 3.11): Convert article to social posts
5. Schedule to platforms
```

#### Tech Stack
- RSS parsing: `rss-parser` (npm) or `feedparser` (npm)
- HTML-to-text conversion for article body extraction
- AI repurposing via existing Content Repurposer flow

**Risk**: Low. RSS is stable and well-supported. No authentication needed.

**Effort**: Low. RSS feed parsing is straightforward. Primary work is connecting to the Content Repurposer pipeline.

---

### 5. Instagram Multi-Video Carousel Posts (323 votes)

**Feasibility: PARTIAL — Videos YES, Reels NO**

#### API Capability
- **Videos in carousels**: YES — `media_type=VIDEO` + `is_carousel_item=true` via resumable upload
- **Images in carousels**: YES — standard image containers
- **Reels in carousels**: NO — explicitly prohibited by API: "Reels cannot appear in carousels"
- **Mixed media (video+photo)**: YES — create individual containers, combine via `children` array
- **Max carousel items**: Not explicitly limited by API, but 400 container limit per 24h applies

#### API Flow
```
1. Create video container: POST /{ig-user-id}/media with media_type=VIDEO, is_carousel_item=true, upload_type=resumable
2. Upload video to returned URI
3. Repeat for each carousel item
4. Create carousel: POST /{ig-user-id}/media with media_type=CAROUSEL, children=[container_ids]
5. Publish: POST /{ig-user-id}/media_publish with creation_id
```

#### Limitations
- Containers expire after 24 hours
- 400 containers per rolling 24-hour period per account
- 50 posts per 24-hour publishing limit
- No `cover_url` support for carousel video items

**Risk**: Medium. Users expect Reels in carousels (native Instagram feature), but API explicitly blocks this. Need to communicate limitation clearly.

**Effort**: Medium. Similar to existing multi-platform publishing flow with additional carousel container management.

---

### 6. Auto-Resize/Crop Per Platform (259 votes)

**Feasibility: FEASIBLE**

#### Technology Options

**Primary: Sharp v0.34.5**
- 4-5x faster than ImageMagick (uses libvips)
- Fit modes: `cover`, `contain`, `fill`, `inside`, `outside`
- Supports JPEG, PNG, WebP, GIF, AVIF
- Node.js ^18.17.0 or >=20.3.0

**Alternative: imgkit (2026)**
- Rust/napi-rs backend
- 950x faster metadata extraction, 1.9x faster thumbnails
- Smart content-aware cropping
- ThumbHash/BlurHash placeholders

#### Platform Dimension Rules
```typescript
const PLATFORM_DIMENSIONS = {
  instagram_post:    { width: 1080, height: 1080, maxMB: 8, format: 'jpeg' },
  instagram_carousel: { width: 1080, height: 1080, maxMB: 8, format: 'jpeg' },
  instagram_story:   { width: 1080, height: 1920, maxMB: 8, format: 'jpeg' },
  facebook_post:     { width: 1200, height: 630, maxMB: 8, format: 'jpeg' },
  tiktok_video:      { width: 1080, height: 1920, maxMB: 287, format: 'mp4' },
  linkedin_post:     { width: 1200, height: 627, maxMB: 8, format: 'jpeg' },
  x_post:            { width: 1600, height: 900, maxMB: 5, format: 'jpeg' },
  pinterest_pin:     { width: 1000, height: 1500, maxMB: 20, format: 'jpeg' },
};
```

#### Implementation Approach
```typescript
import sharp from 'sharp';

async function resizeForPlatform(input: Buffer, platform: string): Promise<Buffer> {
  const dims = PLATFORM_DIMENSIONS[platform];
  return sharp(input)
    .resize(dims.width, dims.height, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 85 })
    .toBuffer();
}
```

**Risk**: Low. Well-established technology. Sharp is production-proven.

**Effort**: Low. Core logic is ~100 lines. Main work is defining dimension rules per platform.

---

### 7. Ideas/Planning on Calendar (234 votes)

**Feasibility: FEASIBLE**

#### Current State
- Buffer status: Planned
- Calendar currently shows scheduled posts only

#### Implementation Approach
```
Database Schema:
  Idea {
    id: string
    workspaceId: string
    title: string
    description: string (rich text)
    status: 'draft' | 'approved' | 'archived'
    targetDate: Date | null (optional placement on calendar)
    targetPlatforms: Platform[] (optional)
    source: 'manual' | 'ai-generated'
    createdAt: Date
    updatedAt: Date
  }

Calendar View:
  - Existing scheduled posts shown as solid blocks
  - Ideas shown as dashed-outline blocks
  - Drag ideas onto calendar to convert to scheduled posts
  - Click to edit/expand

AI Differentiator:
  - "AI Idea Generator" fills empty calendar slots
  - Uses Content Repurposer + AI Caption Writer
  - Autonomy Dial controls auto-placement vs manual review
```

**Risk**: Low. New DB entity + UI. No external API dependencies.

**Effort**: Medium. Requires DB schema, calendar UI changes, drag-and-drop conversion logic.

---

### 8. Calendar Notes/Blocks (215 votes)

**Feasibility: FEASIBLE**

#### Buffer Status: Planned

#### Implementation Approach
```
Database Schema:
  CalendarNote {
    id: string
    workspaceId: string
    date: Date
    type: 'note' | 'block' | 'reminder'
    content: string
    blockScheduling: boolean (prevents AI from scheduling on this date)
  }

UI:
  - "Add note" button on calendar day
  - Visual distinction: notes as sticky-note style blocks
  - Blocked days shown with diagonal stripe overlay
  - AI scheduling respects blocked days
```

**Risk**: Low. Simple addition to calendar.

**Effort**: Low. ~200 lines of UI + DB changes.

---

### 9. Multi-Workspace for Clients/Brands (173 votes)

**Feasibility: FEASIBLE**

#### Current State
- Buffer status: Planned
- Already scoped for Phase 2 team collaboration
- MVP: Single workspace per user

#### Architecture Considerations
```
Data Isolation:
  - workspace_id on all tables (posts, accounts, settings, ideas, notes)
  - RLS policies (Row Level Security) on PostgreSQL
  - Workspace switcher in top bar
  - Separate brand voice profiles per workspace

UI:
  - Workspace dropdown in top bar
  - Per-workspace sidebar context
  - Cross-workspace search (optional)
```

**Risk**: Medium. Requires careful data isolation. Migration from single to multi-workspace needs planning.

**Effort**: High. Touches every data layer. Must be done early to avoid migration complexity.

---

### 10. Rich Text in Posts (171 votes)

**Feasibility: PARTIAL — Platform-dependent**

#### Buffer Status: Exploring

#### Platform Support
| Platform | Rich Text Support | API Support |
|----------|------------------|-------------|
| **Facebook** | Bold, italic via Unicode | Manual character encoding |
| **LinkedIn** | Limited — "little text format" only supports mentions + hashtags | No bold/italic in Posts API |
| **X/Twitter** | No native rich text | Unicode workarounds only |
| **Instagram** | No rich text in captions | No API support |
| **TikTok** | No rich text | No API support |
| **Pinterest** | No rich text | No API support |

#### Unicode Workaround
Rich text can be simulated using Unicode mathematical alphanumeric symbols:
```
Bold: 𝐓𝐡𝐢𝐬 𝐢𝐬 𝐛𝐨𝐥𝐝 (U+1D400 range)
Italic: 𝑇ℎ𝑖𝑠 𝑖𝑠 𝑖𝑡𝑎𝑙𝑖𝑐 (U+1D434 range)
```

**Caveat**: Screen readers may not read Unicode "bold" correctly. Accessibility concern.

#### Recommendation
- Implement as compose-form feature with Unicode fallback
- Platform-specific preview: show formatting only where it renders
- Accessibility warning for screen reader users
- Mark as P2 — nice-to-have, not essential

**Risk**: Low for implementation, Medium for accessibility.

**Effort**: Medium. Rich text editor + Unicode mapping + platform-specific preview.

---

### 11. Instagram Collaborator Invite (157 votes)

**Feasibility: NOT FEASIBLE via API**

#### Buffer Status: New

#### API Capability
- **GET** collaborators: YES — `GET /{ig-media-id}/collaborators`
  - Returns collaborator IDs, usernames, invitation status
- **POST** collaborators: NO endpoint exists
- **PUT/PATCH** collaborators: NO endpoint exists
- **DELETE** collaborators: NO endpoint exists

#### Workaround
The Instagram Graph API's Reel container creation supports `collaborators` parameter (comma-separated usernames), but this only works when the target accounts have **already enabled collaborator tagging** in their settings. It's not a true "invite" flow.

```
POST /{ig-user-id}/media
?media_type=REELS
&collaborators=username1,username2  // Pre-approved collaborators only
```

#### Recommendation
- **Phase 2**: Implement what the API allows — pass collaborator usernames in container creation for accounts with collaborator tagging enabled
- **Document**: Clear UX message that collaborators must have collaborator tagging pre-enabled
- **Not a full invite flow**: Users must still manage invitations through Instagram native app for first-time collaborators

**Risk**: High. Users expect full invite flow (like Instagram native app). API limitation means we can only partially deliver.

**Effort**: Low (for what's possible). But managing user expectations is the real cost.

---

### 12. Account-Wide Search (155 votes)

**Feasibility: FEASIBLE**

#### Buffer Status: Planned

#### Technology Options
| Option | Pros | Cons |
|--------|------|------|
| **PostgreSQL FTS** | No extra infra, GIN index, `ts_rank()` relevance | Slower for large datasets (>100K posts) |
| **Meilisearch 1.5** | Sub-80ms, typo tolerance, hybrid vector search | Additional service to deploy/manage |

#### Recommended: PostgreSQL FTS (MVP)
```sql
-- Index on searchable fields
CREATE INDEX posts_search_idx ON posts
USING GIN (
  to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(body, '') || ' ' ||
    coalesce(tags, '')
  )
);

-- Query with relevance ranking
SELECT *, ts_rank(search_vector, query) as rank
FROM posts, to_tsquery('english', 'search_term') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

#### Search Scope
- Published posts
- Scheduled posts
- Drafts
- Ideas (if Ideas feature is implemented)
- Media tags

**Risk**: Low. Postgres FTS is well-tested. Can upgrade to Meilisearch later if scale demands.

**Effort**: Medium. DB schema changes, search UI, relevance tuning.

---

### 13. DM/Messaging Support (140 votes)

**Feasibility: FEASIBLE**

#### Current State
- Already in MVP scope as "Unified inbox" (P0)

#### Platform API Coverage
| Platform | API | DM Support |
|----------|-----|-----------|
| Instagram | Instagram Messaging API | Direct messages, story replies |
| Facebook | Page Inbox API | Messages, comments |
| X/Twitter | X API v2 | DMs (requires elevated access) |
| LinkedIn | Messaging API | Limited (B2B only) |
| TikTok | Content API | Comments only (no DMs) |

**Risk**: Medium. X/Twitter DM API requires elevated access tier. TikTok DMs not available via third-party API.

**Effort**: High. Per-platform API integration, real-time WebSocket updates, message normalization.

---

### 14. Schedule Long YouTube Video (130 votes)

**Feasibility: FEASIBLE**

#### API Capability
YouTube Data API v3 supports scheduled publishing via `status.publishAt`:

```json
{
  "status": {
    "privacyStatus": "private",
    "publishAt": "2026-06-01T10:00:00Z"
  }
}
```

#### Key Constraints
- `publishAt` can only be set when `privacyStatus` is `"private"`
- Must be set at upload time OR via `videos.update` before publishing
- If set to a past date, video publishes immediately
- **Critical**: Unverified API projects (created after July 28, 2020) default to private-only — must pass audit for public publishing

#### Implementation Approach
```
1. Upload video via YouTube Data API v3 videos.insert
2. Set privacyStatus=private, publishAt=desired_time
3. Our scheduler polls video status until published
4. At publishAt time, YouTube auto-publishes
```

**Risk**: Medium. YouTube API verification audit required for public publishing. SocialBeam would need to be a verified project.

**Effort**: Medium. Similar to existing multi-platform publishing flow. OAuth + API integration.

---

### 15. Schedule/Publish via API (128 votes)

**Feasibility: FEASIBLE**

#### Buffer Status: Beta

#### Already Scoped for Phase 3
- RESTful API for custom integrations
- Webhooks for real-time events
- OpenAPI specification
- Zapier/Make/n8n integration

#### API Endpoints (Design)
```
POST /api/v1/posts          — Create and schedule a post
GET  /api/v1/posts          — List posts (filter by status)
GET  /api/v1/posts/:id      — Get post details
PUT  /api/v1/posts/:id      — Update scheduled post
DELETE /api/v1/posts/:id    — Delete post
GET  /api/v1/analytics      — Get analytics data
GET  /api/v1/accounts       — List connected accounts

Webhooks:
  post.published
  post.failed
  account.disconnected
```

**Risk**: Low. Standard REST API patterns. Main effort is security (API keys, rate limiting, OAuth scopes).

**Effort**: High. Full API surface, documentation, SDK, authentication, rate limiting.

---

## Priority Recommendations (Updated with Feasibility)

Based on the feasibility analysis, here are the **final priority recommendations**:

### Immediate (P0 — Build Now)
| Feature | Votes | Feasibility | Rationale |
|---------|-------|-------------|-----------|
| **Content Queue** (evergreen recycling) | 383 | FEASIBLE | Elevated to P0. Core differentiator vs SocialBee. |
| **Auto-resize/crop per platform** | 259 | FEASIBLE | Elevated to P0. Prevents posting failures. Sharp library is production-ready. |

### Phase 1.5 (P1 — Quick Wins)
| Feature | Votes | Feasibility | Rationale |
|---------|-------|-------------|-----------|
| **Account-wide search** | 155 | FEASIBLE | Postgres FTS. Users lose scheduled posts without search. |
| **Substack content source** | 333 | FEASIBLE | RSS-based. Low effort, high demand. Connects to Content Repurposer. |

### Phase 2 (P1 — Strategic Features)
| Feature | Votes | Feasibility | Rationale |
|---------|-------|-------------|-----------|
| **Video thumbnail customization** | 619 | FEASIBLE | #1 demand. Meta + TikTok APIs support it. Major differentiator. |
| **Instagram multi-video carousel** | 323 | PARTIAL | Videos supported, Reels not. Document limitation clearly. |
| **Ideas on calendar** | 234 | FEASIBLE | AI-generated ideas as differentiator. |

### Phase 2 (P2 — Nice-to-Have)
| Feature | Votes | Feasibility | Rationale |
|---------|-------|-------------|-----------|
| **Calendar notes/blocks** | 215 | FEASIBLE | Low effort. Pairs with ideas feature. |
| **Rich text formatting** | 171 | PARTIAL | Unicode workaround. Accessibility concerns. |
| **Instagram collaborators** | 157 | PARTIAL | Only pre-approved accounts via API. Manage expectations. |

### Phase 3 (Deferred)
| Feature | Votes | Feasibility | Rationale |
|---------|-------|-------------|-----------|
| **YouTube scheduling** | 130 | FEASIBLE | Requires API verification audit. Phase 3 platform. |
| **Developer API** | 128 | FEASIBLE | Already Phase 3. Standard REST API. |
| **Multi-workspace** | 173 | FEASIBLE | Already Phase 2 team collaboration. |

### NOT FEASIBLE
| Feature | Votes | Rationale |
|---------|-------|-----------|
| **Instagram collaborator invites** (full flow) | 157 | API is read-only for collaborators. Only pre-approved accounts can be tagged. |

---

## Appendix: API Reference Links

| Platform | Documentation |
|----------|--------------|
| Meta Graph API v25.0 | https://developers.facebook.com/docs/graph-api/ |
| Instagram Graph API Media | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/ |
| Meta Video Thumbnails | https://developers.facebook.com/docs/graph-api/reference/video-thumbnail/ |
| TikTok Content Posting API | https://developers.tiktok.com/products/content-posting-api |
| LinkedIn Posts API | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api |
| YouTube Data API v3 | https://developers.google.com/youtube/v3/docs/videos |
| Sharp (npm) | https://www.npmjs.com/package/sharp |
| Substack RSS | https://{subdomain}.substack.com/feed |
