# SocialBeam — Design System

> Version 1.3.0
> Date: 2026-06-02
> Status: Living document
> Purpose: Canonical design intent for SocialBeam's Next.js 16 web application. All UI work must follow these blueprints.

---

## Section 1: Design Principles

### Principle 1: AI as Collaborator, Not Black Box

AI is the default operating mode but never opaque. Every AI action shows what it's doing (Agent Timeline), what it will do (Intent Preview), how confident it is (Confidence Badge), and why it flagged something (Escalation Pathway). Users control autonomy level via the Autonomy Dial.

### Principle 2: Edit-First UX

78.4% of users apply moderate or extensive editing to AI output before publishing. Every AI-generated surface must make editing the primary affordance, not "Approve" or "Publish." Batch operations must support inline batch-editing.

### Principle 3: AI as Collaborator, Not Black Box (Design Principle)

All AI surfaces must use components from the canonical AI component specs in `docs/design-assets/design-system/components/ai-components.md`. Every AI interaction must be traceable via the Action Audit Log.

### Principle 4: Free-First, AI Monetizes

The scheduling and publishing core is free forever. AI features are the monetization layer. Free users must never be blocked from core functionality. AI surfaces must clearly communicate value without creating friction for free-tier users.

### Principle 5: Human-in-the-Loop by Default

Only 27% trust fully autonomous AI agents. All autonomous features default to off. Explicit opt-in required with trust-building copy and two-step confirmation. Users can change autonomy level at any time.

### Principle 6: Invisible AI

AI is the engine, not the interface. The best AI UX doesn't feel like AI — it feels like the product "just works." This principle governs all user-facing surfaces where AI operates in the background.

#### Rules

| Rule | What It Means |
|------|---------------|
| **No "AI" labels on outcomes** | Never label features as "AI-powered," "AI-suggested," or "AI-generated" in user-facing UI. Say "Insights" not "AI Insights," "Suggested" not "AI-suggested." |
| **Surface outcomes, not processes** | Show the recommendation, metric, or next step. Don't show the AI's thinking, confidence score, or processing status unless the user explicitly asks. |
| **Ambient over explicit** | Use subtle status indicators (dots, pulses, color shifts) instead of panels, banners, or modals to signal AI activity. The AI should live in the user's periphery. |
| **Contextual prompts** | Replace generic "Ask AI" inputs with contextual suggestions based on real data: calendar gaps, trending topics, or content patterns. |
| **Progressive disclosure** | Always let users dig deeper into how a recommendation was reached — but don't force the explanation. Expandable "Why this?" or "View reasoning" links. |
| **Interrupt rarely** | Only interrupt the user when something needs human judgment (approval, confirmation, escalation). Routine operations happen silently. |

#### Exceptions — Where Explicit AI Is Correct

| Context | Why | Example |
|---------|-----|---------|
| Settings / Brand Voice | User is actively training the AI | `BrandConversationalUI` keeps explicit AI framing |
| Error / Escalation | User needs to understand what went wrong | `EscalationPathway` component (10.80) |
| Audit / Transparency | User needs to verify AI actions taken | `ActionAuditLog` component (10.79) |
| Credit / Billing | User needs to understand AI costs | AI credit usage in dashboard |

#### Naming Convention

| Instead of | Use |
|------------|-----|
| AI Insights | Insights |
| AI Status Panel | *(remove — use ambient indicator)* |
| AI-suggested | Suggested |
| AI-generated | Generated |
| AI Agent Status | Agent Status |
| Ask the AI agent | Ask |

---

## Section 2: Page Blueprints

### 2.1 App Shell (Navigation Layout)

**Route**: Root layout in `app/layout.tsx`

- Top bar: Logo (left), workspace switcher, AI status indicator (shows current Autonomy Level), notifications bell, user avatar menu
- Sidebar: Dashboard, Compose, Calendar, Analytics, Media Library, Agent Panel, Settings
- Command Palette: Cmd+K opens search + agent interface for natural language commands
- Footer: Credit balance indicator (if applicable), version info

