# SocialBeam — Design System

> Version 1.0.0
> Date: 2026-05-18
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

## Section 3: Design Tokens

All tokens are defined as CSS variables in `app/globals.css`. See the `@theme inline` block for Tailwind v4 mappings.

### Color System

| Category | Token | Variable | Purpose |
|----------|-------|----------|---------|
| Base | `bg-background` | `--background` | Page backgrounds |
| Base | `text-foreground` | `--foreground` | Primary text |
| Base | `bg-card` | `--card` | Card surfaces |
| Base | `bg-primary` | `--primary` | Primary actions |
| Base | `bg-destructive` | `--destructive` | Error/danger states |
| Brand | `bg-brand` | `--brand` | Brand accent (Cohere coral) |
| Semantic | `bg-success` | `--success` | Success indicators |
| Semantic | `bg-warning` | `--warning` | Warning indicators |
| AI | `bg-ai-surface` | `--ai-surface` | AI agent surfaces |
| Status | `bg-post-draft` through `bg-post-failed` | `--post-*` | Post status badges |

### Border Radius

| Token | Value |
|-------|-------|
| `rounded-sm` | `calc(var(--radius) * 0.6)` |
| `rounded-md` | `calc(var(--radius) * 0.8)` |
| `rounded-lg` | `var(--radius)` |
| `rounded-xl` | `calc(var(--radius) * 1.4)` |

Full token definitions in `app/globals.css` lines 7-49 (`@theme`) and `:root` / `.dark` blocks (lines 51-118).

---

## Section 4: Component Requirements

All UI components must use shadcn/ui primitives. See `.cursor/rules/design-assets-enforcement.mdc` for the complete component mapping table and styling rules.

### 4.1 Base Components

Button, Card, Input, Label, Badge, Dialog, Toast, Select, Switch, Separator, Avatar, Tabs, Tooltip, DropdownMenu, Progress, Skeleton, Accordion.

### 4.2 AI Components

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

### 4.3 Icon Library

Phosphor Icons (`@phosphor-icons/react`) — see `components.json` for configuration.

---

## Section 5: Layout Patterns

### 5.1 AI-Native Full-Width Layout

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

*Document Version: 1.0.1*
*Last Updated: 2026-05-21*
*Tech Stack: Next.js 16, React 19, Tailwind CSS v4, shadcn/ui (radix-sera style), Phosphor Icons*
