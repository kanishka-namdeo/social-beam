# Flow 3.1 — Post Creation & Ideation

**Priority**: P0
**Last Updated**: 2026-05-21
**Screenshot Count**: 8 screenshots

## Overview
Documents the post creation workflow from ideation through draft completion. Covers the compose interface, multi-platform targeting, media attachment, and AI-assisted content generation.

## Entry Point
- **URL**: `https://buffer.com/compose` or `/publish?mode=new`
- **Prerequisite**: User must be logged in with at least one connected channel

## User Journey

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User clicks "Create Post" from dashboard or navigation | Compose modal or page opens with blank post form | `01-compose-blank.png` |
| 2 | User selects target platforms (Instagram, Threads, Bluesky) | Platform-specific format hints and character limits shown | `02-platform-select.png` |
| 3 | User enters post text content | Character counter updates, platform previews render live | `03-compose-interface.png` |
| 4 | User attaches media (image/video) | Media preview displays, platform-specific crop hints shown | `04-media-attach.png` |
| 5 | User customizes per-platform variations (optional) | Platform tabs show unique content per channel | `05-platform-variations.png` |
| 6 | User saves as draft or proceeds to schedule | Post saved, success toast shown, redirected to queue or compose list | `06-draft-saved.png` |

### AI Assistant Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User clicks "AI Assist" or "Generate Ideas" | AI suggestion panel opens alongside compose area | `07-ai-panel-open.png` |
| 2 | User provides topic or prompt | AI generates multiple post variations | `08-ai-generating.png` |
| 3 | User selects or edits a suggestion | Selected text populates compose area | `09-ai-inserted.png` |

### Ideas Tab Sub-Flow

| Step | Action | Expected Result | Screenshot |
|------|--------|-----------------|------------|
| 1 | User navigates to Create > Ideas | Ideas board displays saved and AI-generated concepts | `10-ideas-board.png` |
| 2 | User navigates to Create > Templates | Templates tab opens with pre-built content templates categorized by platform and use case | `04-templates.png` |
| 3 | User creates new idea or saves inspiration | Idea card added to board with timestamp | `11-new-idea.png` |
| 4 | User converts idea to post | Compose page opens with idea text pre-filled | `12-idea-to-post.png` |

## Key States

### Empty State
**When**: Compose page opened with no content entered
**Behavior**: Placeholder text "What's on your mind?" in compose area. Platform selection chips visible with connected channels pre-selected. Media drop zone shows upload icon.
**Screenshot**: `shared/04-empty-state.png`

### Draft State
**When**: User clicks "Save Draft" or navigates away with unsaved content
**Behavior**: Auto-save triggers after 3 seconds of inactivity. Draft appears in Drafts tab. Toast confirmation: "Draft saved".

### Error State
**When**: Media upload fails or character limit exceeded
**Behavior**: Inline error on media card ("Upload failed, try again"). Character counter turns red when limit exceeded with platform-specific limit shown. Submit button disabled until resolved.

### Character Limits by Platform

| Platform | Limit | Counter Behavior |
|----------|-------|------------------|
| Instagram (caption) | 2,200 chars | Warning at 2,000, error at 2,200 |
| Threads | 500 chars | Warning at 450, error at 500 |
| Bluesky | 300 chars | Warning at 270, error at 300 |
| LinkedIn | 3,000 chars | Warning at 2,800, error at 3,000 |

## Navigation
- **Access**: Dashboard "Create Post" button, Create > Ideation tab, or Convert from Ideas
- **Related Flows**:
  - Flow 4.1 — Scheduling & Publishing (next step after draft)
  - Flow 2.1 — Dashboard & Home (entry point)
  - Flow 6.1 — Calendar & Queue (post destination)

## Platform-Specific Requirements

### Instagram
- Supports: Image, Video, Carousel (multi-image), Reels
- First comment option for hashtags
- Location tagging available
- Alt text for accessibility

### Threads
- Text-first, supports images and short videos
- No hashtag recommendations
- Link previews auto-generated

### Bluesky
- Text-only with optional image attachment
- Link cards auto-generated
- No video support