**Tokens**: `bg-background`, `border-border`, `text-foreground`

### 2.2 Dashboard / Home

**Route**: `app/(dashboard)/page.tsx`

**Layout**: Full-width container (no `max-w-*` constraint) to maximize screen real estate for AI-native data density. Dashboard widgets, cards, and grids use the full available width. Only text-heavy sections (like worked examples) apply localized `max-w-*` constraints for readability.

- Welcome area with personalized greeting
- Quick actions: "What do you want to post about?" (Conversational Input component)
- Recent posts with status badges (draft, scheduled, published, failed)
- AI-generated insights summary ("Your top-performing post this week...")
- Content calendar preview (next 7 days)
- Empty state: AI activation point with conversational input, not static CTA

### 2.3 Compose Flow

**Route**: `app/(dashboard)/compose/page.tsx`

**Layout**: Constrained width (`max-w-3xl`) for focused composition. The compose form is a single-task interface where users need focus, not data density. Narrower width improves readability and reduces cognitive load during content creation.

- Primary: Conversational Input (10.75) — topic/URL/brief/image/repurpose modes
- Secondary: Traditional compose form as fallback (not primary)
- Platform selector with brand-colored badges per platform
- Confidence Badge (10.76) on each generated draft
- Escalation Pathway (10.80) on low confidence or platform constraint risk
- AI Disclosure Badge (10.81) — internal workflow, not shown to audiences by default
- Character counters using compose form tokens

### 2.4 Calendar & Scheduling

**Route**: `app/(dashboard)/calendar/page.tsx`

**Layout**: Responsive split-panel layout. Desktop (1024px+) uses a resizable split panel: calendar grid on the left (65%), insights sidebar on the right (35%) with a draggable divider. Mobile/tablet (<1024px) uses a single full-width calendar panel with an insights toggle button in the toolbar that opens a slide-over Sheet. Calendar views benefit from maximum screen real estate to display more days, events, and platform indicators simultaneously.

- Calendar view (month/week/day/list) with scheduled posts
- Resizable split panel on desktop — users can adjust the calendar/insights ratio
- Insights toggle via Sheet on mobile/tablet — preserves full calendar width on small screens
- Insights sidebar: AI tip banner, content gap analysis (month view), posting frequency (month view), quick stats (week/day views)
- AI-suggested time slots per platform with one-click accept or manual override
- Content gap analysis: "You have 3 open slots this week — want me to fill them?"
- Drag-and-drop rescheduling with keyboard support
- AI Weekly Content Plan (Flow 4.7) with Intent Preview (10.77) and Autonomy Dial (10.78)

### 2.5 Analytics & Reporting

**Route**: `app/(dashboard)/analytics/page.tsx` (TBD)

- Metric cards with trend indicators
- AI insights engine: natural language explanations of data changes
- Predictive engagement scoring on scheduled posts
- Post-level analytics with platform breakdown
- Chart colors using `--chart-1` through `--chart-10` tokens
- Automated report generation (AI-assisted)

### 2.6 Agent Panel

**Route**: Integrated as a slide-over panel or sidebar section

- Agent Timeline (10.74) for multi-step operations
- Action Audit Log (10.79) — transparent record of AI actions with undo
- Autonomy Dial (10.78) — per-workspace configuration
- Command interface for natural language operations

### 2.7 Settings & Configuration

**Route**: `app/(dashboard)/settings/page.tsx`

**Layout**: Full-width container. Settings pages contain data-dense tables (connected accounts, OAuth apps), multi-column grids, and configuration cards that benefit from additional horizontal space.

- Connected accounts management
- Brand Voice Setup (Flow 1.6): upload guidelines, past posts, tone samples
- AI Guardrails: Autonomy Dial default, safety filters, disclosure settings
- Transparency & Disclosure (Flow 7.9): per-platform AI disclosure configuration
- Credit system management
- Notification preferences

---

## Section 3: Design Aesthetic (2026)

### 3.1 Sharp, Futuristic, Professional

