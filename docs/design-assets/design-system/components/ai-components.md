# SocialBeam — AI Component Specs (10.74–10.80)

> **Version**: 1.0.0
> **Date**: 2026-05-17
> **Status**: Research-aligned — all components reflect 2026 user behavior findings
>
> These seven components define the visual language of AI interaction in SocialBeam. Every AI surface must use one or more of these components. They implement the "AI as collaborator, not black box" design principle (DESIGN.md Section 1, Principle 3).

---

## Research Foundation

All components are designed around these 2026 user behavior findings:

| Finding | Source | Component Impact |
|---------|--------|-----------------|
| 78.4% of users apply moderate or extensive editing to AI content before publishing | Sociality.io (Jan 2026) | Edit is the primary action, not approve. Components must surface edit affordances first. |
| Only 27% trust in fully autonomous AI agents (down from 43%) | PostPlanify (2026) | Autonomy Dial defaults to "Suggestions only." Full auto requires explicit two-step opt-in. |
| 66% say human oversight remains essential for autonomous AI | EY Survey (2025) | Escalation Pathway and Intent Preview are mandatory for multi-step AI actions. |
| 61.1% cite originality/plagiarism as top AI concern | Sociality.io (Jan 2026) | AI Agent Timeline must show content source attribution. |
| 50% of Gen Z unfollowed/blocked accounts they believed used AI content | PostPlanify (2026) | AI Disclosure Badge component added (10.81). |
| Categorical confidence labels increase trust vs. raw percentages | Goji Labs (Feb 2026) | Confidence Badge uses High/Medium/Low, never numeric scores. |

---

## 10.74 AI Agent Timeline

**Purpose**: Show what the AI is doing in real time during multi-step operations (content generation, repurposing, batch scheduling).

**Core rule**: Never use a plain spinner for AI operations. Always show stages.

### Anatomy

```
┌──────────────────────────────────────────────┐
| [AI icon] Content Generation                  |
|                                               |
| ✓ Analyzed your top 12 posts from last 30d   |
| ✓ Identified 3 high-engagement patterns       |
| > Drafting 5 Instagram posts... (3/5)         |
|   [progress bar: 60% filled]                  |
| ○ Optimizing posting times                     |
|                                               |
| [Undo]  [Minimize]                            |
└──────────────────────────────────────────────┘
```

### States

| State | Visual | Description |
|-------|--------|-------------|
| **Pending** | Empty circle (○) | Step queued, not yet started |
| **Active** | Spinning circle (◉) + progress text | Step in progress with count (e.g., "3/5") |
| **Complete** | Checkmark (✓) | Step finished, expandable for detail |
| **Failed** | Alert icon (⚠) + error text | Step failed, retry available |

### Tokens

- Background: `bg-ai-surface` (light card on dark mode to create visual "AI zone")
- Active icon: `text-brand-500` (pulsing animation)
- Complete icon: `text-success-500`
- Failed icon: `text-error-500`
- Progress bar: `bg-brand-500` on `bg-brand-100`
- Text: `text-foreground` for labels, `text-muted-foreground` for descriptions

### Behavior

- Steps appear in order; no reordering
- Completed steps are expandable: click to see reasoning ("Analyzed your top 12 posts" → "Posts ranked by engagement: Post A (342 likes), Post B (289 likes)...")
- Active step shows real-time count ("3/5 complete")
- Undo button available on completed steps if action is reversible (within 15-minute window, no platform API call made)
- On mobile: collapsible to a single line with progress bar + "Tap to expand"

### Research Alignment

Following the "wall of logs" anti-pattern (AgentMarketCap, April 2026), timeline steps are **concise, action-oriented, and skimmable** — each line reads like a Slack update from a colleague, not a system log. Platform constraints are narrated: *"Instagram allows 50 posts/day — I've distributed these across 5 days."*

---

## 10.75 Conversational Input

**Purpose**: Natural language interface for AI content generation. Replaces form-based compose.

### Anatomy

```
┌──────────────────────────────────────────────┐
| [AI icon] What do you want to post about?     |
| ┌──────────────────────────────────────────┐ |
| │ > Announcing our new feature: dark mode   │ |
| │                                          │ |
| │ [Topic] [URL] [Brief] [Image] [Repurpose]│ |
| └──────────────────────────────────────────┘ |
|                                              |
| [Generate]                                    |
└──────────────────────────────────────────────┘
```

