# SocialBeam — AI-Native User Flows (Evaluation & Redesign)

> Version 2.0 — May 2026
>
> This document evaluates the existing MVP user flows against an AI-native architecture and presents a redesigned flow set that makes AI the default operating mode, not an optional add-on. The analysis draws on 2026 competitive research (Buffer AI, Hootsuite OwlyWriter, Sprout Social AI Assist, Later, SocialRails) and agentic social media management patterns (Conbersa, Allen Institute AI agent research, MIT Sloan AI in marketing operations).

---

## Research Summary

**Agentic Social Media Management (2026)**:
- AI agents now operate at three maturity levels: Level 1 (Scheduling), Level 2 (AI Creation), Level 3 (Autonomous Engagement). Source: [Digital Applied — Social Media AI Scheduling Tools Comparison 2026](https://www.digitalapplied.com/blog/social-media-ai-scheduling-tools-comparison-2026/) (Jan 2026)
- Style-matching AI (trained on brand voice) is the winning pattern; generic AI captions are failing. Source: [PostNext Blog — PostNext vs AI Scheduling Tools 2026](https://postnext.io/blog/postnext-vs-ai-scheduling-tools-comparison-2026/) (May 2026)
- AI agents use hybrid perception: API + screen/vision models for platform operations. Source: [Conbersa — AI Agents for Social Media](https://www.conbersa.ai/learn/ai-agents-for-social-media) (2026)
- AI-optimized posting times improve engagement ~5-10% vs manual scheduling. Source: Digital Applied (Jan 2026)

**Competitive Landscape**:
- Buffer: AI Assistant in composer, optimal timing, $6/mo/channel. Targets solopreneurs.
- Hootsuite: OwlyWriter AI, URL-to-content, repurposing, unified inbox AI. $99/mo.
- Sprout Social: AI Assist for content + responses, sentiment analysis, competitor benchmarking. $199/mo.
- SocialRails: GPT-5 image gen, unlimited captions, auto-platform optimization. ~$6/ch.

---

## Research Validation & Evidence Base

This section maps each AI-native flow to the 2025-2026 user behavior research that validates or challenges it. Confidence levels: **Validated** (supported by multiple studies), **Partially Validated** (supported with caveats), **Assumed** (logical but not empirically confirmed).

### User Behavior Reality Check

| Research Finding | Source | Impact on This Document |
|------------------|--------|------------------------|
| 89.7% of marketers use AI weekly; 64.1% daily | [Sociality.io 2026 AI in SMM Report](https://sociality.io/blog/ai-in-social-media-marketing-report/) (Jan 2026) | Validates AI-native positioning; AI is mainstream, not niche |
| Trust in fully autonomous AI agents fell from 43% to 27% (2024-2025) | [PostPlanify AI Stats 2026](https://postplanify.com/blog/ai-in-social-media-statistics-2026) | **Challenges Flow 13.2** — Autopilot default must be "off", not "on" |
| 78.4% apply moderate or extensive editing to AI content before publishing | Sociality.io (Jan 2026) | **Challenges "Approve All" patterns** in flows 3.1, 13.4 — edit-first UX required |
| Only 13% of marketers currently use agentic AI | PostPlanify (2026) | Autonomous flows (13.x) are future-facing; must default to human-in-the-loop |
| 59.5% use AI for content ideation & trend research (tied #1 use case) | Sociality.io (Jan 2026) | **Missing flow** — ideation/research must be promoted from Post-MVP to MVP |
| 59.5% use AI for analytics & reporting (tied #1 use case) | Sociality.io (Jan 2026) | Validates flows 5.1, 5.2, 5.5, 5.6 |
| 66% say human oversight remains essential for autonomous AI | EY Survey via [PRNewswire](https://www.prnewswire.co.uk/news-releases/ey-survey-autonomous-ai-is-no-longer-theoretical-as-adoption-grows-despite-ongoing-trust-concerns-302726556.html) (2025) | Validates human-in-the-loop (14.4); challenges full autonomy |
| AI increases engagement volume but decreases perceived quality/authenticity | [Møller et al., Scientific Reports (2026)](https://doi.org/10.1038/s41598-026-40110-8) | Users describe AI content as "robotic" and "generic" — validates brand voice (1.6) as critical |
| 50% of Gen Z unfollowed/blocked accounts they believed used AI content | PostPlanify (2026) | **Missing flow** — AI disclosure/transparency settings needed (new Flow 7.9) |
| 61.1% cite originality/plagiarism as top AI concern | Sociality.io (Jan 2026) | Validates safety filters (14.1); challenges fully autonomous generation |
| 52% rely solely on free AI tools; 62% won't increase AI budgets | Sociality.io (Jan 2026) | **Challenges credit pricing** (7.8) — credit model friction is real; free revisions needed |
| Agencies represent 59% of survey respondents | Sociality.io (Jan 2026) | **Persona gap** — Priya (agency) should be primary, not tertiary |
| 30.8% use 1 AI tool type; 41% use 2; 12.8% use 5 | Sociality.io (Jan 2026) | Users expect multi-tool workflows; SocialBeam must integrate, not replace |

### Flow-Level Confidence Assessment

| Flow | Confidence | Research Evidence | Notes |
|------|-----------|-------------------|-------|
| 1.4 Goal-First Onboarding | Validated | UX Collective (May 2026) — 70% drop-off when users "think" before "do" | Strong behavioral support |
| 1.6 Brand Voice Setup | Validated | Sociality.io: 30.6% cite brand voice consistency as concern; Scientific Reports: AI content perceived as "generic" | Top differentiator; critical for quality |
| 3.1 AI Compose | Partially Validated | 78.4% edit heavily (Sociality.io); 61.1% worry about originality | "Approve All" is anti-pattern; edit-first required |
| 3.3 Confidence Signals | Validated | Goji Labs (Feb 2026) — categorical labels increase trust vs. raw percentages | Well-supported |
| 3.4 Tiered Approval Gates | Validated | Smashing Magazine (Feb 2026), AgentMarketCap (April 2026) — risk-based gating | Industry-standard pattern |
| 3.11 Content Repurposing | Partially Validated | 59.5% ideation use case (Sociality.io); but Lately reports 3x output with brand voice | Requires batch-edit, not batch-approve |
| 4.7 AI Weekly Content Plan | Partially Validated | AI-optimized timing: 5-10% lift (Digital Applied, Jan 2026) | Valid for timing; plan quality depends on brand voice |
| 5.1-5.6 AI Analytics | Validated | 59.5% use AI for analytics (Sociality.io); Sprout Social AI Assist validated | High confidence |
| 7.8 Credit System | Assumed | User frustration with credit-for-revisions (Sociality.io respondent quote) | Needs free revision exemption |
| 9.2 Agent Panel | Partially Validated | AgentMarketCap progress feed pattern (April 2026); but only 13% use agentic AI | Progress feed validated; autonomy level overstated |
| 12.2 Empty State Framework | Validated | UX Collective (May 2026) — four-property framework | Strong support |
| 13.1 Agent Command Execution | Partially Validated | 64.1% daily AI use (Sociality.io); but as copilot, not autonomous | Valid as command interface; scope limited |
| 13.2 Autonomous Scheduling | **Low Confidence** | 27% trust in autonomous agents (PostPlanify); 66% demand human oversight | Default must be "off"; explicit opt-in required |
| 13.4 Content Review Queue | Partially Validated | 78.4% edit heavily (Sociality.io) | "Approve All" must become "Review & Edit All" |
| 14.1 Safety Filters | Validated | OWASP Top 10 for LLM (2025); 50% accuracy concern (Sociality.io) | Industry requirement |
| 14.4 Human-in-the-Loop | Validated | 66% demand oversight (EY Survey); 78.4% edit AI content | Core requirement |
| 14.6 Error Recovery | Validated | Mantlr Pattern 6 (2026); service recovery paradox | Well-supported |

### Gaps Identified

1. **Missing Flow 3.13 (AI Content Research & Ideation)**: 59.5% use AI for ideation — currently Post-MVP only (15.2 social listening)
2. **Missing Flow 1.7 (Target Audience Definition)**: Required for quality AI output; no flow defines audience before generation
3. **Missing Flow 7.9 (AI Transparency & Disclosure)**: 50% Gen Z unfollow AI accounts; 19.4% cite disclosure concern
4. **Persona weighting incorrect**: Agency (59%) treated as tertiary; solopreneur (5.1%) over-weighted
5. **Credit system friction**: Users frustrated by paying for revisions; needs free regeneration policy
6. **Section numbering**: Sections 14, 15, 16 are now correctly ordered (Decision Framework at 15, Post-MVP at 16 with proper 16.x sub-headings)

---

## Evaluation: How the Current User Flows Fail as AI-Native

### Critical Failures

The current `user-flows.md` is a **tool-mode document** — it describes a world where the user clicks through forms, manually composes text, manually picks dates, and manually checks analytics. AI appears only in Section 13 (Post-MVP) as a list of bullet points. This is the architecture of 2020 social media tools with AI bolted on. An AI-native app inverts this: AI is the default, and manual control is the escape hatch.

#### 1. No AI Agent Interaction Flows

**Current state**: Zero flows for AI agent interaction. The command palette (Section 9) is a search-and-navigate tool, not an agent interface.

**Why this matters**: In 2026, AI-native tools let users issue natural-language commands like *"Write a week of Instagram posts about our new product launch, schedule them for mornings, and adapt each for LinkedIn too."* The current design requires 14+ manual steps per post. An AI agent can execute this in one interaction.

**Required new flows**: AI agent command flow, multi-post batch generation, autonomous scheduling suggestions, content repurposing pipelines.

#### 2. Compose Flow Assumes Blank Page Problem

**Current state (3.1)**: User opens compose form, manually types text, manually uploads media, manually selects platforms, manually clicks publish.

**Why this fails**: The blank page problem is the #1 friction point in content creation. Buffer's AI Assistant solves this by generating caption variations from a topic or URL. Hootsuite OwlyWriter can summarize articles into shareable posts. SocialBeam's current flow has no AI content generation at all.

**Required redesign**: Compose becomes "AI-first" — user provides a topic/URL/image/brief, AI generates platform-adapted drafts, user reviews and edits. The manual compose form becomes the fallback, not the primary path.

#### 3. No Brand Voice or Style-Matching Flow

**Current state**: Zero flows for brand voice training, style examples, or tone configuration.

**Why this fails**: Research shows "Style-Matching AI, not generic captions" is the 2026 differentiator. Tools that produce generic "Here is a great post!" copy are failing. Users need to upload brand guidelines, past posts, and tone samples to train AI output quality.

**Required new flow**: Brand Voice Setup, voice training from past posts, tone presets, voice-per-workspace configuration.

#### 4. Scheduling Flow Has No AI Optimization

**Current state (4.x)**: User manually picks dates/times from calendar widgets. AI "best time to post" is listed as Post-MVP (13.1).

**Why this fails**: AI-optimized timing improves engagement 5-10% and is table stakes in 2026. Buffer's timing feature learns from historical engagement data. SocialBeam's manual picker puts the cognitive load on the user for a problem AI solves better.

**Required redesign**: Scheduling gets AI-suggested time slots per platform, with one-click "accept all suggestions" or manual override.

#### 5. Analytics Flow Has No AI Insights

**Current state (5.x)**: User views metric cards and post-level analytics. No AI interpretation, no predictive analytics, no automated insights.

**Why this fails**: Sprout Social's AI generates executive-ready presentations automatically. Predictive analytics (engagement estimation before posting) is the cutting edge. Current flows are passive data display.

**Required new flow**: AI insights engine ("Your TikTok engagement dropped 23% this week — likely cause: posting time shifted from 6pm to 2pm"), predictive engagement scoring, automated report generation.

#### 6. Error States Have No AI Resolution

**Current state (12.x)**: Failed posts show error messages; user manually retries. No AI diagnosis or suggested fixes.

**Why this matters**: An AI-native app should diagnose publish failures ("Failed because Instagram rejected the media format — here's how to fix it: convert to MP4 H.264") and offer one-click remediation.

#### 7. Empty States Lack AI Onboarding

**Current state (12.18)**: Empty states show icon + title + CTA button.

**Why this fails**: AI-native tools use empty states as agent activation points. Instead of "No posts yet" + "Create your first post", it should say "No posts yet" + "Tell me what you'd like to post about and I'll create your first week" — with an input field right there.

### Moderate Failures

#### 8. Media Library Has No AI Enhancement

No flow for AI image generation, auto-cropping for platform aspect ratios, thumbnail optimization, or AI alt-text generation.

#### 9. Calendar Has No AI Content Gaps

The calendar shows what's scheduled but doesn't tell you *"you have 3 open slots this week — want me to fill them?"* Content gap analysis is Post-MVP only.

#### 10. Command Palette Is Not an Agent Interface

Cmd+K currently navigates pages and executes commands. In an AI-native app, Cmd+K (or a dedicated agent panel) accepts natural language: *"Show me last week's best-performing post and write 3 variations for next week."*

#### 11. No Approval Workflow for AI-Generated Content

When AI generates posts, there should be a review/approval flow. AI drafts should be visually distinct from human drafts, with clear "AI-generated" badges and one-click approve/edit/regenerate actions.

#### 12. No Multi-Platform Adaptation Flow

Flow 3.1 shows manual platform selection with warnings about platform constraints. An AI-native app should auto-adapt content: one source → N platform-specific variants with correct character limits, hashtag counts, and formatting.

---

## Redesigned AI-Native User Flows

Below is the revised user flows document with AI-native flows integrated. New flows are marked with [AI-NATIVE], redesigned flows are marked with [AI-REDESIGNED], and unchanged MVP flows retain their original numbering.

### Flow Numbering Convention

- **1.x**: Authentication & Onboarding (new: 1.6 AI Brand Voice Setup, 1.7 Target Audience Definition)
- **2.x**: Social Platform Management (unchanged)
- **3.x**: Post Creation & Publishing (heavily redesigned; new: 3.13 AI Content Research & Ideation)
- **4.x**: Scheduling & Calendar (AI-optimized)
- **5.x**: Analytics & Reporting (AI insights added)
- **6.x**: Dashboard & Home (AI agent presence)
- **7.x**: Settings & Configuration (AI preferences; new: 7.9 Transparency & Disclosure)
- **8.x**: Media Library (AI enhancement)
- **9.x**: Command Palette / Agent Panel (redesigned as agent interface)
- **10.x**: Navigation & App Shell (AI status indicators)
- **11.x**: Notifications & Alerts (AI alerts)
- **12.x**: Error & Edge Cases (AI resolution)
- **13.x**: AI Agent Flows (new section — moved from 14.x for correct ordering)
- **14.x**: AI Governance & Safety (new section — moved from 15.x for correct ordering)
- **15.x**: Decision Framework (moved from 16.x for correct ordering)
- **16.x**: Post-MVP Flows (updated — moved from 15.x for correct ordering)
- **16.x**: Decision Framework
- **17.x**: Post-MVP Flows (Updated) — moved after Decision Framework for correct ordering

---

## Breaking Changes & Migrations

**From tool-mode to AI-native**: The fundamental shift is that AI moves from "optional feature in settings" to "default operating mode." This requires:

1. **Compose flow rewrite**: Manual compose becomes a fallback; AI compose becomes the primary path
2. **New agent infrastructure**: LangGraph agent graphs for content generation, scheduling optimization, and analytics insights
3. **Brand voice system**: New data model for storing brand voice profiles per workspace
4. **AI status indicators**: UI must show when content is AI-generated, AI-reviewed, or human-authored
5. **Approval workflows**: AI-generated content needs review gates before publishing

---

## Security Considerations

**AI-generated content risks**:
- AI may generate content that violates platform ToS (e.g., copyrighted material, policy-violating claims). All AI output must pass through content safety filters before queuing.
- Brand voice training data may contain sensitive business information. Voice profiles must be encrypted at rest and scoped to workspace boundaries.
- AI agent actions on social platforms must respect rate limits and automation policies to avoid account bans. Agent action logging is mandatory for audit trails.
- User prompts to AI agents should not be stored in plaintext if they contain PII or business secrets.

**Source**: OWASP Top 10 for LLM Applications (2025), Conbersa AI agent constraints research (2026).

---

## 1. Authentication & Onboarding

### 1.1 Sign Up
*(unchanged)*

### 1.2 Log In
*(unchanged)*

### 1.3 Sign Out [IMPLEMENTED]

**Trigger**: User clicks avatar (desktop) or hamburger menu (mobile) → selects "Sign Out".

**Desktop Flow**:
1. User clicks their avatar (initial button) in the top-right header
2. DropdownMenu opens showing:
   - User name (truncated if long)
   - User email (truncated if long, muted text)
   - Separator
   - "Sign Out" button (destructive variant, with SignOut icon)
3. User clicks "Sign Out"
4. `signOut({ callbackUrl: '/login' })` from `next-auth/react` is called
5. NextAuth clears the session cookie and redirects to `/login`
6. Proxy detects no session on `/login` and passes through (correct behavior)
7. If user tries to navigate to `/dashboard` after logout, proxy redirects back to `/login`

**Mobile Flow**:
1. User taps hamburger icon (List icon) to open Sheet
2. Sheet slides in from left showing nav items
3. Separator appears below nav items
4. Bottom bar shows user name (left) and "Sign Out" button (right, destructive styling)
5. User taps "Sign Out"
6. Same signOut call and redirect as desktop flow

**Security**:
- Hardcoded `callbackUrl: '/login'` — no user-controlled redirect URLs (prevents open redirect)
- JWT cookie cleared by NextAuth's signOut handler
- No sensitive data stored in JWT (only `id` and `workspaceId`)
- Post-logout, protected routes are enforced by proxy redirect

**Error States**:
- Network failure during signOut: user remains on page, no forced redirect
- Session already expired: signOut still clears cookie and redirects

**Component**: `components/dashboard/user-menu.tsx` (desktop), `components/dashboard/mobile-menu.tsx` (mobile)

### 1.4 First-Run Onboarding — Goal-First [AI-REDESIGNED]

The onboarding is redesigned as a goal-first flow following Mantlr's Goal-First Onboarding pattern and the UX Collective empty-state research (May 2026), which shows 70% first-session drop-off occurs when users are asked to "think" instead of "do." For SocialBeam's free-first model, onboarding must demonstrate value within 60 seconds — crossing the "Suck Threshold" (Kathy Sierra) before asking for any configuration.

- **Opening screen**: Instead of a step wizard, the user sees: *"What are you trying to do with social media?"* with three starting verbs (not "Ask me anything"):
  - **"Plan a week of posts"** — immediately generates a sample 5-day content plan across connected platforms (or shows a worked example if no accounts are connected)
  - **"Write my next post"** — opens the AI Compose panel with a topic prompt
  - **"Connect my accounts"** — starts the OAuth connection flow

- **Worked example for users with no accounts connected**: Shows a populated week's content plan for a fictional brand (e.g., *"Here's what a week could look like for a coffee shop — connect your accounts to make it yours"*). Each sample post is clickable and immediately editable — the user "accidentally does something useful" before typing anything. This follows the UX Collective "action before speech" principle.

- **Competence demonstration**: For users who select "Plan a week of posts" and have connected accounts, the agent immediately generates a content plan and shows it as an editable calendar preview. The user sees concrete value before any configuration is requested.

- **TikTok audit awareness**: If a TikTok account is connected but audit has not passed, show an "Audit Pending — Posts Are Private" banner during onboarding. This is a launch gating item per [mvp-scope.md](docs/mvp-scope.md): unaudited TikTok posts are SELF_ONLY (visible only to the user).

- **No brand voice setup during onboarding**: Brand voice training is deferred to a conversion trigger later (see section 1.6). Free-tier users encounter it when they first try AI generation and realize outputs are generic.

- **Completion**: On completion, a success toast appears: *"Setup complete!"* Progress is stored in `localStorage` under the key `socialbeam-onboarding-complete`. The tour can be re-launched via **Help** menu → **Start tour**.

- **Suck Threshold target**: The entire flow is designed to get the user from landing to their first useful action (editing a sample post or generating their first AI draft) within 60 seconds.

### 1.5 In-App Guided Tour (Tooltips)
*(unchanged)*

### 1.6 AI Brand Voice Setup [AI-NATIVE]
- Triggered via **Settings → AI → Brand Voice** or as a conversion trigger after the user's first AI generation when outputs feel generic.
- **Voice Training Options** (user selects one or more):
  - **Upload past posts**: Import 10+ recent posts from connected accounts; AI analyzes tone, vocabulary, sentence structure, emoji usage, and hashtag patterns.
  - **Describe your voice**: Text input with presets (Professional, Casual, Witty, Educational, Inspirational, Bold) and free-form description.
  - **Upload brand guidelines**: PDF/text upload for formal brand voice documents, style guides, and do/don't lists.
  - **Provide examples**: Paste 3-5 posts that represent "exactly how we write."
- **Voice Preview**: After training, AI generates 3 sample posts for the user to review. User rates each (thumbs up/down) to refine the voice model.
- **Per-Platform Voice**: Users can optionally set different voices per platform (e.g., professional on LinkedIn, casual on X/Twitter).
- Voice profile is stored encrypted at rest, scoped to workspace.

#### Progressive Disclosure — Explainability on Demand
Following Mantlr's explainability-on-demand pattern (summary → detail → raw data), the Brand Voice flow includes a **"Why this voice?"** expandable that shows what the AI learned:

- **Summary level**: "I learned your brand uses short sentences (avg 12 words), frequent questions, and 1-2 emojis per post."
- **Detail level**: Breakdown of tone analysis — sentence structure (avg length, punctuation patterns), emoji frequency (which emojis, where placed), hashtag patterns (count, style, overlap across platforms), and vocabulary markers (power words, industry terms).
- **Raw data level**: The actual training samples used, with highlighted patterns the AI identified. Users can remove samples that don't represent their desired voice.

This progressive disclosure follows the Linear "Why?" link pattern — most users stop at summary; power users go deeper. Both feel served.

#### Brand Voice Discovery — Conversion Trigger [AI-NATIVE]

Brand voice training is positioned as a **conversion trigger**, not a setup step. It lives in the monetization flow, not onboarding.

- **During goal-first onboarding (1.4)**, if the user generates AI content and the output feels generic, present: *"Want posts that sound like you? Train me on your brand voice →"* with a **side-by-side preview** showing generic output vs. brand-matched output. The contrast demonstrates value immediately.

- **Conversion funnel placement** (following [tool-vision-and-market-research.md](docs/tool-vision-and-market-research.md)):
  ```
  See AI Features (grayed out, visible in UI)
    → First AI Credit (Try Before Buy)
      → Credits Run Out
        → Upgrade Prompt
          → Brand Voice Discovery ("Make it sound like you")
            → Voice Training (5 credits, AI Pro tier)
  ```

- **Free-tier visibility**: Free-tier users see AI features **grayed out** in the compose UI — not as a locked/blocked feature icon, but as a visible option with reduced opacity and an upsell label: *"Available with AI Starter ($19/mo)"*. This creates awareness without frustration.

- **Credit cost**: Brand voice training costs **5 credits (one-time)** and is available at the **AI Pro tier ($49/mo = 500 credits)**. The 5-credit investment makes users more likely to stick with the platform after training (sunk-cost retention).

- **Progressive upgrade path**: Free users can see what brand voice does (grayed out), AI Starter users get caption generation but not voice training, AI Pro users unlock voice training, AI Agency users get multi-voice support for client brands.

### 1.7 Target Audience Definition [AI-NATIVE]
- **Research-backed**: AI content quality depends on audience understanding. Without audience context, AI generates generic content that 50% of Gen Z would unfollow for being inauthentic (PostPlanify, 2026).
- Triggered via **Settings → AI → Audience** or as a prerequisite prompt before first AI content generation.
- **Audience Profile Builder**:
  - **Demographics**: Age range, location, gender distribution, income level
  - **Interests**: Industry topics, hobbies, professional interests (multi-select + custom)
  - **Platform behavior**: Which platforms the audience uses most, peak activity times
  - **Competitor awareness**: Accounts the audience follows (helps AI avoid duplicating competitor messaging)
  - **Pain points**: Problems the audience faces that the brand solves
- **AI Tailoring**: Once defined, the AI uses audience context to:
  - Select appropriate tone (technical vs. casual based on audience expertise)
  - Reference relevant trends and topics
  - Avoid content that would feel generic or off-target
  - Optimize posting times to audience activity patterns
- **Per-Platform Audience**: Different audience segments can be defined per platform (e.g., LinkedIn audience = B2B professionals, Instagram audience = consumers). The AI adapts content per platform audience.
- **Validation prompt**: After defining the audience, AI generates 3 test posts and asks: *"Does this sound like something your audience would engage with?"* User rates each, and the AI refines its understanding.
- **Credit cost**: Audience definition is **free** — it's a setup step, not a generation action. Without it, AI outputs will be generic (which defeats the purpose of the AI-native approach).
- **MVP scope note**: This flow is required for quality AI content generation and should be implemented before or alongside Flow 3.1 (AI Compose). An audience definition is a prerequisite for the AI to produce non-generic output.

---

## 2. Social Platform Management

### 2.1 Connect a Social Platform Account
*(unchanged)*

### 2.2 Disconnect a Social Account
*(unchanged)*

### 2.3 Reconnect an Expired Token
*(unchanged)*

### 2.4 View Account Status Details
*(unchanged)*

### 2.5 Handle Account Error States
*(unchanged)*

---

## 3. Post Creation & Publishing

### 3.1 AI Compose (Primary Flow) [AI-NATIVE]
- User clicks **Compose** or presses **Cmd+N**.
- The AI Compose panel opens with a natural language input: *"What do you want to post about?"*
- User can provide input in any format:
  - **Topic**: *"Announcing our new feature: dark mode"*
  - **URL**: Pastes a blog post URL → AI summarizes into platform-appropriate posts
  - **Brief**: *"3 posts this week about productivity tips, casual tone, include hashtags"*
  - **Image**: Uploads an image → AI generates caption + alt-text
  - **Repurpose**: *"Take this LinkedIn post and adapt it for Instagram and X"*
- AI generates draft posts for each selected platform with:
  - Platform-optimized text (character limits, formatting conventions)
  - Platform-specific hashtag counts and suggestions
  - Recommended media (if image generation is enabled)
  - Suggested posting times (AI-optimized per platform)
- Each draft shows an **AI-generated** badge with options: **Edit** (primary), **Approve**, **Regenerate**, **Regenerate with feedback** ("make it shorter", "less formal", "more emojis").
- **Edit-first workflow** [Research-Aligned]: Following Sociality.io (Jan 2026) findings that 78.4% of marketers apply moderate or extensive editing to AI content before publishing, the **Edit** action is the primary interaction. The inline editor opens directly on the draft, preserving the AI prompt context and showing AI suggestions for improvements. This reflects the "AI as drafter, not publisher" behavior pattern observed in 2026 user behavior.
- **Review & Edit All** for a batch: Users can open all generated drafts in a side-by-side review panel and edit each inline. This replaces the "Approve All" pattern, which contradicts the 78.4% heavy-editing behavior. Individual approve remains available for drafts the user is satisfied with, but batch operations default to review, not approve.
- Approved (and edited) posts queue for review (if approval workflow is enabled) or go directly to schedule/publish.

#### Multimodal Handoff
Following Mantlr's Multimodal Handoff pattern (Pattern 9, 2026), after AI generates a draft, the user can seamlessly switch between input modes without losing context:

- **Text → Visual Edit**: After the AI produces a draft, the user can switch to the platform preview panel and drag elements, resize media, or adjust formatting. The AI understands these visual edits as part of the same task context.
- **Conversational → Form Continuity**: If the user starts with a conversational prompt ("Write a post about our product launch") and then switches to the manual compose form to tweak details, all prior context (platform selections, media uploads, tone preferences) is preserved.
- **Never force context repetition**: The user does not need to re-specify platform targets, media selections, or tone preferences when switching between AI compose and manual edit modes. The two surfaces share a single task context.

#### Platform-Specific AI Adaptation

The AI must respect each platform's unique API constraints and content paradigms. These rules are derived from [mvp-scope.md](docs/mvp-scope.md), [social-media-api-capabilities-2026.md](docs/social-media-api-capabilities-2026.md), and [meta-api-capabilities-research-2026.md](docs/meta-api-capabilities-research-2026.md).

- **TikTok** [AI-NATIVE]: AI generates **video-first content only** — no text-only or image-only posts. Caption max 2,200 characters, 30 hashtags max. AI suggests video topics and scripts, not standalone captions. Must include **mandatory privacy level selection** (PUBLIC, FOLLOWERS, SELF) before any generate action. Video specs: MP4 H.264, 9:16 preferred aspect ratio, 10 minute maximum duration. The AI must flag any content that could trigger TikTok moderation (copyrighted music, watermarks from competing platforms). Until the app passes audit, all posts are SELF_ONLY (private) — AI must clearly communicate this visibility limitation.

- **Instagram** [AI-NATIVE]: AI knows text-only posts are **not supported** — always pairs caption with a media suggestion (image, video, or carousel). Respects the **50 posts/24h rate limit**: if the user attempts to generate or schedule 50+ posts in a single day, the AI warns them and suggests distributing across multiple days. Two-step publish flow awareness: AI creates a media container first, then publishes; containers expire in 24 hours. The AI proactively checks container expiry and re-uploads if needed before publish.

- **X/Twitter** [AI-NATIVE]: AI respects **$0.01/post API cost** and surfaces cost awareness. If the user generates 10 posts for X, show estimated API spend: *"This will cost ~$0.10 in API fees."* Thread creation via reply chaining — AI can suggest *"This is long for X — split into a thread?"* when content exceeds 280 characters. Character limit: 280 per tweet. Up to 4 images per tweet. AI warns about the 30-minute edit window and rate limits (100 tweets/15 min).

- **LinkedIn** [AI-NATIVE]: AI uses **professional tone by default**. Knows the 3,000 character limit for posts. Suggests **document carousel (PDF upload)** for long-form content — users can upload a PDF that LinkedIn renders as a swipeable carousel. Three-step media upload awareness: AI registers the upload → uploads to signed URL → creates post with the returned URN. The AI sequences this automatically but shows progress during the process.

- **Pinterest** [AI-NATIVE]: AI is **image-first** — no text-only posting option. Generates pin descriptions (800 characters max), titles (100 characters max), and board suggestions based on pin content and user's board organization. AI leverages Pinterest's 90+ available analytics metrics for performance predictions. Pin creation requires an image board ID — AI suggests the most relevant board or prompts the user to select one.

- **Facebook** [AI-NATIVE]: AI leverages Facebook's **native scheduling capability** (up to 30 days in advance via `scheduled_publish_time` parameter). This is the **only MVP platform with native scheduling** — all others use the Bull queue. AI can schedule text-only posts, images, videos, and carousels natively. When the user tries to schedule beyond 30 days, AI warns and suggests using the Bull queue fallback with a reminder notification.

### 3.2 Manual Compose (Fallback Flow) [AI-REDESIGNED]
- User clicks the **Write manually** link in the AI Compose panel or toggles to manual mode.
- The traditional compose form opens (as described in original 3.1).
- **AI Assist sidebar** is available on the right:
  - **Rewrite** button: Rewrites current text in brand voice
  - **Suggest hashtags**: Generates relevant hashtags for current content
  - **Platform preview**: Shows how the post will look on each selected platform
  - **Optimize timing**: Suggests best posting time based on historical data

### 3.3 Compose and Publish Immediately [AI-REDESIGNED]
- User can publish from either AI Compose (3.1) or Manual Compose (3.2).
- AI-generated posts that have been approved follow the same publish flow as manual posts.

#### Confidence Signals — Categorical Framework [AI-REDESIGNED]
Following Goji Labs research (Feb 2026) showing 58% of users who distrust AI report increased trust when uncertainty is visualized, the publish confidence display uses **categorical labels** instead of raw percentages. Research shows raw percentage scores cause users to either over-trust or distrust AI output.

- **High Confidence** (green): Brand voice match > 80%, platform compliance verified, historical data available for prediction. Display: *"Ready to publish — matches your brand voice."*
- **Medium Confidence** (yellow): Brand voice not yet trained OR limited historical data, platform compliance verified. Display: *"Ready, but training on your voice will improve results."* For free-tier users (no brand voice): Always shows Medium Confidence with note: *"Train brand voice for higher confidence →"*
- **Low Confidence** (orange): Platform constraint risk detected (e.g., media format may be rejected by Instagram), brand voice unknown, or content flagged by safety filter. Display: *"Review recommended — possible issues detected."*

Each level has a **"Why this rating?"** expandable with progressive disclosure (summary → detail → raw data):
- Summary: "High Confidence — matches your voice, passes all checks."
- Detail: Breakdown of contributing factors — brand voice match score, platform compliance status (character limits, media format, hashtag count), historical performance prediction.
- Raw data: The specific checks run and their results.

**Escalation Pathway for Low Confidence**: When confidence is Low, the system presents options rather than blocking (design system 10.80). E.g., *"This image format may not be supported by Instagram. Options: Convert to MP4, Choose different image, Publish anyway."*

### 3.4 Compose and Schedule a Post [AI-REDESIGNED]
- From AI Compose or Manual Compose.
- **AI-suggested times**: When scheduling, the time picker shows AI-recommended time slots highlighted in blue with predicted engagement scores (*"Tue 9:00 AM — Predicted: High engagement based on 30d data"*).

#### Tiered Approval Gates for Scheduling
Following Smashing Magazine's agentic AI patterns (Feb 2026) and AgentMarketCap's tiered approval framework (April 2026), scheduling actions are classified by reversibility:

| Risk Level | Action | Gate Type | Rationale |
|-----------|--------|-----------|----------|
| **Fully autonomous** | Hashtag suggestions, minor timing tweaks (±15 min), AI gap detection in calendar | No gate | Reversible, low-impact, high-frequency |
| **Soft gate** | Rescheduling single post within same day, drag-and-drop in calendar, AI time slot acceptance | Visible notification with 5-second cancel window | Reversible on all platforms; Facebook native scheduling supports edit; Bull queue can reschedule |
| **Hard gate** | Publishing to a new platform, bulk schedule (>3 posts), scheduling beyond Facebook's 30-day window, TikTok publish before audit approval | Explicit confirmation with Intent Preview (10.77) | TikTok SELF_ONLY restriction is irreversible for public visibility; bulk publish has cost implications for X ($0.01/post) |
| **Blocked by default** | Disconnecting account, deleting published posts, changing workspace settings | Requires elevated confirmation | Irreversible platform actions; may violate TikTok audit requirements |

**Platform-specific scheduling constraints**:
- Instagram: 50 posts/24h hard limit. AI cannot schedule more than 50 per day per account.
- Facebook: 30-day max scheduling window. AI warns when user tries to schedule beyond.
- TikTok: SELF_ONLY until audit passes. AI blocks public scheduling and shows "Audit Required" banner.
- X/Twitter: Show API cost estimate for bulk operations (*"This will cost ~$0.10 in API fees"*).

### 3.5 Save Post as Draft
*(unchanged — applies to both AI and manual drafts)*

### 3.6 Edit a Draft Post [AI-REDESIGNED]
- When editing an AI-generated draft, the edit form shows:
  - Original AI prompt used to generate the draft
  - **Regenerate** button with modified prompt
  - **AI suggestions** for improvements (character limit optimization, hashtag relevance)

### 3.7 Reschedule a Post [AI-REDESIGNED]
- User finds a **Queued** post and clicks **Reschedule**.
- AI suggests alternative times with engagement predictions.
- User can accept a suggestion or pick manually.

### 3.8 Duplicate a Post
*(unchanged)*

### 3.9 Delete a Post
*(unchanged)*

### 3.10 View Post on Platform
*(unchanged)*

### 3.11 AI Content Repurposing [AI-NATIVE]
- User selects a published or draft post and clicks **Repurpose**.
- AI generates platform-specific variants:
  - Thread structure for X/Twitter (splits long posts into tweet threads)
  - Visual-first caption for Instagram (shorter text, more hashtags)
  - Professional tone adaptation for LinkedIn
  - Video script suggestion for TikTok (from text post)
- **Batch review & edit panel** [Research-Aligned]: All generated variants open in a review panel. Following Sociality.io (Jan 2026) data showing 78.4% of users heavily edit AI content, each variant opens in an inline editor pre-populated with the AI draft. Users edit in place — the default action is edit, not approve. Variants that pass the user's review are marked individually; batch "Approve All" is secondary to the edit-first workflow.
- Users can select subsets for scheduling (e.g., approve Instagram + X variants but skip TikTok if no video is available).

### 3.12 Discard Compose Form
*(unchanged)*

### 3.13 AI Content Research & Ideation [AI-NATIVE]
- **Research-backed**: 59.5% of social media marketers use AI for content ideation and trend research — tied for the #1 AI use case (Sociality.io, Jan 2026). This flow is promoted from Post-MVP (15.2 social listening) to MVP because ideation is the entry point for most AI workflows.
- User clicks **Research** in the Compose panel or Agent Panel.
- **AI analyzes**:
  - **Trending topics** in the user's industry/niche across connected platforms
  - **Content gaps** in the user's calendar vs. their target posting frequency
  - **Competitor content themes** (what similar accounts are posting about, if social listening is enabled)
  - **Historical performance patterns**: Which topics performed best for this user in the past
- **Ideation output**:
  - **Topic suggestions**: 5-10 content ideas with predicted engagement scores
  - **Angle variations**: Multiple takes on the same topic (*"3 ways to talk about AI in social media: trend analysis, how-to guide, opinion piece"*)
  - **Calendar fill**: AI maps ideas to open calendar slots with optimal posting times
  - **Source attribution**: Each idea links to the data source (*"Trending on LinkedIn this week: AI in marketing (+340% searches)"*)
- **User interaction**:
  - Click any idea → opens AI Compose (3.1) pre-filled with the topic and context
  - **Save to ideas**: Pin ideas for later without committing to the calendar
  - **Dismiss**: Remove ideas the user doesn't want; AI learns from dismissals
  - **Refine prompt**: *"More like this but about [topic]"* → AI generates variations
- **Credit cost**: Research & ideation costs **1 credit per session** (not per idea). The entire research session — topic suggestions, angle variations, calendar fill — is a single credit event.
- **Audience-aware**: Results are filtered through the user's audience definition (Flow 1.7). Ideas that don't match the audience profile are deprioritized.

---

## 4. Scheduling & Calendar

### 4.1 View Content Calendar — Month View [AI-REDESIGNED]
- Post chips appear as before.
- **AI gap indicators**: Empty days or days with fewer posts than the user's target frequency show a subtle dashed outline with a **"+"** icon. Hovering reveals: *"AI suggests adding a post here — your audience is most active on this day."*
- **AI fill button**: One-click **Fill gaps with AI** generates posts for all open slots based on brand voice and recent content themes.

### 4.2 View Content Calendar — Week View [AI-REDESIGNED]
- Includes AI time slot suggestions displayed as semi-transparent blocks behind scheduled posts.
- Shows optimal posting windows as colored bands (*"Best time: 9-11 AM"*).

### 4.3 View Content Calendar — Day View
*(unchanged)*

### 4.4 Drag-and-Drop Reschedule [AI-REDESIGNED]
- After dropping a post, AI evaluates the new time and shows an inline suggestion: *"This slot has 15% lower predicted engagement than the original. Want to use the suggested time instead?"* with **Accept original** / **Accept AI suggestion** options.

### 4.5 Click Post Chip to View Details
*(unchanged)*

### 4.6 Calendar Date Navigation
*(unchanged)*

### 4.7 AI Weekly Content Plan [AI-NATIVE]
- User clicks **Generate Week** in the calendar header.
- AI presents a full week's content plan:
  - 5-7 posts across connected platforms
  - Content mix analysis (*"This week: 2 product posts, 2 thought leadership, 1 engagement post"*)
  - Optimal times pre-selected
  - Preview panel shows all generated posts
- User reviews, edits individual posts, and approves the plan with one click.
- Approved posts enter the queue with scheduled times.

### 4.8 Contextual Guardrails for Calendar Operations [AI-NATIVE]

Following Mantlr's Contextual Guardrails pattern (2026), calendar operations are classified by risk level with proportional friction:

- **Low risk** (auto-execute, no gate): Viewing, filtering by platform, clicking post chips, navigating dates, toggling between month/week/day views.
- **Medium risk** (quick preview with undo): Drag-and-drop reschedule (toast with undo option), editing draft content, AI gap fill for a single day, accepting AI time slot suggestions.
- **High risk** (full Intent Preview with explicit confirmation): "Fill gaps with AI" for entire week (generates 5-7 posts across platforms), bulk reschedule, deleting day's posts, bulk delete of scheduled posts.

**Customizable risk thresholds**: Users can customize guardrail strictness per workspace (Settings → AI → Guardrails). Agency users (managing client accounts) may want stricter gates; solopreneurs may want more autonomy.

---

## 5. Analytics & Reporting

### 5.1 View Unified Analytics Dashboard [AI-REDESIGNED]
- Dashboard shows cross-platform performance overview.
- **AI Insights card** appears at the top (collapsible):
  - *"Your engagement is up 23% this week vs. last. TikTok posts at 6pm performed 2x better than afternoon posts."*
  - *"Your LinkedIn posts with questions in the first line get 40% more comments."*
  - *"Recommendation: Post to Instagram on Thursday morning — your audience activity peaks then."*
- Each insight has a **Take action** button that executes the recommendation (e.g., reschedule upcoming post, adjust posting time preferences).

### 5.2 View Post-Level Analytics [AI-REDESIGNED]
- Post analytics page includes **AI Performance Analysis**:
  - **Predicted vs Actual**: Shows what AI predicted before posting vs. actual results
  - **What worked**: AI identifies successful elements (*"The question in line 1 drove 40% more comments"*)
  - **What didn't**: AI identifies underperforming elements (*"Hashtag #MarketingTips is oversaturated — try #GrowthMarketing instead"*)
  - **Improve this post**: AI suggests edits if the post can still be edited on the platform

### 5.3 View Inline Analytics on Post Cards
*(unchanged)*

### 5.4 Filter Analytics
*(unchanged)*

### 5.5 AI Predictive Analytics [AI-NATIVE]
- Before publishing, user can click **Predict performance**.
- AI shows predicted engagement range based on:
  - Historical performance of similar content
  - Selected posting time vs. optimal time
  - Platform-specific factors (hashtag relevance, content length, media presence)
- Prediction shown as a gauge: *"Predicted engagement: 72% of your top-performing posts"* with confidence interval.

### 5.6 AI Automated Reports [AI-NATIVE]
- User clicks **Generate report** in Analytics.
- AI creates a natural-language summary report:
  - Top-performing posts and why they worked
  - Platform-by-platform performance breakdown
  - Week-over-week trends
  - Actionable recommendations for next week
- Reports can be exported as PDF or shared via link.

---

## 6. Dashboard & Home

### 6.1 View Main Dashboard [AI-REDESIGNED]
- Dashboard includes an **AI Status** section:
  - **Agent activity**: Shows what the AI is currently doing (*"Generating next week's content plan"*)
  - **Pending review**: AI-generated drafts awaiting user approval
  - **Quick actions**: Natural language input for agent commands (*"What's my best-performing platform this month?"*)
- Recent posts, upcoming scheduled posts, quick stats, and connected accounts overview remain.
- **Empty state** [AI-REDESIGNED]:
  - **Worked example**: Shows a populated week's content plan for a sample brand (e.g., a coffee shop) with platform-specific posts. Each sample post is clickable and immediately editable — the user "accidentally does something useful" before typing anything.
  - **Starting verbs** (not "Ask me anything"): Three action buttons — **"Plan your week"** (generates 5-7 posts), **"Write a post"** (opens AI compose with topic prompt), **"Connect accounts"** (starts OAuth flow).
  - **Exposed limits**: Subtle footer text: *"I can schedule posts for Instagram, Facebook, X, LinkedIn, TikTok, and Pinterest. I learn your style over time. AI features use credits — you get 10 free to start."* This sets expectations for the free-first model.
  - **Action before speech**: The worked example posts are clickable and immediately editable. The user modifies a sample post before the AI asks them to describe what they want. This crosses the "Suck Threshold" (Kathy Sierra) fastest, per UX Collective research (May 2026) showing 70% first-session drop-off when users are asked to "think" before "do."

### 6.2 View Notification Bell
*(unchanged)*

### 6.3 Switch Workspace
*(unchanged)*

---

## 7. Settings & Configuration

### 7.1 Access Settings
*(unchanged)*

### 7.2 Profile Settings
*(unchanged)*

### 7.3 Manage Connected Accounts
*(unchanged)*

### 7.4 Toggle Theme
*(unchanged)*

### 7.5 Configure Notification Preferences
*(unchanged)*

### 7.6 AI Settings [AI-NATIVE]
- Navigate to **Settings → AI**.
- **Content Generation**:
  - Default AI model selection (if multiple providers configured)
  - Temperature/creativity slider (Conservative → Creative)
  - Max output length preference
  - Enable/disable AI image generation
- **Brand Voice**:
  - Manage voice profiles (create, edit, delete)
  - Per-platform voice overrides
  - Voice training data management
- **Scheduling AI**:
  - Enable/disable AI time optimization
  - Content frequency targets (*"Post 5x per week on Instagram"*)
  - Content mix preferences (*"40% product, 30% educational, 30% engagement"*)
- **Autopilot Mode**:
  - Toggle full AI autonomy for trusted accounts
  - Set boundaries: what AI can/cannot do autonomously
  - Review frequency for autopilot-generated content

### 7.7 AI Usage & Quotas [AI-NATIVE]
- Navigate to **Settings → AI → Usage**.
- Shows AI generation counts, remaining quota, and usage history.
- Per-workspace AI usage breakdown.

### 7.8 AI Credit System Flows [AI-NATIVE]

This section maps every AI feature to the credit system. SocialBeam monetizes via credits, not flat AI access — user flows must reflect this throughout. Reference: [tool-vision-and-market-research.md](docs/tool-vision-and-market-research.md) §10.2 and §10.3.

**Credit consumption table**:

| AI Action | Credit Cost | User Flow |
|-----------|-------------|-----------|
| AI caption generation | 1 credit | User clicks "Generate" in compose → credit deducted → output shown |
| Hashtag suggestion | 1 credit | User clicks "Suggest hashtags" → credit deducted → tags shown |
| Content repurposing (blog → 25-40 posts) | 10 credits | User uploads URL → preview of plan → Intent Preview → approve → credits deducted |
| Brand voice training | 5 credits (one-time) | User uploads past posts/examples → AI analyzes → 3 sample outputs for rating |
| Best time to post analysis | 1 credit per analysis | AI analyzes historical engagement → suggests time slots |
| AI insights generation | 2 credits per report | AI analyzes 30-day performance → generates natural-language insights |
| AI image generation | 2 credits per image | User describes image → AI generates platform-optimized versions |
| Predictive engagement scoring | 1 credit per post | AI predicts engagement based on historical data → shows gauge |
| **Regenerate (first attempt after generation)** | **FREE** | User clicks "Regenerate" or "Regenerate with feedback" on any draft → no credit deducted → revised output shown |

**Free revision policy** [Research-Aligned]: Following Sociality.io (Jan 2026) respondent feedback — *"When the desired result is not achieved, things like there being no credit usage for revisions"* — the first regeneration after any AI generation is free. Subsequent regenerations on the same draft cost 1 credit. This reflects the reality that 78.4% of users edit AI content; revisions are part of the workflow, not a new generation.

**Credit exhaustion flow**:

- When user has 0 credits and triggers an AI feature: Show an **AI preview** (what the output would look like) with an "Upgrade to unlock" prompt.
- The free preview shows a **50% opacity version** of the AI output with a watermark: *"Upgrade to AI Starter ($19/mo = 100 credits) to unlock."*
- This follows the conversion funnel: the user sees value before paying — not a locked feature icon that hides everything.

**Persona-specific credit guidance** (shown in compose UI and Settings → AI → Credits):

- **Sarah** (SMB, $19/mo): *"Your 100 credits cover ~100 captions + 10 hashtag sets per month — enough for daily posting."*
- **Marcus** (freelancer, $49/mo): *"Your 500 credits cover ~50 repurposing runs per month — one per client per week."*
- **Priya** (agency, $149/mo): *"Your 2,500 credits cover multi-brand voice training + weekly content plans for 25+ clients."*

### 7.9 AI Transparency & Disclosure Settings [AI-NATIVE]
- **Research-backed**: 19.4% of marketers cite disclosure/transparency as a concern (Sociality.io, Jan 2026). 50% of Gen Z have unfollowed/blocked accounts they believed used AI content (PostPlanify, 2026). Scientific Reports (2026) found AI content is perceived as "robotic" and "generic" without human transparency.
- Navigate to **Settings → AI → Transparency**.
- **Per-Platform Disclosure Controls**:
  - **Disclose AI use**: Toggle whether AI-generated posts include an AI disclosure marker. Platform-specific toggles (e.g., disclose on LinkedIn but not on X/Twitter).
  - **Disclosure language**: Customize the disclosure text (*"This post was AI-assisted"*, *"Generated with SocialBeam AI"*, etc.)
  - **Platform-enforced requirements**: Some platforms (TikTok, X/Twitter) may require AI content labeling per their ToS. These are shown as **locked** toggles with the explanation: *"TikTok requires AI content labeling. This setting cannot be disabled."*
- **Audience Trust Settings**:
  - **AI badge visibility**: Control whether the "AI-generated" badge is visible to the audience on published posts (default: hidden — badges are for internal workflow only)
  - **Human editing indicator**: Option to show *"AI-assisted, human-edited"* when content was significantly modified (addresses the 78.4% editing behavior)
  - **Brand voice transparency**: Whether to disclose that the brand voice is AI-trained (optional, for brands that want to be fully transparent)
- **Compliance tracking**:
  - A dashboard shows which platforms require AI disclosure and whether the user's settings comply
  - Non-compliant settings trigger a warning toast when the user attempts to publish
- **Credit cost**: Free — this is a settings/configuration flow.

---

## 8. Media Library

### 8.1 Upload Media Files
*(unchanged)*

### 8.2 Handle Media Upload Errors
*(unchanged)*

### 8.3 Reorder Media
*(unchanged)*

### 8.4 AI Media Enhancement [AI-NATIVE]
- After uploading media, AI offers:
  - **Auto-crop** for each platform's optimal aspect ratio
  - **Generate alt-text** for accessibility
  - **Enhance image quality** (brightness, contrast, sharpness optimization)
  - **Generate variations** (square, landscape, story format)
  - **AI-generated thumbnails** for video content

### 8.5 AI Image Generation [AI-NATIVE]
- From Compose form, user clicks **Generate image**.
- User describes the image or provides a text prompt.
- AI generates platform-optimized images matching brand style.
- Generated images enter the media library with source prompt stored for regeneration.

### 8.6 Media Library Management
*(unchanged from Post-MVP 8.4, now promoted to MVP)*

---

## 9. Command Palette / Agent Panel

### 9.1 Open Command Palette [AI-REDESIGNED]
- User presses **Cmd+K / Ctrl+K** for command palette.
- User presses **Cmd+J / Ctrl+J** for the **Agent Panel** (new).
- Command palette retains navigation/search functionality.

### 9.2 Agent Panel [AI-NATIVE]
- Full-height side panel with persistent task-grouped progress feeds (not raw conversation history).
- Natural language input: *"What can I help with?"*
- Supported agent commands:
  - **Content**: *"Write 5 posts about our product launch"*
  - **Scheduling**: *"Move all Instagram posts to next week and fill gaps"*
  - **Analytics**: *"What was my best-performing post last month?"*
  - **Optimization**: *"Review my next 10 scheduled posts and suggest improvements"*
  - **Repurposing**: *"Turn last week's LinkedIn post into a Twitter thread"*
  - **Batch operations**: *"Duplicate all failed posts and fix the media format"*

#### Progress Feed Pattern
Following AgentMarketCap's progress feed pattern (April 2026), the agent panel replaces raw chronological logs with task-grouped progress feeds:

```
📝 Content Generation (just now)
  ✓ Analyzed your top 12 posts from last 30 days
  ✓ Identified 3 high-engagement patterns
  > Drafting 5 Instagram posts... (3/5 complete)
```

- **Task grouping**: Actions are grouped by task/session, not raw chronological. Users think in goals, not timestamps.
- **Concise, action-oriented, skimmable**: Each line reads like a Slack update from a colleague — not a system log.
- **Explainability on demand**: Click any completed step to see reasoning. E.g., click "Analyzed your top 12 posts" → expand to show which posts, which metrics, what patterns were found.
- **Platform-aware narration**: The agent references platform constraints: *"Instagram allows 50 posts/day — I've distributed these across 5 days to stay within limits."*
- **Undo available**: Following the saga-based undo pattern (Tian Pan, April 2026), each completed task shows [Undo] if within the 15-minute window and the action is reversible. For X/Twitter posts, note the API cost impact (*"$0.01 refund may not apply"*).
- **Cost awareness**: When the agent performs X/Twitter operations, show running API cost: *"This session: 3 tweet reads ($0.015), 2 tweet creates ($0.02). Total: $0.035."*
- **AI disclosure status indicator**: Each task in the progress feed shows whether generated content will include AI disclosure to the audience, based on the user's transparency settings (Flow 7.9). E.g., a content generation task shows: *"5 Instagram posts drafted — AI disclosure: per platform settings"*. This addresses the 50% of Gen Z who unfollowed accounts they believed used AI content (PostPlanify, 2026).

### 9.3 Navigate Pages
*(unchanged — command palette)*

### 9.4 Execute Actions
*(unchanged — command palette, extended with agent commands)*

### 9.5 View Recent Items
*(unchanged)*

### 9.6 Quick Settings
*(unchanged)*

---

## 10. Navigation & App Shell

### 10.1 Sidebar Navigation [AI-REDESIGNED]
- **Primary**: Dashboard, Compose, Calendar, Analytics, **AI Agent** (new nav item), Settings.
- AI Agent nav item shows activity indicator (pulsing dot when agent is working).
- Active item: blue background with 3px left border.
- Collapsible to a 72px icon rail on desktop.

### 10.2 Top App Bar [AI-REDESIGNED]
- **Right side**: AI status indicator shows agent state (idle, working, waiting-for-review).
- Quick-access **AI Agent** button always visible in top bar for fast agent activation.
- Notification bell, User avatar menu, Theme toggle remain.

### 10.3 User Avatar Menu
*(unchanged)*

### 10.4 Mobile Navigation
*(unchanged)*

---

## 11. Notifications & Alerts

### 11.1 In-App Notifications
*(unchanged)*

### 11.2 Toast Notifications
*(unchanged)*

### 11.3 Post Failure Alerts [AI-REDESIGNED]
- Failed post notification includes **AI diagnosis**: *"Post failed because the image format wasn't supported by Instagram. The AI has auto-converted it to a supported format — click retry to republish."*
- One-click **AI Fix & Retry** option.

### 11.4 Token Expiry Alerts
*(unchanged)*

### 11.5 Navigation Item Notification Dots
*(unchanged)*

### 11.6 AI Review Notifications [AI-NATIVE]
- When AI generates content awaiting review, a notification appears: *"3 AI-generated posts ready for your review."*
- Clicking opens the review panel with all pending AI drafts.

### 11.7 AI Insight Notifications [AI-NATIVE]
- Periodic AI insights pushed as notifications: *"Your engagement is trending down on X — consider posting more visual content."*

---

## 12. Error & Edge Cases

### 12.1 Failed Post Publish (Retry Flow) [AI-REDESIGNED]
- Exponential backoff retry (max 3 attempts) remains.
- After retries exhausted, AI diagnoses the failure and suggests fixes:
  - Format issues → auto-convert to supported format
  - Rate limit hits → reschedule for next available window
  - Content policy violations → highlight problematic content and suggest edits
- User can accept AI fix or edit manually.

### 12.2 Empty State Handling [AI-REDESIGNED]

Applying the UX Collective four-property framework (May 2026): worked example, starting verb, exposed limits, action before speech. The old pattern of "AI input field" caused 70% first-session drop-off because it asks users to "think" before they have any understanding of what the product can do.

| Context | Four-Property Empty State |
|---------|--------------|
| **No posts** | **Worked example**: Populated week's content plan for a sample brand with platform-specific posts. **Starting verb**: "Plan your week" generates 5-7 posts. **Exposed limits**: "I can schedule for 6 platforms. I learn your style over time." **Action before speech**: Clicking any sample post makes it editable immediately — user modifies before describing what they want. |
| **No accounts** | **Worked example**: Sample cross-platform calendar showing Instagram, Facebook, X, LinkedIn, TikTok, Pinterest posts. **Starting verb**: "See how it works" shows the platform with sample data. **Exposed limits**: Lists all 6 supported platforms. **Action before speech**: "Connect your first account" starts OAuth immediately — no configuration first. |
| **No analytics** | **Worked example**: Sample dashboard with fictional data showing engagement trends, top-performing posts, platform comparison. **Starting verb**: "Publish 3 posts to start learning" with a concrete target. **Exposed limits**: "Analytics available 24-48hrs after publishing (48hrs for Instagram)." **Action before speech**: Sample dashboard is interactive — clicking any metric shows how it will work with real data. |
| **No calendar entries** | **Worked example**: Populated week with optimal posting times. **Starting verb**: "Plan your week" fills it with AI-generated content. **Exposed limits**: "I respect platform rate limits — 50 posts/day for Instagram, 30-day max for Facebook scheduling." **Action before speech**: Clicking any day slot immediately creates a draft post. |
| **No brand voice** | **Worked example**: Side-by-side comparison of a generic AI post vs. a brand-matched post showing the quality difference. **Starting verb**: "Make it sound like you" → enters voice training. **Exposed limits**: "Upload 10+ past posts or describe your style — takes ~2 minutes." **Action before speech**: User can rate the side-by-side examples (thumbs up/down) to start training immediately. |
| **TikTok audit pending** | **Worked example**: Mock TikTok post with "SELF_ONLY (private)" badge. **Starting verb**: "Track audit progress" opens a checklist of requirements. **Exposed limits**: "TikTok requires a published website with Privacy Policy + ToS. Audit takes 3-7 business days." **Action before speech**: Checklist items are clickable — clicking "Privacy Policy" opens a template. |

### 12.3 Skeleton Loading States
*(unchanged)*

### 12.4 Network Error Pages
*(unchanged)*

### 12.5 AI Agent Offline/Unavailable [AI-NATIVE]
- When AI service is down, compose forms fall back to manual mode automatically.
- Banner: *"AI features are temporarily unavailable. Manual compose is ready — your scheduled posts will still publish on time."*
- Queued AI-generated posts remain in queue and will publish as scheduled.

---

## 13. AI Agent Flows [NEW SECTION]

### 13.1 Agent Command Execution [AI-NATIVE]
- User issues natural language command via Agent Panel (9.2).
- Agent parses intent, confirms understanding: *"I'll write 5 Instagram posts about dark mode and schedule them for optimal times this week. Sound good?"*
- User confirms → agent executes:
  1. Generates 5 posts using brand voice
  2. Selects optimal times per platform
  3. Queues posts with "Pending Review" status
- Agent notifies user when complete: *"5 posts generated and queued for review."*
- Each step is logged and visible in the agent activity panel.

### 13.2 Agent Autonomous Scheduling [AI-NATIVE]
- User can **opt in** to AI scheduling assistance. **Default mode is "Suggest Only"** — research shows trust in fully autonomous AI agents fell from 43% to 27% year-over-year (2024-2025), and 66% of users say human oversight remains essential (EY Survey, 2025). Only 13% of marketers currently use agentic AI (PostPlanify, 2026).
- When the user explicitly enables a higher autonomy level, the agent manages posting schedule within defined bounds:
  - Posting frequency limits
  - Content mix requirements
  - Platform-specific rules
  - Brand voice compliance
- **Autonomy Dial** (following component 10.78): Three explicit tiers —
  - **Suggestions only** (default): AI proposes times and content, user executes manually. No autonomous action.
  - **Review before publish**: AI generates and schedules, but user must approve each batch before it goes live.
  - **Full auto** (explicit opt-in with friction): AI publishes within defined bounds. Requires a two-step confirmation: "You're about to let the AI publish autonomously. This means posts will go live without your review. Continue?"
- User reviews autopilot-generated content on a configurable schedule (daily/weekly).
- **Trust-building onboarding for Autopilot**: Before enabling any autonomy level above "Suggestions only," the system shows: *"Only 13% of social media marketers use autonomous AI agents. Most start with suggestions and work up. You can change this anytime."* This sets realistic expectations and reduces anxiety.

### 13.3 Agent Content Monitoring [AI-NATIVE]
- Agent continuously monitors:
  - Connected account health (token status, rate limits, API errors)
  - Post performance against historical baselines
  - Platform policy changes that affect scheduled content
  - Competitor activity and trending topics (if social listening is enabled)
- Alerts are pushed for anomalies requiring human attention.

### 13.4 Agent-Generated Content Review [AI-NATIVE]
- AI-generated posts enter a review queue.
- Review interface shows:
  - Generated content with platform preview
  - Brand voice match score
  - Predicted performance score
  - Original prompt used for generation
  - Action buttons: **Edit** (primary), **Approve**, **Regenerate**, **Reject**
- **Batch actions** [Research-Aligned]: **Review & Edit All** opens all drafts in an inline batch editor (reflecting 78.4% heavy-editing behavior). **Regenerate All** re-generates all drafts with the original prompt. **Reject All** discards the batch. "Approve All" is intentionally absent — users must at least review each draft, consistent with the edit-first workflow established in Flow 3.1.

---

## 14. AI Governance & Safety [NEW SECTION]

### 14.1 AI Content Safety Filters [AI-NATIVE]
- All AI-generated content passes through safety filters before reaching the review queue:
  - **ToS compliance**: Checks against platform-specific content policies
  - **Brand safety**: Flags content that conflicts with brand guidelines
  - **Fact-checking**: Warns about potentially inaccurate claims
  - **Sentiment guard**: Prevents overly negative or aggressive tone
- Filtered content is tagged with the specific concern for human review.

### 14.2 AI Action Logging [AI-NATIVE]
- All agent actions are logged with:
  - Timestamp, action type, input prompt, output content
  - User who approved/rejected
  - Platform response (success/failure/error)
- Logs are accessible via **Settings → AI → Activity Log**.
- Logs support audit requirements for team and enterprise accounts.

### 14.3 Rate Limit Awareness [AI-NATIVE]
- Agent tracks per-platform rate limits and never exceeds them.
- When approaching rate limits, agent throttles generation and notifies user.
- Rate limit status visible in the agent panel.

### 14.4 Human-in-the-Loop Boundaries [AI-NATIVE]
- Users define what the AI can do autonomously vs. what requires approval:
  - **Full autonomy**: Post within defined content mix and schedule
  - **Review required**: All AI-generated content needs approval
  - **Suggestions only**: AI suggests, user executes manually
- Boundaries are configurable per platform and per workspace.

### 14.5 Action Risk Classification & Undo [AI-NATIVE]

Following the "Agent Undo is a Saga, Not a Stack" pattern (Tian Pan, April 2026), every AI action is classified by reversibility. Pre-compute inverses at execution time — cannot rely on database rollback after platform API calls.

**Reversibility classification**:

| Action | Reversibility | Undo Window | Notes |
|--------|--------------|-------------|-------|
| Draft post created | Cleanly reversible | 15 min | Delete from DB, no platform API call made |
| Post scheduled (Bull queue) | Cleanly reversible | Until publish time | Remove from queue, no platform API call made |
| Post scheduled (Facebook native) | Cleanly reversible | 30 days | API delete of scheduled post via `DELETE /{post_id}` |
| Post published (any platform) | Compensable with residue | 0 min (non-reversible) | Can delete post on platform, but engagement/visibility data is residue — cannot recover |
| Post deleted (any platform) | Non-reversible | 0 min | Cannot recover platform-side engagement data |
| Hashtag suggestion applied | Cleanly reversible | 15 min | Undo = remove hashtags from draft |
| AI caption applied | Cleanly reversible | 15 min | Undo = revert to previous draft version |
| TikTok video published (SELF_ONLY) | Compensable with residue | 0 min | Can delete private post, but audit log records it |
| X/Twitter post published | Compensable with residue | 0 min | Can delete within 30-min edit window; $0.01 API cost not refunded |

**Action audit log**: All agent actions are logged with timestamp, action type, reversibility status, input prompt, output content, and user approval/rejection. Accessible via **Settings → AI → Activity Log** or **Cmd+Shift+R** from command palette. Filter by platform, action type, date range, reversibility status.

### 14.6 Graceful Error Recovery Framework [AI-NATIVE]

Following Mantlr's Graceful Error Recovery pattern (Pattern 6, 2026) and the service recovery paradox — well-handled errors build more trust than no errors. When AI fails: acknowledge clearly, explain in plain language, offer to fix, learn from correction.

**Platform-specific error recovery flows**:

| Platform | Common Failure | AI Recovery Message |
|----------|---------------|---------------------|
| **Instagram** | Media container expired (24h limit) | *"The media container for this post expired before I could publish. I've re-uploaded it — want me to retry now?"* |
| **Instagram** | 50 posts/24h limit hit | *"You've hit Instagram's 50 posts/day limit. I can reschedule the remaining posts for tomorrow morning at your optimal time."* |
| **Facebook** | Scheduled beyond 30-day window | *"Facebook only allows scheduling up to 30 days in advance. I've moved this to the earliest available slot (30 days from now). Adjust?"* |
| **X/Twitter** | Rate limit exceeded (100 tweets/15min) | *"X is rate-limiting us right now. I'll retry in 15 minutes. Your post is still queued — nothing is lost."* |
| **X/Twitter** | Error 226 (bot-like behavior) | *"X flagged this post as potentially automated. This can happen with rapid posting. I'll space out your remaining posts by 15 minutes. Want to adjust the pace?"* |
| **LinkedIn** | 429 rate limit (opaque) | *"LinkedIn is limiting API requests. I'll back off and retry. Your posts are safe in the queue."* |
| **TikTok** | Video rejected by moderation | *"TikTok's content moderation flagged this video. Common causes: copyrighted music, watermarks from other platforms. I can suggest edits or you can upload a new video."* |
| **TikTok** | SELF_ONLY (audit not passed) | *"This post will publish as private (visible only to you) because TikTok hasn't approved our app yet. Want to save it as a draft until audit passes?"* |
| **Pinterest** | No comments API | *"Pinterest doesn't expose comment data via API. Engagement shown includes saves and clicks only."* |

Each error response includes the learning signal: *"I'll remember this — next time I'll [preventive action]."*

---

## 15. Decision Framework

Following Mantlr's decision framework (2026), this section maps required AI-native patterns to SocialBeam's feature scope. Not every feature needs every pattern — apply proportionally to complexity and risk.

| Feature Scope | Required Patterns | Research Backing | SocialBeam Examples |
|--------------|-------------------|------------------|---------------------|
| **Free-tier scheduling** (no AI) | Contextual guardrails, empty state framework, graceful error recovery | UX Collective (May 2026), Mantlr Pattern 6 | Calendar, compose form, post status tracking, media upload |
| **AI copilot** (assisting user) | Confidence signals, action preview, multimodal handoff, explainability on demand, progressive disclosure, **edit-first workflow** | Goji Labs (Feb 2026), Sociality.io (Jan 2026), Mantlr Pattern 9 | AI compose (3.1), hashtag suggestions, brand voice matching, predictive analytics (5.5), content research (3.13) |
| **Autonomous agent** (acts independently) | All patterns, especially progress feeds, tiered approval gates, action audit log, escalation pathway, **explicit opt-in for autonomy** | EY Survey (2025), PostPlanify (2026), AgentMarketCap (April 2026) | AI weekly content plan (4.7), content gap fill (4.1), autopilot scheduling (13.2 — default off), agent command execution (13.1) |

**Anti-patterns to avoid**:
- Don't add approval gates to reversible, low-frequency actions (creates approval fatigue)
- Don't use raw percentage confidence scores (causes over-trust or distrust — Goji Labs, Feb 2026)
- Don't use streaming-only output without task grouping (becomes a "wall of logs" — AgentMarketCap, April 2026)
- Don't present a blank prompt as an empty state (70% first-session drop-off — UX Collective, May 2026)
- Don't default to autonomous AI (27% trust in autonomous agents — PostPlanify, 2026)
- Don't use "Approve All" for AI-generated content (78.4% edit heavily — Sociality.io, Jan 2026)
- Don't charge credits for revisions (user frustration documented — Sociality.io respondent)

---

## 16. Post-MVP Flows (Updated)

### 16.1 AI Content Repurposing Engine
- Upload a long-form asset (blog post, video transcript, podcast transcript).
- AI generates 25-40 social posts across platforms.
- Content calendar auto-populated with repurposed content.
- User reviews and approves the content plan.

### 16.2 Social Listening
- Keyword monitoring with AI sentiment analysis.
- Trend detection and competitor tracking.
- Crisis alerts: AI detects sudden sentiment shifts and alerts user.
- Influencer identification based on engagement and relevance.

### 16.3 Unified Inbox
- All messages, comments, and mentions in one stream.
- **AI triage**: Categorizes incoming messages by urgency, sentiment, and topic.
- **AI response drafting**: Generates suggested replies using brand voice.
- Saved replies and auto-response rules.
- Message tagging and assignment/routing for team accounts.

### 16.4 Bulk Scheduling
- CSV upload with AI Autolist distribution.
- AI validates CSV content and flags issues.
- Bulk selection and batch actions.
- AI suggests optimal distribution pattern over time.

### 16.5 Cross-Platform Content Adaptation
- Write once; AI auto-adapts formatting, limits, hashtags, and times.
- Platform-specific media recommendations.
- A/B test variant generation.

### 16.6 Social Commerce
- Product catalog sync (Shopify/WooCommerce).
- AI generates product-focused social posts.
- Shoppable post scheduling and social-to-purchase analytics.

### 16.7 Reporting & Export
- Custom report builder with AI narrative generation.
- White-labeled reports.
- Automated scheduled reports and PDF export.
- AI executive summaries for stakeholder communications.

### 16.8 Team Collaboration
- Role-based permissions with AI workflow awareness.
- Multi-step approval workflows: AI generates → Editor edits → Approver approves → Publish.
- Internal comments on drafts.
- Team activity logs including AI actions.
- AI brand voice per client/workspace.

### 16.9 AI Video Content Generation
- Upload long-form video → AI creates platform-specific clips.
- Auto-captioning and subtitle generation.
- Thumbnail optimization per platform.
- Trending audio and effect suggestions.

---

## Updated Summary

| Category | MVP Flows | AI-Native Flows | Research Confidence | Total |
|----------|-----------|-----------------|-------------------|-------|
| Authentication & Onboarding | 5 | 3 (1.4 redesigned, 1.6 progressive disclosure, **1.7 audience definition [new]**) | Validated (UX Collective, Sociality.io) | 8 |
| Social Platform Management | 5 | 0 | N/A | 5 |
| Post Creation & Publishing | 9 → 13 | 5 (3.1 edit-first workflow, 3.3 confidence signals, 3.4 tiered gates, 3.11 batch review, **3.13 content research [new]**) | Partially Validated (Sociality.io: 78.4% edit) | 13 |
| Scheduling & Calendar | 6 → 8 | 2 (4.7, 4.8 contextual guardrails) | Partially Validated (Digital Applied: 5-10% lift) | 8 |
| Analytics & Reporting | 4 → 6 | 2 (5.5, 5.6) | Validated (Sociality.io: 59.5% analytics use) | 6 |
| Dashboard & Home | 3 | 0 (6.1 redesigned with 4-property framework) | Validated (UX Collective) | 3 |
| Settings & Configuration | 5 → 9 | 4 (7.6, 7.7, **7.8 credit revisions [fixed]**, **7.9 transparency [new]**) | Assumed (credit system), Validated (transparency) | 9 |
| Media Library | 4 → 6 | 2 (8.4, 8.5) | Partially Validated (Sociality.io: 40.5% visual AI) | 6 |
| Command Palette / Agent | 5 → 6 | 1 (9.2 progress feeds + disclosure indicator) | Partially Validated (13% agentic AI adoption) | 6 |
| Navigation & App Shell | 4 | 0 (10.1, 10.2 redesigned) | N/A | 4 |
| Notifications & Alerts | 5 → 7 | 2 (11.6, 11.7) | N/A | 7 |
| Error & Edge Cases | 4 → 5 | 1 (12.2 expanded with 4-property framework) | Validated (UX Collective) | 5 |
| **AI Agent Flows** | 0 | 4 (13.1-13.4; 13.2 default-off, 13.4 edit-first) | **Low Confidence** (27% trust in autonomy) | 4 |
| **AI Governance & Safety** | 0 | 6 (14.1-14.4, 14.5 action risk, 14.6 error recovery) | Validated (OWASP, Mantlr) | 6 |
| **Decision Framework** | 0 | 1 (section 15) | Validated (Mantlr) | 1 |
| **Total MVP** | **72** | **33 AI-NATIVE** | | **105** |
| Post-MVP Flows | 9 | 9 (updated) | Partially Validated | 9 |
| **Grand Total** | **81** | **42 AI-NATIVE** | | **114** |

---

## Verification Steps

- [ ] All existing MVP flows preserved (manual mode as fallback)
- [ ] Goal-first onboarding (1.4) demonstrated with worked example, not step wizard
- [ ] Progressive disclosure (1.6) added to brand voice with "Why this voice?" expandable
- [ ] **Audience definition (1.7)** implemented before AI Compose — required for quality output
- [ ] Multimodal handoff (3.1) defined for compose → visual edit continuity
- [ ] **Edit-first workflow (3.1)** replaces "Approve All" as primary interaction — aligns with 78.4% editing behavior
- [ ] Confidence signals (3.3) use categorical labels (High/Medium/Low), not percentages
- [ ] Tiered approval gates (3.4) defined for every scheduling action with platform-specific constraints
- [ ] **Batch review & edit (3.11)** replaces batch-approve for repurposing — aligns with 78.4% editing behavior
- [ ] **Content research & ideation (3.13)** promoted to MVP — aligns with 59.5% ideation use case
- [ ] Contextual guardrails (4.8) risk matrix covers all calendar and scheduling operations
- [ ] Empty state (6.1) follows four-property framework (worked example, starting verb, exposed limits, action before speech)
- [ ] Progress feed (9.2) replaces raw streaming output with task-grouped cards
- [ ] **Disclosure status indicator (9.2)** added to progress feed — addresses 50% Gen Z unfollow rate
- [ ] Empty state table (12.2) expanded with 6 contexts using four-property framework
- [ ] Action risk classification (14.5) defined for all agent actions (reversible, compensable, non-reversible)
- [ ] Graceful error recovery (14.6) defined for all 6 MVP platforms with platform-specific messages
- [ ] **Autopilot default-off (13.2)** with explicit opt-in friction — aligns with 27% trust in autonomous agents
- [ ] Decision framework (15) maps pattern complexity to free/AI/autonomous feature tiers with research backing
- [ ] **AI-generated content is always visually distinguishable from human content**
- [ ] All AI flows respect platform rate limits and ToS constraints
- [ ] Offline/degraded AI behavior is defined for every AI-dependent flow
- [ ] TikTok SELF_ONLY restriction handled in all relevant flows
- [ ] X/Twitter API cost tracking included in agent panel and bulk operations
- [ ] **Free regeneration policy (7.8)** implemented — first regeneration after generation is free
- [ ] **Transparency & disclosure settings (7.9)** implemented — per-platform AI disclosure controls
- [ ] **Section numbering is consistent**: 14 (Governance), 15 (Decision Framework), 16 (Post-MVP)
- [ ] **All research citations in flows include dates and URLs**

---

## Execution Order

AI-native flows should be implemented in this order (updated with research-aligned priorities):

1. **Phase 1**: Goal-First Onboarding (1.4), Target Audience Definition (1.7 [new — prerequisite for AI quality]), AI Compose with Edit-First Workflow (3.1 [fixed]), Brand Voice Progressive Disclosure (1.6), Empty State Redesign (6.1)
2. **Phase 2**: Confidence Signals (3.3), Tiered Approval Gates (3.4), Content Research & Ideation (3.13 [new]), Contextual Guardrails (4.8), Progress Feed (9.2)
3. **Phase 3**: Empty State Table (12.2), Graceful Error Recovery (14.6), Action Risk Classification (14.5), Transparency Settings (7.9 [new]), Credit System Revisions (7.8 [fixed])
4. **Phase 4**: Autopilot Default-Off (13.2 [fixed]), AI Governance update (14.x), Decision Framework (15), Summary table update
