# Buffer Feature Suggestions → SocialBeam Roadmap Mapping

> Date: 2026-05-21
> Source: https://suggestions.buffer.com/b/feature-suggestions (664 suggestions, sorted by popularity)
> Purpose: Map Buffer's most-requested features to SocialBeam's roadmap, identify gaps and opportunities.
> Feasibility: See [buffer-features-feasibility-2026.md](buffer-features-feasibility-2026.md) for full API feasibility analysis against 2026 platform documentation.

---

## Analysis Methodology

Buffer's feature suggestions board has **664 suggestions** with vote counts indicating demand intensity. Each suggestion has a status tag from Buffer:
- **Planned** — Buffer is building it
- **Beta** — In beta testing
- **Exploring** — Under consideration
- **Someday** — On the long-term backlog
- **New** — Recently submitted

Features are ranked by vote count (demand signal). Each is mapped to SocialBeam's existing scope in `docs/mvp-scope.md` and `docs/tool-vision-and-market-research.md`.

---

## Feature Mapping Table

### Tier 1: High-Demand Features (200+ votes)

| # | Buffer Suggestion | Votes | Buffer Status | SocialBeam Status | Priority | Notes |
|---|---|---|---|---|---|---|
| 1 | **Customize thumbnails for video posts (including Reels)** | 619 | Exploring | **GAP** | P1 | Video thumbnail customization is not in MVP scope. Critical for Reels/TikTok. Map to Phase 2 video tools. |
| 2 | **Aggregated post analytics across all channels** | 387 | Beta | **PARTIAL** | P0 | Unified analytics dashboard is P0 in MVP. Aggregated cross-channel reports are already scoped in `tool-vision` §7.3. Ensure this covers the "single dataset for all channels" ask. |
| 3 | **Automatically reuse a past Post / recurring Posts** | 383 | Beta | **COVERED** | P1 | "Content Queue (evergreen recycling)" is P1 in MVP scope. Map to Content Queue feature. Ensure automatic recurrence scheduling is included. |
| 4 | **Substack integration** | 333 | New | **GAP** | P2 | New channel request. Substack not in platform coverage. Map to Phase 2 "20+ platform support" expansion. |
| 5 | **Publish Instagram Post with multiple videos** | 323 | Someday | **GAP** | P1 | Instagram carousel with mixed media (video+photo) is native feature. Not in MVP scope. Important for Instagram-first users. Map to Phase 1.5 or P1 compose enhancements. |
| 6 | **Automatically resize and crop large images & videos per network** | 259 | Planned | **PARTIAL** | P1 | "Auto-Resize" is P1 in `tool-vision` §7.2. Platform dimension preview is P1 in media library. Strengthen to P0 given 259 votes — users cite strict size limits on Instagram/TikTok. |
| 7 | **Plan/Schedule Ideas on the Calendar** | 234 | Planned | **GAP** | P1 | Calendar currently shows scheduled posts only. Ability to place ideas/drafts on calendar for planning is not in MVP. Map to Phase 2 content planning. Differentiator: SocialBeam's AI could auto-generate ideas and place them. |

### Tier 2: Medium-Demand Features (100-199 votes)