### Input Modes

| Mode | User Action | AI Behavior |
|------|-------------|-------------|
| **Topic** | Type a topic phrase | Generates post drafts for selected platforms |
| **URL** | Paste a URL | Summarizes content into platform-appropriate posts |
| **Brief** | Type instructions | Generates posts following constraints |
| **Image** | Upload an image | Generates caption + alt-text |
| **Repurpose** | Select existing post + target platforms | Adapts content for new platforms |

### Tokens

- Input background: `bg-card`
- Input border: `border-input`
- Focus border: `border-ring` (ring offset: `ring-offset-background`)
- Mode pills: `bg-muted` (inactive), `bg-brand-100 text-brand-700` (active)
- Generate button: `bg-brand-500 text-white`

### Behavior

- **Multimodal handoff** (Mantlr Pattern 9, 2026): User can switch between input modes without losing context. Platform selections, media uploads, and tone preferences persist across mode changes.
- **Autocomplete**: As the user types, AI suggests completions (faded text in input field)
- **Enter to submit**: Cmd/Ctrl+Enter triggers generation
- **Platform selector**: Appears below input after user enters text, with platform brand-colored badges

### Research Alignment

Following the finding that 78.4% of users heavily edit AI output (Sociality.io, Jan 2026), the conversational input includes a subtle note below the generate button: *"You'll be able to edit each draft before publishing."* This sets expectations that AI output is a starting point, not a final product.

---

## 10.76 Confidence Badge

**Purpose**: Display AI confidence level on generated content. Never show raw percentages — use categorical labels.

### Anatomy

```
[● High Confidence] [▼]
```

Expanded (on click):
```
┌──────────────────────────────────────────────┐
| High Confidence — matches your voice          |
|                                               |
| Brand voice match: 87%                        |
| Platform compliance: ✓ All checks passed      |
| Historical prediction: Above average          |
|                                               |
| Checks run: character limits ✓, media format  |
| ✓, hashtag count ✓, ToS compliance ✓          |
└──────────────────────────────────────────────┘
```

### Levels

| Level | Color | Icon | Display Text | Trigger Condition |
|-------|-------|------|-------------|-------------------|
| **High** | `text-success-500` / `bg-success-50` | Filled circle | "Ready to publish — matches your brand voice" | Brand voice match > 80%, platform compliant, historical data available |
| **Medium** | `text-warning-500` / `bg-warning-50` | Half circle | "Ready, but training on your voice will improve results" | Brand voice not trained OR limited historical data |
| **Low** | `text-error-500` / `bg-error-50` | Exclamation | "Review recommended — possible issues detected" | Platform constraint risk, brand voice unknown, or safety filter flag |

### Tokens

- Badge bg: `bg-ai-confidence-high` / `bg-ai-confidence-medium` / `bg-ai-confidence-low`
- Badge text: `text-ai-confidence-high-foreground` etc.
- Icon: inherits text color from level

### Behavior

- Click badge to expand progressive disclosure (summary → detail → raw data)
- Low confidence triggers Escalation Pathway (10.80) — options presented, not a block
- For free-tier users (no brand voice): always shows Medium with upgrade note

### Research Alignment

Goji Labs (Feb 2026) found 58% of users who distrust AI report increased trust when uncertainty is visualized. Raw percentage scores cause users to either over-trust or distrust. Categorical labels (High/Medium/Low) are interpretable and don't invite false precision.

---

## 10.77 Intent Preview

**Purpose**: Show what the AI will do before executing multi-step actions. Summary + approve/reject/edit.

### Anatomy

```
┌──────────────────────────────────────────────┐
| [AI icon] AI Action Preview                   |
|                                               |
| I'll create 5 Instagram posts about dark      |
| mode and schedule them this week:             |
|                                               |
| • Mon 9:00 AM — "Introducing dark mode..."   |
| • Tue 10:30 AM — "Why dark mode matters..."   |
| • Wed 9:00 AM — "Behind the scenes..."        |
| • Thu 11:00 AM — "Your feedback on..."        |
| • Fri 9:00 AM — "Dark mode tips you need..."  |
|                                               |
| Credits: 5 | Estimated engagement: Medium     |
|                                               |
| [Edit All]  [Generate & Schedule]  [Cancel]   |
└──────────────────────────────────────────────┘
```

### Tokens