SocialBeam uses a **sharp, angular aesthetic** — no rounded pills, bubbles, or bubbly UI. This communicates enterprise-grade professionalism and futuristic polish.

| Rule | Convention |
|------|-----------|
| **Border radius** | `rounded-sm` (2px) everywhere. Never use `rounded-lg`, `rounded-xl`, `rounded-full`, or `rounded-md` |
| **Left border indicators** | Active states use `border-l-2 border-l-brand` (not rounded pills) for nav items, tabs, cards, buttons |
| **Typography** | Headings use `font-semibold tracking-tight`. Body uses `leading-relaxed`. Numbers use `font-mono tabular-nums` |
| **Glass effects** | Use `glass` (blur-12px), `glass-strong` (blur-20px), `glass-subtle` (blur-8px), or `glass-card` (blur-12px + saturate) for frosted surfaces |
| **Border strategy** | Use `border-border/60` on cards. Use `border-subtle` for ghost dividers, `border-strong` for focus states |
| **Micro-interactions** | Use `hover-lift` (translateY + shadow), `hover-scale`, `press-bounce`. Active nav items get `hover:translate-x-0.5` |
| **Animated borders** | Use `animated-border` utility for AI surfaces and premium elements (rotating gradient border) |
| **Section dividers** | Landing pages use `border-t border-border/50` between sections |
| **Antialiased text** | All text rendered with `antialiased` class (set globally) |
| **Surface layers** | Use `--surface-1`, `--surface-2`, `--surface-3` for content areas at different elevations. Use `--surface` as alias for `--surface-1` |
| **Theme transition** | Body transitions all surface properties over 200ms with `ease` timing |

### 3.2 Surface Elevation System

The color system uses a **4-level elevation ladder** defined by `--surface-1` through `--surface-3`. Elevation communicates depth through increasing lightness steps, not shadows. Each semantic token maps to an elevation level.

#### Light Mode (hue 260, steps of 0.01-0.02 L)

| Level | Token | OKLCH | Usage |
|-------|-------|-------|-------|
| Base | `--background` | `oklch(0.985 0.003 260)` | Page background |
| Elevated 1 | `--surface-1` | `oklch(0.975 0.003 260)` | Cards, panels, default surfaces |
| Elevated 2 | `--surface-2` | `oklch(0.960 0.004 260)` | Dropdowns, raised cards |
| Elevated 3 | `--surface-3` | `oklch(0.940 0.005 260)` | Modals, overlays, popovers |

#### Dark Mode (hue 260, steps of 0.04-0.06 L)

| Level | Token | OKLCH | Usage |
|-------|-------|-------|-------|
| Base | `--background` | `oklch(0.12 0.006 260)` | Deep page background |
| Elevated 1 | `--surface-1` | `oklch(0.16 0.008 260)` | Cards, panels, default surfaces |
| Elevated 2 | `--surface-2` | `oklch(0.21 0.010 260)` | Dropdowns, raised cards |
| Elevated 3 | `--surface-3` | `oklch(0.27 0.012 260)` | Modals, overlays, popovers |

#### Semantic Token Mapping

| Semantic | Light | Dark | Notes |
|----------|-------|------|-------|
| `--card` | `var(--surface-1)` | `var(--surface-1)` | Maps to elevation 1 |
| `--surface` | `var(--surface-1)` | `var(--surface-1)` | Content areas |
| `--popover` | `var(--surface-3)` | `var(--surface-3)` | Top-level overlays |
| `--secondary` | `var(--surface-1)` | `var(--surface-1)` | Subtle secondary surfaces |
| `--sidebar` | `oklch(0.970 0.003 260)` | `oklch(0.18 0.008 260)` | Distinct from bg and card |
| `--muted` | `oklch(0.950 0.004 260)` | `oklch(0.20 0.006 260)` | Between surface-1 and surface-2 |
| `--hover-surface` | `oklch(0.955 0.005 260)` | `oklch(0.22 0.010 260)` | Near surface-2 |
| `--active-surface` | `oklch(0.935 0.006 260)` | `oklch(0.25 0.012 260)` | Near surface-3 |
| `--accent` | `oklch(0.945 0.008 260)` | `oklch(0.24 0.015 260)` | Distinct from muted |
| `--ai-surface` | `oklch(0.950 0.012 280)` | `oklch(0.22 0.025 280)` | Purple hue 280, not 260 |

