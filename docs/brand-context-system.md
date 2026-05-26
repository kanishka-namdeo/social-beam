# Brand Context System — AI-Native Two-Tiered Workflow

> Draft Design — May 2026
>
> This document specifies the two-tiered brand context system that powers all AI features in SocialBeam: Reddit trend analysis, AI compose, content repurposing, scheduling optimization, and analytics insights.

---

## Problem

Current state: `UserProfile` and `BrandVoice` models exist but only store sparse placeholders (`bio: "N/A"`, `tone: "N/A"`, `audience: {}`). All AI features receive meaningless context and produce generic output.

AI-native apps (GraceAI Fingerprint, Robynn AI, Youanai "Business DNA") solve this differently: **the AI does the work, not the user.** Instead of 10-step form wizards, the user gives one input (a URL or a sentence) and the system fills in the rest.

---

## Design Principles

1. **AI does the work**: User gives one input → AI crawls, analyzes, and fills in 90% of context
2. **Progressive discovery**: Start with a spark (URL or text), validate, then refine — don't front-load configuration
3. **Confirmation over creation**: Show the user a filled-in card, not a blank form. They confirm or adjust, they don't build from scratch
4. **Continuous learning**: Brand context improves itself through post edits, trend dismissals, and periodic re-analysis
5. **Tier separation**: Brand context (platform-agnostic) vs Platform context (how the brand adapts per channel)

---

## Two-Tiered Architecture

### Tier 1: Brand Context (Who You Are)

Platform-agnostic. Your brand doesn't change between Instagram and LinkedIn.

| Dimension | Fields | Inferred From |
|-----------|--------|---------------|
| **Identity** | `businessName`, `tagline`, `websiteUrl`, `industry` | Website hero/about pages |
| **Product** | `productDesc` (2-3 sentences) | Website product/features pages |
| **Voice** | `tonePreset`, `voiceDescription`, `bannedWords`, `voiceExamples` | Blog posts, past social content |
| **Audience** | `audienceType`, `demographics`, `interests`, `painPoints`, `competitors` | Inferred from who they sell to + content themes |
| **Goals** | `goals[]` (awareness, leads, sales, community, thought_leadership) | User selects or AI infers from site CTAs |

### Tier 2: Platform Context (How You Adapt)

Per-connected-platform. How your brand shows up differently on each channel.

| Dimension | Fields | AI Default Source |
|-----------|--------|-------------------|
| **Platform Tone** | `platformTone` | Brand voice × platform conventions |
| **Content Mix** | `contentMix` (text %, image %, video %, carousel %) | Industry best practices |
| **Posting Cadence** | `postingCadence` | Industry best practices |
| **Hashtag Strategy** | `hashtagStrategy` (count, style) | Platform norms |
| **Visual Style** | `visualStyle` | Brand colors × platform aesthetics |
| **Engagement Style** | `engagementStyle` | Brand voice × platform conventions |
| **Platform Rules** | `platformRules[]` | Safety defaults + user overrides |

---

## AI-Native Workflow

### Phase 1: The Spark (30 seconds)

Single conversational surface — not a multi-step wizard:

```
"Tell me about your brand and I'll set everything up."

[Text input / URL paste / File drop]
```

User types: *"We're a B2B marketing agency helping SaaS companies grow their LinkedIn presence. Professional but not stuffy. Check our site: acmemarketing.com"*

AI then:
1. Crawls the website (prioritizes /about, /blog, /mission — semantic zone weighting: hero copy 3x, headings 2x, nav/footer 0x)
2. If connected accounts exist, pulls last 10 posts per platform
3. Extracts: business name, tagline, industry, voice patterns, audience, content themes
4. Presents a **filled-in brand context card** for confirmation

```
Here's what I found:

Brand: Acme Marketing
Tagline: "Growth-focused marketing for SaaS"
Industry: Marketing / SaaS
Voice: Professional, conversational, data-driven
  - Avg sentence length: 14 words
  - Uses questions frequently
  - No emojis in professional content
  - References data/case studies often

Audience: B2B SaaS founders & marketing managers
  Pain points: LinkedIn growth, content strategy, lead generation

Suggested goals: Leads, Thought Leadership

[Looks right]  [Edit something]  [Not quite, try again]
```

### Phase 2: Platform-Specific Discovery (Auto-Suggested)

After Tier 1 confirmation, AI generates platform contexts:

```
Based on your brand, here's how I'd adapt for each platform:

LinkedIn (connected):
  Tone: Professional with data points
  Content: 60% text insights, 40% case studies
  Cadence: 3x per week
  Hashtags: 3-5 niche (#SaaSGrowth, #B2BMarketing)

Instagram (connected):
  Tone: Approachable, visual-first
  Content: 80% carousels/infographics, 20% reels
  Cadence: 2x per week
  Hashtags: 10-15 mixed

[Accept all]  [Adjust individual platform]
```

### Phase 3: Validation (Passive)

AI generates 2-3 sample posts inline:

```
Here's what posts would look like:

LinkedIn: "Most SaaS companies are leaving LinkedIn leads on the 
table. We analyzed 500 posts from top B2B accounts..."

[These match our voice]  [Needs adjustment]
```

If "needs adjustment," user describes what's off in natural language: *"Make it less formal on Instagram"* → AI adjusts and re-generates.

### Phase 4: Continuous Learning (Background)

- Every post edit → context refinement ("removed emoji → mark emoji usage low for LinkedIn")
- Every trend dismissal → audience refinement ("B2B SaaS doesn't care about Instagram trends")
- Weekly prompt: *"Noticed more posts about AI tools — update content themes?"*
- Quarterly check: *"Voice hasn't been refreshed in 90 days — re-analyze recent posts?"*

---

## How This Differs from Current Spec (Flows 1.6, 1.7)

| Aspect | Current Spec (1.6, 1.7) | AI-Native Approach |
|--------|------------------------|-------------------|
| **Input** | User uploads files, picks presets, fills forms | User gives one input (URL or text), AI does the rest |
| **Platform setup** | User configures each platform manually | AI generates sensible defaults, user adjusts |
| **Validation** | User rates 3 test posts with thumbs up/down | User reads samples, describes what feels off |
| **Maintenance** | User goes to settings to update | AI suggests updates, user approves or ignores |
| **Friction** | High — multiple steps, multiple decisions | Low — conversational, progressive |
| **Time** | 5-10 minutes | 30-60 seconds to start |

---

## Schema Design

### New Models (replaces `UserProfile` + `BrandVoice`)

```prisma
model BrandContext {
  id              String   @id @default(cuid())
  workspaceId     String   @unique
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  // Tier 1 — Brand Identity
  businessName    String?
  tagline         String?
  websiteUrl      String?
  industry        String?           // marketing | fitness | saas | ecommerce | etc
  productDesc     String?           // What you sell (2-3 sentences)
  
  // Tier 1 — Voice
  tonePreset      String?           // professional | casual | witty | educational | bold
  voiceDescription String?          // Free-form voice description
  bannedWords     String[]          // Words/phrases never to use
  voiceExamples   Json?             // [{ text: "...", source: "past-post" | "guideline" }]
  
  // Tier 1 — Audience
  audienceType    String?           // b2b | b2c | both
  demographics    Json?             // { ageRange, locations, incomeLevel }
  interests       String[]          // Topics the audience cares about
  painPoints      String[]          // Problems the brand solves
  competitors     String[]          // Competitor names/accounts
  
  // Tier 1 — Goals
  goals           String[]          // awareness | leads | sales | community | thought_leadership
  
  // Metadata
  trainingStatus  String   @default("untrained")  // untrained | training | trained | needs_refresh
  lastTrainedAt   DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model PlatformContext {
  id              String   @id @default(cuid())
  brandContextId  String
  brandContext    BrandContext @relation(fields: [brandContextId], references: [id], onDelete: Cascade)
  
  platform        String   // instagram | facebook | x | linkedin | tiktok | pinterest
  
  // Tier 2 — Platform-Specific
  platformTone    String?   // How tone shifts on this platform
  contentMix      Json?     // { text: %, image: %, video: %, carousel: % }
  postingCadence  String?   // daily | 3x_week | weekly | etc
  hashtagStrategy Json?     // { count: { min, max }, style: "mixed" | "branded" | "niche" }
  visualStyle     String?   // bright | dark | minimal | warm | etc
  engagementStyle String?   // thoughtful_replies | witty_oneliners | professional | casual
  platformRules   String[]  // "Never post X on this platform"
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([brandContextId, platform])
}
```

### Models to Deprecate