- Panel background: `bg-ai-surface`
- Header: `text-foreground font-semibold`
- Preview items: `text-muted-foreground`
- Credit cost: `text-brand-500 font-medium`
- Actions: primary `bg-brand-500`, secondary `bg-muted`, cancel `text-muted-foreground`

### Behavior

- Shown before any bulk action (>3 posts), cross-platform publishing, or content repurposing
- User can click any preview item to edit before confirming
- "Edit All" opens inline batch editor
- "Generate & Schedule" executes the plan
- "Cancel" dismisses without action

### Research Alignment

Following the tiered approval framework (Smashing Magazine, Feb 2026), Intent Preview is the **hard gate** for irreversible or high-impact actions. For reversible actions, a soft gate (notification with cancel) is used instead.

---

## 10.78 Autonomy Dial

**Purpose**: Let users control how much AI can do without approval. Per-workspace, per-task configuration.

### Anatomy

```
┌──────────────────────────────────────────────┐
| AI Autonomy Level                             |
|                                               |
| ○ Suggestions only    ← Default (recommended) |
| ○ Review before publish                       |
| ○ Full auto (explicit opt-in required)        |
|                                               |
| ──────────────────────────────────────────    |
| ⚠️ Only 13% of social media marketers use     |
| autonomous AI agents. Most start with          |
| suggestions and work up. You can change       |
| this anytime.                                  |
|                                               |
| [Confirm Level]                                |
└──────────────────────────────────────────────┘
```

### Levels

| Level | AI Behavior | Gate | Research Rationale |
|-------|-------------|------|-------------------|
| **Suggestions only** (default) | AI proposes content and times, user executes manually | No gate | 78.4% of users edit AI content heavily; this level maximizes human control |
| **Review before publish** | AI generates and schedules, user approves batches | Soft gate (5-second cancel window) | For trusted workflows where user reviews before going live |
| **Full auto** (explicit opt-in) | AI publishes within defined bounds | Two-step confirmation: "You're about to let the AI publish autonomously..." | Only 27% trust autonomous AI; friction prevents accidental activation |

### Tokens

- Selected option: `bg-brand-50 border-brand-500`
- Warning text: `text-muted-foreground text-xs`
- Warning icon: `text-warning-500`

### Behavior

- Default: "Suggestions only" — research-aligned
- Changing to "Full auto" triggers a two-step confirmation modal with trust-building copy
- Level is shown in the top bar AI status indicator
- Can be changed anytime in Settings → AI → Guardrails

### Research Alignment

PostPlanify (2026): Trust in fully autonomous AI fell from 43% to 27% year-over-year. EY Survey (2025): 66% say human oversight remains essential. Only 13% of marketers use agentic AI. The default-off design reflects this reality.

---

## 10.79 Action Audit Log

**Purpose**: Transparent record of all AI actions with one-click undo for reversible actions.

### Anatomy

```
┌──────────────────────────────────────────────┐
| AI Activity Log                               |
|                                               |
| Today                                         |
| 2:30 PM  Generated 5 IG posts    ✓  [Undo]   |
| 2:28 PM  Analyzed top 12 posts    ✓          |
| 1:15 PM  Rescheduled post #4321   ✓  [Undo]  |
|                                               |
| Yesterday                                     |
| 4:00 PM  Generated weekly plan    ✓  [Undo]   |
| 3:55 PM  Researched trends        ✓          |
|                                               |
| [Filter: All ▼] [Export]                       |
└──────────────────────────────────────────────┘
```

### Reversibility Indicators

| Reversibility | Undo Available | Notes |
|--------------|----------------|-------|
| **Cleanly reversible** | [Undo] button, 15-minute window | Draft created, post scheduled in Bull queue, hashtag suggestion applied |
| **Compensable with residue** | [Undo] with warning | Post published — can delete but engagement data lost. Shows: *"Undo will delete the post. Engagement data cannot be recovered."* |
| **Non-reversible** | No undo button | Post deleted — cannot recover. Shows: *"This action cannot be undone."* |

### Tokens

- Timestamp: `text-muted-foreground text-xs`
- Action text: `text-foreground text-sm`
- Status icon: `text-success-500` (complete), `text-error-500` (failed)
- Undo button: `text-brand-500 underline`

### Behavior

- Accessible via Settings → AI → Activity Log or Cmd+Shift+R
- Filterable by platform, action type, date range, reversibility status
- For X/Twitter operations, shows API cost: *"3 tweet reads ($0.015), 2 tweet creates ($0.02). Total: $0.035."*
- Export available as CSV for compliance and audit requirements