### 3.3 Border Strategy

Borders use a **layered approach** with three tiers:

| Tier | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Subtle | `--border-subtle` | `oklch(0.92 0.005 260 / 0.5)` | `oklch(0.22 0.01 260 / 0.4)` | Ghost dividers, decorative lines |
| Default | `--border` | `oklch(0.88 0.008 260)` | `oklch(0.25 0.012 260)` | Card borders, input borders |
| Strong | `--border-strong` | `oklch(0.82 0.01 260)` | `oklch(0.35 0.015 260)` | Active states, focus rings |

Card components use `border border-border/60` instead of `ring-1 ring-border` for more visible edges. Dark mode cards use `dark:shadow-lg dark:shadow-black/40`.

### 3.4 Primary & Brand Colors

| Token | Light | Dark |
|-------|-------|------|
| `--primary` | Electric coral (`oklch(0.60 0.22 38)`) | Brighter coral (`oklch(0.68 0.20 38)`) |
| `--brand` | Coral accent (`oklch(0.65 0.22 38)`) | Lighter coral (`oklch(0.72 0.20 38)`) |
| `--brand-soft` | Soft tint (`oklch(0.92 0.06 38)`) | Deep tint (`oklch(0.35 0.10 38)`) |

---

## Section 4: Design Tokens

All tokens are defined as CSS variables in `app/globals.css`. See the `@theme inline` block for Tailwind v4 mappings.

### Color System

All tokens are defined as CSS variables in `app/globals.css`. See the `@theme inline` block for Tailwind v4 mappings.

#### Base Surfaces

| Category | Token | Variable | Purpose |
|----------|-------|----------|---------|
| Base | `bg-background` | `--background` | Page background |
| Base | `text-foreground` | `--foreground` | Primary text |
| Elevation | `bg-surface-1` | `--surface-1` | Cards, panels (elevated 1) |
| Elevation | `bg-surface-2` | `--surface-2` | Dropdowns, raised cards (elevated 2) |
| Elevation | `bg-surface-3` | `--surface-3` | Modals, overlays (elevated 3) |
| Base | `bg-card` | `--card` | Maps to `--surface-1` |
| Base | `bg-primary` | `--primary` | Primary actions |
| Base | `bg-destructive` | `--destructive` | Error/danger states |
| Base | `bg-surface` | `--surface` | Content surface (maps to `--surface-1`) |
| Border | `border-border` | `--border` | Default borders |
| Border | `border-border-subtle` | `--border-subtle` | Ghost dividers |
| Border | `border-border-strong` | `--border-strong` | Active/focus states |

#### Brand & Semantic

| Category | Token | Variable | Purpose |
|----------|-------|----------|---------|
| Brand | `bg-brand` | `--brand` | Brand accent (coral/orange hue 38) |
| Semantic | `bg-success` | `--success` | Success indicators |
| Semantic | `bg-warning` | `--warning` | Warning indicators |
| AI | `bg-ai-surface` | `--ai-surface` | AI surfaces (purple hue 280) |
| Status | `bg-post-draft` through `bg-post-failed` | `--post-*` | Post status badges |

### Border Radius

**Base radius: `0.125rem` (2px)**. All derived tokens scale from this sharp base.

| Token | Value |
|-------|-------|
| `rounded-sm` | `calc(var(--radius) * 0.6)` ≈ 1px |
| `rounded-md` | `calc(var(--radius) * 0.8)` ≈ 2px |
| `rounded-lg` | `var(--radius)` = 2px |
| `rounded-xl` | `calc(var(--radius) * 1.4)` ≈ 3px |

**Convention**: Use `rounded-sm` for all UI elements. Never use `rounded-lg`, `rounded-xl`, `rounded-full`, or `rounded-md`.