| Current Model | Reason | Replacement |
|---------------|--------|-------------|
| `UserProfile` | Sparse JSON blobs, unused fields, overlaps with both new models | `BrandContext` (audience) + `PlatformContext` |
| `BrandVoice` | Minimal — only tonePreset, description, examples, perPlatform JSON | `BrandContext` + `PlatformContext` |

Migration path: On migration, map existing `UserProfile.bio` → `BrandContext.productDesc`, `UserProfile.tone` → `BrandContext.tonePreset`, `UserProfile.audience` → `BrandContext.demographics/interests/painPoints`, `BrandVoice.*` → corresponding `BrandContext`/`PlatformContext` fields.

---

## Agent Architecture (LangGraph)

### Graph Structure

```
User input (URL / text / files)
         │
         ▼
  ┌──────────────────┐
  │ contextCollector │  Crawl URL, pull connected posts, read files
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ brandAnalyzer    │  Extract voice, audience, industry, goals
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ platformAdapter  │  Generate per-platform defaults
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ sampleGenerator  │  Create 2-3 validation posts
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ contextWait      │  Interrupt for user confirmation
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ contextSaver     │  Persist confirmed context to DB
  └──────────────────┘
```

### Node Responsibilities

| Node | Type | Responsibility |
|------|------|---------------|
| `contextCollector` | Model | Crawls website (voice-rich pages), pulls recent posts from connected accounts, parses uploaded files |
| `brandAnalyzer` | Model | Runs linguistic analysis: sentence structure, vocabulary fingerprinting, tone classification, audience inference, content theme extraction |
| `platformAdapter` | Model | For each connected platform: suggests tone shift, content mix, cadence, hashtag strategy, platform rules |
| `sampleGenerator` | Model | Generates 2-3 sample posts using the proposed context (one per platform) |
| `contextWait` | Interrupt | Pauses for user review — confirms, edits, or rejects |
| `contextSaver` | Tools | Writes confirmed `BrandContext` + `PlatformContext` records to database |

### State Schema

```typescript
const BrandContextState = Annotation.Root({
  ...MessagesAnnotation.spec,
  workspaceId: Annotation<string>(),
  userId: Annotation<string>(),
  
  // Input
  userBrandInput: Annotation<string>({ default: () => "", reducer: (_c, n) => n }),
  websiteUrl: Annotation<string>({ default: () => "", reducer: (_c, n) => n }),
  uploadedFiles: Annotation<string[]>({ default: () => [], reducer: (c, n) => [...c, ...n] }),
  
  // Crawled data
  crawledContent: Annotation<Record<string, string>>({ default: () => ({}), reducer: (c, n) => ({ ...c, ...n }) }),
  connectedPosts: Annotation<RedditPost[]>({ default: () => [], reducer: (c, n) => [...c, ...n] }),
  
  // Analysis results (Tier 1)
  brandContextDraft: Annotation<Partial<BrandContextType>>({ default: () => ({}), reducer: (c, n) => ({ ...c, ...n }) }),
  
  // Platform defaults (Tier 2)
  platformContextsDraft: Annotation<Map<string, Partial<PlatformContextType>>>({ default: () => new Map(), reducer: (c, n) => { const m = new Map(c); n.forEach((v, k) => m.set(k, v)); return m; } }),
  
  // Validation
  samplePosts: Annotation<GeneratedSample[]>({ default: () => [], reducer: (c, n) => [...c, ...n] }),
  userFeedback: Annotation<string>({ default: () => "", reducer: (_c, n) => n }),
  
  // Flow control
  currentStep: Annotation<string>({ default: () => "collect", reducer: (_c, n) => n }),
  __tool_loop_iteration: Annotation<number>({ default: () => 0, reducer: (_c, n) => n }),
});
```

---

## Research Summary