| # | Buffer Suggestion | Votes | Buffer Status | SocialBeam Status | Priority | Notes |
|---|---|---|---|---|---|---|
| 8 | **Notes or blocks on the calendar** | 215 | Planned | **GAP** | P2 | Calendar annotations (reminders, blocked days). Not in MVP. Map to Phase 2 calendar enhancements. |
| 9 | **Distinct workspaces for clients and brands** | 173 | Planned | **PARTIAL** | P1 | Single workspace per user for MVP. Multi-workspace is Phase 2/3. Agency persona (Priya, 25+ brands) already demands this. Map to Phase 2 team collaboration. |
| 10 | **Support for rich text in posts (bold, italic, etc.)** | 171 | Exploring | **GAP** | P2 | Rich text formatting. Not in MVP compose. Map to Phase 2 compose enhancements. |
| 11 | **Support collaborators on Instagram posts & reels** | 157 | New | **GAP** | P2 | Instagram "Invite Collaborator" feature. Not in MVP. Map to Phase 2 platform-specific features. |
| 12 | **Account-wide Search for Posts, Drafts & Ideas** | 155 | Planned | **GAP** | P1 | Search across calendar/drafts/published posts. Not in MVP. Important usability gap — users lose scheduled posts. Map to Phase 1.5 or P1. |
| 13 | **Digital messaging and direct message support** | 140 | New | **COVERED** | P0 | Unified inbox is P0 in MVP (`tool-vision` §7.4). Covers messages, comments, mentions. Ensure DM support is explicitly scoped. |
| 14 | **Schedule long YouTube video** | 130 | Someday | **GAP** | P2 | YouTube is Phase 3 in MVP scope. Long-form video scheduling is a natural extension. Map to Phase 3. |
| 15 | **Schedule and Publish via API** | 128 | Beta | **PLANNED** | P2 | Developer API is Phase 3 in `tool-vision` §8.6. RESTful API + webhooks already scoped. Map to Phase 3. |

---

## Gap Analysis Summary

### Already Covered in SocialBeam MVP (9 of 15)
| Feature | SocialBeam Equivalent |
|---------|----------------------|
| Aggregated post analytics | Unified analytics dashboard (P0) |
| Recurring posts | Content Queue / evergreen recycling (P1) |
| Auto-resize/crop images | Auto-Resize (P1, §7.2) |
| DM/messaging support | Unified inbox (P0, §7.4) |
| Calendar with AI-suggested times | Visual content calendar (P0) |
| AI-suggested posting times | Best Time to Post (P0) |
| Multi-platform publishing | Multi-platform publishing (P0) |
| Brand voice per client | AI Brand Voice Per Client (P1) |
| Client approval links | Client Approval via Shareable Links (P0) |

### Gaps to Add to Roadmap (6 of 15)
| Gap | Recommended Phase | Rationale |
|-----|------------------|-----------|
| **Video thumbnail customization** | Phase 2 (P1) | 619 votes — #1 demand signal. Critical for video-first workflows (Reels, TikTok). |
| **Instagram multi-video carousel posts** | Phase 1.5 (P1) | 323 votes. Native Instagram feature gap. Affects all Instagram publishers. |
| **Ideas/planning on calendar** | Phase 2 (P1) | 234 votes. Content planning workflow. SocialBeam's AI can generate and place ideas automatically. |
| **Account-wide search (posts, drafts, ideas)** | Phase 1.5 (P1) | 155 votes. Usability issue — users lose scheduled posts. Low implementation effort with existing search infrastructure. |
| **Substack integration** | Phase 2 (P2) | 333 votes. Content source for repurposing pipeline. Map to Content Repurposer (Flow 3.11). |
| **Rich text formatting in posts** | Phase 2 (P2) | 171 votes. Platform-specific (LinkedIn, Facebook support formatting). |

### Deferred (Naturally Out of Scope)
| Feature | SocialBeam Phase | Rationale |
|---------|-----------------|-----------|
| YouTube long-form scheduling | Phase 3 | YouTube is Phase 3 per MVP scope |
| API for scheduling/publishing | Phase 3 | Developer platform is Phase 3 |
| Instagram collaborator feature | Phase 2 | Platform-specific, nice-to-have |
| Calendar notes/blocks | Phase 2 | Nice-to-have calendar enhancement |
| Multi-workspace | Phase 2 | Already scoped for Phase 2 team collaboration |

---

## Strategic Insights

### 1. Video Thumbnail Customization is the Biggest Gap (619 votes)
This is Buffer's #1 most-requested feature by a wide margin (619 vs 387 for #2). Buffer's status is "Exploring" — they haven't committed to building it yet. SocialBeam can **differentiate early** by including thumbnail customization in the video publishing flow.

**Recommendation**: Add to Phase 2 as P1. Implement as part of the media library — when uploading video, allow thumbnail selection/cropping per platform.