Full token definitions in `app/globals.css`. The `:root` block (lines 7-132) defines light mode, the `.dark` block (lines 140-258) defines dark mode, and the `@theme inline` block maps CSS variables to Tailwind v4 utility classes.

#### CSS Utility Classes

| Utility | Purpose | Effect |
|---------|---------|--------|
| `.hover-lift` | Elevated card hover | `translateY(-3px)` + dual-layer shadow, 200ms cubic-bezier |
| `.hover-scale` | Subtle zoom hover | `scale(1.02)` transition |
| `.press-bounce` | Button press feedback | Bounce animation on active |
| `.glow-brand` | Brand emphasis | Pulsing brand glow animation |
| `.click-ripple` | Material-style press | Radial ripple effect on click |
| `.edge-highlight` | Top-edge light catch | 1px top border simulating overhead lighting |
| `.recessed` | Input inset shadow | `inset 0 1px 3px` shadow for depth |
| `.glow-border` | Focus elevation | Outer ring + glow for focus states |
| `.surface-inset` | Nested panel depth | Top light + bottom shadow inset |
| `.animated-border` | Premium/AI surfaces | Rotating gradient border (CSS Houdini `@property`) |
| `.glass` | Frosted overlay | `backdrop-filter: blur(12px)` + 80% card opacity |
| `.glass-strong` | Dense frosted overlay | `backdrop-filter: blur(20px)` + 90% card opacity |
| `.glass-subtle` | Light frosted overlay | `backdrop-filter: blur(8px) saturate(1.2)` + 85% opacity |
| `.glass-card` | Card glass effect | `backdrop-filter: blur(12px) saturate(1.4)` + 80% opacity |
| `.border-subtle` | Ghost divider | Border at 50% opacity of `--border` |
| `.skeleton-shimmer` | Loading state | Horizontal gradient shimmer animation |
| `.scrollbar-thin` | Custom scrollbar | 6px thumb with muted-foreground color |

---

## Section 5: Component Requirements

All UI components must use shadcn/ui primitives. See `.cursor/rules/design-assets-enforcement.mdc` for the complete component mapping table and styling rules.

### 5.1 Base Components

Button, Card, Input, Label, Badge, Dialog, Toast, Select, Switch, Separator, Avatar, Tabs, Tooltip, DropdownMenu, Progress, Skeleton, Accordion.

### 5.2 AI Components

Seven specialized AI interaction components defined in `docs/design-assets/design-system/components/ai-components.md`:

| Component | Section | Purpose |
|-----------|---------|---------|
| AI Agent Timeline | 10.74 | Real-time AI operation progress |
| Conversational Input | 10.75 | Natural language content generation |
| Confidence Badge | 10.76 | Categorical AI confidence display |
| Intent Preview | 10.77 | Multi-step action approval |
| Autonomy Dial | 10.78 | Per-workspace AI autonomy control |
| Action Audit Log | 10.79 | Transparent AI action record |
| Escalation Pathway | 10.80 | Options-not-blockers on AI errors |
| AI Disclosure Badge | 10.81 | AI content transparency |

### 5.3 Icon Library

Phosphor Icons (`@phosphor-icons/react`) — see `components.json` for configuration.

---

## Section 6: Layout Patterns

### 6.1 AI-Native Full-Width Layout

**Principle**: AI-native dashboards benefit from full-width layouts that maximize data density and give AI-generated content room to breathe.

**Rules**:
- **Full-width pages**: Dashboard, Calendar, Settings — use full-width containers (no global `max-w-*` constraints)
- **Constrained pages**: Compose — use `max-w-3xl` for focused, single-task interfaces
- Apply localized `max-w-*` only to text-heavy sections where readability matters (e.g., `max-w-3xl` for worked examples, long-form content)
- Data-heavy sections (cards, grids, analytics widgets) use full width with proper internal spacing
- Maintain consistent padding via layout: `p-4 lg:p-6`

**Page Layout Reference**:

| Page | Layout | Rationale |
|------|--------|-----------|
| Dashboard | Full-width | Data-dense widgets, multiple cards, AI insights need space |
| Calendar | Full-width | Calendar grids, event density benefit from maximum width |
| Settings | Full-width | Tables, account cards, configuration grids need room |
| Compose | `max-w-3xl` | Focused composition task — narrow width reduces cognitive load |

**Rationale**: AI-native apps display multiple data streams, insights cards, and AI-generated content simultaneously. Constraining the entire page wastes valuable screen real estate that could show more context, larger previews, or additional widgets. Single-task flows (compose) are the exception — they benefit from focused, narrower layouts.

**Example**:
```tsx
// Dashboard page — full width
<div className="space-y-8">
  {/* Cards and grids use full width */}
  <div className="grid gap-6 lg:grid-cols-2">
    <RecentPostsList />
    <AIInsightsCard />
  </div>

  {/* Text-heavy section — locally constrained */}
  <div className="mx-auto max-w-3xl">
    <WorkedExampleEmptyState />
  </div>
</div>

// Compose page — constrained for focus
<div className="mx-auto max-w-3xl">
  <ComposeForm />
</div>
```

---

## Section 6: Interaction Patterns

### 6.1 Empty States

Follow the four-property framework (UX Collective, May 2026): icon, title, description, CTA. AI-native empty states include a conversational input field as the primary CTA, not a static button.

### 6.2 Error States

AI-native error resolution: diagnose the failure, explain in plain language, offer one-click remediation. Use Escalation Pathway (10.80) component. Follow service recovery paradox (Mantlr Pattern 6, 2026).

### 6.3 Status Indicators

Always combine color + icon + text. Never use color alone. Use semantic tokens: `bg-post-draft`, `bg-post-published`, `bg-post-failed`, etc.

### 6.4 Dark Mode

Automatic via CSS `.dark` class variables in `app/globals.css`. All components using semantic tokens adapt automatically. No manual dark mode detection in components.

**Dark Mode Elevation Principles:**
- Elevation communicates through **lightness steps**, not shadows. Each surface level is 0.04-0.06 L lighter than the level below it.
- Cards (`--surface-1`, L=0.16) sit on background (L=0.12), modals (`--surface-3`, L=0.27) sit above everything.
- Accent colors are **desaturated and lightened** in dark mode to prevent "blooming" against dark backgrounds.
- Borders use `rgba(255,255,255,0.12)`-equivalent opacity — `--border` at L=0.25 is visibly lighter than in light mode.
- Shadows are more opaque in dark mode: `dark:shadow-black/40` vs `shadow-sm` in light mode.
- Theme transitions over 200ms with `ease` timing for smooth light/dark switching.

### 6.5 Accessibility

- Touch/click targets: minimum `min-h-10` (40px)
- Icon-only buttons require `aria-label`
- Focus rings provided by Radix/shadcn — do not remove
- Keyboard navigation: Cmd+K for command palette, standard tab order

---

## Section 7: Typography

| Role | Font | Variable |
|------|------|----------|
| Body | Inter (Geist Sans fallback) | `--font-sans` |
| Mono | Geist Mono | `--font-geist-mono` |
| Headings | Inter (same as body) | `--font-heading` |

Font definitions in `app/layout.tsx`.

---

*Document Version: 1.3.1*
*Last Updated: 2026-06-02*
*Changes:*
- *v1.3.0: Surface elevation ladder (surface-1/2/3), layered border strategy (border-subtle/default/strong), enhanced CSS utilities (edge-highlight, recessed, glow-border, surface-inset, animated-border, glass-subtle, glass-card), improved hover-lift animation, 200ms theme transitions*
- *v1.3.1: Full surface audit — all overlay backdrops migrated to --overlay token (media-preview, media-card, external-media-grid). Zero hardcoded surface colors remain across auth, landing, dashboard, compose, settings, and analytics surfaces. Platform preview gradients (Instagram, TikTok) intentionally use brand-matching colors.*
*Tech Stack: Next.js 16, React 19, Tailwind CSS v4, shadcn/ui (radix-sera style), Phosphor Icons*