**GraceAI Fingerprint (2026)**: Multi-source brand DNA system. Crawls website, X, YouTube → generates separate fingerprints per platform → applies everywhere automatically. Dual representation: human-readable voice + machine-searchable semantic memory (RAG). Source: [getgrace.ai/features/fingerprint](https://getgrace.ai/features/fingerprint)

**Robynn AI Brand DNA (2026)**: Upload guidelines + past content → extracts voice, positioning, audience, visual identity → structured Brand DNA distributed to specialized agents. Active learning from corrections/approvals. Source: [robynn.ai/product](https://robynn.ai/product)

**tonethief (2026)**: CLI tool that crawls up to 20 pages, prioritizes voice-rich content (/about, /blog, /mission), applies semantic zone weighting (hero copy 3x, headings 2x, nav/footer 0x), produces deployable VOICE.md. Source: [github.com/SlashImagine/tonethief](https://github.com/SlashImagine/tonethief)

**Hypotenuse AI (2026)**: Learns from real content (PDPs, listings, brand guides, campaigns) — "voice comes from examples, not adjectives." Adapts tone per channel while keeping core voice intact. Banned words, required terminology, formatting rules enforced automatically. Source: [hypotenuse.ai/features/brand-voice](https://www.hypotenuse.ai/features/brand-voice)

---

## Impact on Existing AI Features

### Reddit Trend Analysis

**Current**: AI receives `bio: "N/A"`, `tone: "N/A"`, `audience: {}` → produces generic relevance scores.

**After**: AI receives full brand + platform context:
```
Brand: "Acme Marketing — B2B SaaS for social media managers"
Industry: marketing
Voice: professional
Audience: B2B, marketing agencies, 25-45
Goals: leads, thought_leadership
Platforms: { linkedin: professional tone, 3x/week, niche hashtags }
```

Result:
- "LinkedIn algorithm changes" → **highly relevant** (matches industry + platform)
- "Instagram meme trends" → **low relevance** (user is B2B, not B2C Instagram)
- "AI content ethics" → **relevant + controversial** (matches industry, risk = medium)

### AI Compose

- Brand context injected into every generation prompt automatically
- Platform context applied per selected platform (tone, hashtags, content mix)
- No more "generic AI" output — the AI knows who it's writing for

### Content Repurposing

- Platform context drives how content transforms: text → LinkedIn carousel, text → Instagram visual suggestion, text → X thread
- Each variant respects its platform's tone and rules

---

## Implementation Phases

| Phase | Scope | Deliverable | Dependencies |
|-------|-------|-------------|-------------|
| **1** | Schema + Prisma migration | `BrandContext`, `PlatformContext` models; deprecation of `UserProfile`, `BrandVoice` | None |
| **2** | Brand Analyzer agent | LangGraph graph: crawl → analyze → extract; website crawler utility | Phase 1 |
| **3** | Conversational UI | Single input surface → streamed results → confirm/edit card | Phase 2 |
| **4** | Platform context generator | Per-platform defaults from brand context; connected account integration | Phase 1, 2 |
| **5** | Wire into AI features | Reddit analysis, Compose form, all AI surfaces consume brand + platform context | Phase 1-4 |
| **6** | Continuous learning | Post-edit feedback loop → context refinement agent; periodic re-analysis prompts | Phase 5 |

---

## Breaking Changes & Migrations

**UserProfile + BrandVoice deprecation**:
- Both models will be removed after migration
- Existing data mapped to new models where possible
- `UserProfile` fields that don't map cleanly (`postTypes`, `imageAnalysis`) → stored in `BrandContext.voiceExamples` JSON for future analysis
- `BrandVoice.perPlatform` JSON → split into individual `PlatformContext` records

**API changes**:
- All AI features currently reading `UserProfile` → switch to `BrandContext` + `PlatformContext`
- `lib/reddit/trending-analysis.ts` prompt construction needs rewriting to consume structured context
- Compose form AI generation needs to inject platform context per selected platform

---

## Security Considerations

**Brand context data**:
- Contains business-sensitive information (competitor lists, strategy, product details)
- Must be encrypted at rest (workspace-scoped)
- Website crawling should respect `robots.txt`
- Uploaded files should be validated for type and size before processing

**AI analysis**:
- Crawled website content stored only for analysis — not persisted long-term
- Connected post data pulled via existing OAuth tokens — no new credential requirements
- User feedback on samples (natural language) stored as part of the voice refinement history

---

## Verification Steps

- [ ] `pnpm run typecheck` (0 errors)
- [ ] `pnpm run lint` (0 warnings)
- [ ] `pnpm run build` (success)
- [ ] Prisma migration runs cleanly (no data loss for existing workspaces)
- [ ] Brand context card renders with AI-analyzed data
- [ ] Platform context cards render per connected platform
- [ ] Reddit analysis produces differentiated scores with vs. without brand context
- [ ] Compose form injects brand + platform context into generation prompts
- [ ] Agent graph completes within 30 seconds for typical website crawl