---

## 10.80 Escalation Pathway

**Purpose**: When AI hits low confidence or encounters a platform constraint, present options — not blockers.

### Anatomy

```
┌──────────────────────────────────────────────┐
| ⚠️ Review Recommended                        |
|                                               |
| This image format may not be supported by     |
| Instagram. AI detected a potential issue.     |
|                                               |
| What would you like to do?                    |
|                                               |
| [Convert to MP4]  [Choose different image]    |
| [Publish anyway]  [Cancel]                    |
|                                               |
| [Why is this flagged?] (expandable)           |
└──────────────────────────────────────────────┘
```

### Tokens

- Panel background: `bg-warning-50` (light), `bg-warning-100/50` (dark)
- Border: `border-warning-200`
- Header icon: `text-warning-500`
- Primary actions: `bg-brand-500`
- Secondary actions: `bg-muted`
- Expandable text: `text-muted-foreground text-xs`

### Behavior

- Triggered by: Low confidence, platform constraint risk, safety filter flag
- Never blocks — always presents options (design system principle 10.80)
- "Why is this flagged?" expands to show: which check failed, what the AI detected, what the platform requires
- Each option includes a brief description of consequences

### Research Alignment

Following the service recovery paradox (Mantlr Pattern 6, 2026): well-handled errors build more trust than no errors. When AI fails, it must acknowledge clearly, explain in plain language, offer to fix, and learn from the correction.

---

## 10.81 AI Disclosure Badge (NEW — Research Addition)

**Purpose**: Visually distinguish AI-generated content from human-authored content, with user-configurable audience visibility.

### Anatomy

```
[AI icon] AI-assisted [▼]
```

Expanded:
```
┌──────────────────────────────────────────────┐
| AI Disclosure                                |
|                                               |
| This post was AI-assisted and human-edited.   |
|                                               |
| Audience visibility: Hidden (default)         |
| [Configure disclosure settings →]             |
└──────────────────────────────────────────────┘
```

### Variants

| Variant | Use Case | Display |
|---------|----------|---------|
| **AI-assisted** | AI generated, human edited (78.4% of cases) | `[AI] AI-assisted` — neutral tone |
| **AI-generated** | AI generated, not yet edited | `[AI] AI-generated` — amber tint |
| **Human-authored** | Written without AI | No badge |

### Tokens

- Badge: `bg-ai-surface text-muted-foreground text-xs`
- AI icon: `text-brand-400`
- Amber variant: `bg-warning-50 text-warning-700`

### Behavior

- Internal workflow only by default — not shown to end audiences
- User configures per-platform disclosure in Settings → AI → Transparency (Flow 7.9)
- Platform-enforced disclosure (TikTok, X/Twitter) cannot be disabled
- 50% of Gen Z unfollow accounts they believe used AI content (PostPlanify, 2026) — hence hidden by default

---

## Component Usage Matrix

| Flow | Components Used |
|------|----------------|
| 3.1 AI Compose | 10.75 (Input), 10.76 (Confidence), 10.80 (Escalation), 10.81 (Disclosure) |
| 3.4 Scheduling | 10.77 (Intent Preview), 10.78 (Autonomy Dial), 10.80 (Escalation) |
| 3.11 Repurposing | 10.74 (Timeline), 10.76 (Confidence), 10.77 (Intent Preview) |
| 4.7 Weekly Plan | 10.74 (Timeline), 10.77 (Intent Preview), 10.79 (Audit Log) |
| 9.2 Agent Panel | 10.74 (Timeline), 10.79 (Audit Log), 10.78 (Autonomy Dial) |
| 13.1 Agent Command | 10.74 (Timeline), 10.77 (Intent Preview), 10.79 (Audit Log) |
| 13.2 Autopilot | 10.78 (Autonomy Dial), 10.79 (Audit Log), 10.80 (Escalation) |
| 13.4 Content Review | 10.76 (Confidence), 10.81 (Disclosure) |
| 14.5 Action Risk | 10.79 (Audit Log), 10.80 (Escalation) |

---

*Document Version: 1.0.0*
*Last Updated: 2026-05-17*
*Research Baseline: Sociality.io 2026, PostPlanify 2026, Goji Labs 2026, EY Survey 2025, Mantlr 2026*