### 2. Content Recycling Demand is Massive (383 votes, #3)
SocialBeam already has "Content Queue" scoped as P1. Given the vote count and the fact that Buffer is in Beta, **elevate to P0** for MVP. This is a core differentiator — SocialBee built its entire business on this feature.

**Recommendation**: Elevate Content Queue from P1 to P0. Ensure automatic recurrence scheduling is included.

### 3. Auto-Resize/Crop Should Be P0, Not P1 (259 votes)
Users specifically mention Instagram/TikTok strict size limits causing posting failures. This is not just a convenience — it prevents failed posts. Buffer marks as "Planned."

**Recommendation**: Elevate Auto-Resize from P1 to P0. Implement as part of media upload pipeline.

### 4. Calendar Ideas/Planning is a Differentiator Opportunity (234 votes)
Buffer is "Planned" for this. SocialBeam's AI-native approach can go further: AI-generated content ideas placed directly on the calendar. This aligns with the AI Strategy Engine vision (Content Pillar Suggestions, Gap Analysis).

**Recommendation**: Add to Phase 2 P1. Include AI-generated idea placement as a differentiator.

### 5. Account-Wide Search is a Quick Win (155 votes)
Low implementation effort with high user impact. Users lose track of scheduled posts — a basic usability issue. Buffer is "Planned."

**Recommendation**: Add to Phase 1.5 or P1. Implement as global search in the calendar/compose views.

### 6. Substack as Content Source (333 votes)
Not a social platform per se, but a content source for the repurposing pipeline. SocialBeam's Content Repurposer (Flow 3.11) can accept Substack URLs as input.

**Recommendation**: Add Substack as a supported content source for the Content Repurposer in Phase 2.

---

## Updated Priority Recommendations

Based on Buffer's demand signals, the following adjustments to SocialBeam's MVP/Phase 2 priorities are recommended:

| Feature | Current Priority | Recommended Priority | Change Reason |
|---------|-----------------|---------------------|---------------|
| Content Queue (evergreen recycling) | P1 | **P0** | 383 votes, Beta at Buffer, core differentiator |
| Auto-Resize/Crop per platform | P1 | **P0** | 259 votes, prevents posting failures |
| Video thumbnail customization | Not scoped | **P1 (Phase 2)** | 619 votes, #1 demand signal |
| Instagram multi-video carousel | Not scoped | **P1** | 323 votes, native feature gap |
| Account-wide search | Not scoped | **P1** | 155 votes, quick win |
| Ideas on calendar | Not scoped | **P1 (Phase 2)** | 234 votes, AI differentiation opportunity |
| Substack content source | Not scoped | **P2 (Phase 2)** | 333 votes, repurposing pipeline input |

---

## Appendix: Full Buffer Suggestions Data

Data scraped from https://suggestions.buffer.com/b/feature-suggestions on 2026-05-21.

| Rank | Suggestion | Votes | Status |
|------|-----------|-------|--------|
| 1 | Customize thumbnails for video posts (including Reels) | 619 | Exploring |
| 2 | Aggregated post analytics across all channels | 387 | Beta |
| 3 | Automatically reuse a past Post / recurring Posts | 383 | Beta |
| 4 | Substack | 333 | New |
| 5 | Publish instagram Post with multiple videos | 323 | Someday |
| 6 | Automatically resize and crop large images & videos per network | 259 | Planned |
| 7 | Plan/Schedule Ideas on the Calendar | 234 | Planned |
| 8 | Notes or blocks on the calendar | 215 | Planned |
| 9 | Distinct workspaces for clients and brands | 173 | Planned |
| 10 | Support for rich text in posts (bold, italic, etc.) | 171 | Exploring |
| 11 | Support collaborators on Instagram posts & reels | 157 | New |
| 12 | Account-wide Search for Posts, Drafts & Ideas | 155 | Planned |
| 13 | Digital messaging and direct message support | 140 | New |
| 14 | Schedule long Youtube video | 130 | Someday |
| 15 | Schedule and Publish via API | 128 | Beta |
