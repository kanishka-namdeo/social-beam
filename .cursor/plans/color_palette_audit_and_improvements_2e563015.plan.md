---
name: Color Palette Audit and Improvements
overview: Critical assessment of the OKLCH-based color palette across light and dark modes, identifying contrast, consistency, and accessibility issues, with specific improvements to globals.css.
todos: []
isProject: false
---

# Color Palette Audit and Improvements

## Current Architecture

The app uses Tailwind CSS v4 with OKLCH color space. All color variables are defined in [globals.css](app/globals.css), with `:root` for light mode and `.dark` overrides. The brand is an orange (hue ~38), with semantic tokens for success (green ~149), warning (amber ~85), info (blue ~220), and destructive (red ~27).

---

## Critical Findings

### 1. Chart Colors Lack Perceptual Separation (Light & Dark)

All 5 chart colors are monochromatic teals/cyans (hue ~181-188):

```
--chart-1: oklch(0.855 0.138 181.071)  -- light mint
--chart-2: oklch(0.704 0.14 182.503)   -- medium teal
--chart-3: oklch(0.6 0.118 184.704)    -- darker teal
--chart-4: oklch(0.511 0.096 186.391)  -- dark teal
--chart-5: oklch(0.437 0.078 188.216)  -- darkest teal
```

**Problem:** In the [Audience Growth Chart](components/analytics/audience-growth-chart.tsx), all lines are near-identical hues. When rendered on a white background, chart-4 (L=0.511) and chart-5 (L=0.437) are too dark and low-contrast. More critically, they share nearly identical hues, making multi-line differentiation rely solely on lightness, which is poor for colorblind users. The chart colors also don't relate to the brand or platform-specific colors.

**Fix:** Diversify chart palette across different hues while maintaining harmony:

```css
/* Light mode */
--chart-1: oklch(0.72 0.16 180);   /* teal (keep) */
--chart-2: oklch(0.68 0.18 38);    /* brand orange */
--chart-3: oklch(0.70 0.16 250);   /* blue */
--chart-4: oklch(0.65 0.18 149);   /* green */
--chart-5: oklch(0.68 0.20 300);   /* purple */

/* Dark mode */
--chart-1: oklch(0.75 0.16 180);
--chart-2: oklch(0.72 0.18 38);
--chart-3: oklch(0.75 0.16 250);
--chart-4: oklch(0.72 0.16 149);
--chart-5: oklch(0.75 0.18 300);
```

### 2. Destructive Color Insufficient Lightness Increase in Dark Mode

Light: `oklch(0.577 0.245 27.325)`
Dark: `oklch(0.704 0.191 22.216)`

**Problem:** The dark mode destructive (L=0.704) increases lightness by only 0.127, but chroma drops from 0.245 to 0.191. This makes it appear washed out and less visually impactful in dark mode, where destructive states need MORE prominence, not less. The hue also shifts from 27.3 to 22.2 (towards red), but the lower chroma undermines urgency.

**Fix:** Increase chroma in dark mode destructive while raising lightness appropriately:

```css
/* Dark mode */
--destructive: oklch(0.72 0.22 25);
--post-failed: oklch(0.72 0.22 25);
--ai-confidence-low: oklch(0.72 0.22 25);
--compose-counter-error: oklch(0.72 0.22 25);
```

### 3. Info Color Has Low Chroma in Both Modes

Light: `oklch(0.72 0.14 220)` -- chroma of only 0.14
Dark: `oklch(0.75 0.14 220)` -- same low chroma

**Problem:** The info color is too muted to stand out as a distinct semantic state. At chroma 0.14, it competes visually with muted-foreground and could be confused with neutral text. Compare to success (chroma 0.16) and warning (chroma 0.16) -- info should be equally vibrant.

**Fix:** Boost info chroma to match the vibrancy of other semantic colors:

```css
/* Light mode */
--info: oklch(0.70 0.18 230);

/* Dark mode */
--info: oklch(0.78 0.18 230);
```

Also update dependent tokens:
```css
/* Light mode */
--post-publishing: oklch(0.70 0.18 230);

/* Dark mode */
--post-publishing: oklch(0.78 0.18 230);
```

### 4. Border Color in Dark Mode Uses Pure Alpha, No Hue

```css
--border: oklch(1 0 0 / 10%);       /* pure white at 10% opacity */
--sidebar-border: oklch(1 0 0 / 12%);
--input: oklch(1 0 0 / 15%);
```

**Problem:** Using achromatic white with alpha for borders in dark mode creates a cold, harsh appearance. It also means borders don't harmonize with the warm undertone of the rest of the dark theme (which uses hue 106.5 for foreground/sidebar). Pure white alpha borders also have lower perceived contrast on colored surfaces like cards.

**Fix:** Add a subtle warm undertone to dark mode borders:

```css
--border: oklch(0.30 0.015 106.5);
--input: oklch(0.32 0.018 106.5);
--sidebar-border: oklch(0.30 0.015 106.5);
```

### 5. Warning Color May Lack Sufficient Contrast in Light Mode

Light: `oklch(0.75 0.16 85)` -- fairly light amber

**Problem:** On white/cream backgrounds, the warning color at L=0.75 with chroma 0.16 may not meet WCAG AA contrast ratios when used for text. The amber hue at this lightness can appear "washed out" on light backgrounds, especially for users with reduced color vision. When used as text (e.g., `text-warning` on `bg-card`), it likely falls below the 4.5:1 threshold.

**Fix:** Darken warning text color slightly in light mode, or ensure it is only used on tinted backgrounds (which the codebase already does with `/10` background tints). The text variant needs a deeper tone:

```css
/* Light mode */
--warning: oklch(0.68 0.18 80);
```

And adjust dependent tokens:
```css
--post-queued: oklch(0.68 0.18 80);
--compose-counter-warning: oklch(0.68 0.18 80);
--ai-confidence-medium: oklch(0.68 0.18 80);
```

### 6. Post-Draft Color Has No Dark Mode Adjustment

```css
/* Both light and dark: */
--post-draft: oklch(0.65 0.15 260);
```

**Problem:** The draft color is identical in both modes. In dark mode (card bg at L=0.18), a purple at L=0.65 is quite bright and pops aggressively compared to the more subdued semantic colors. It should be adjusted to harmonize with the dark palette.

**Fix:** Tone down post-draft in dark mode:

```css
/* Dark mode */
--post-draft: oklch(0.55 0.12 260);
```

### 7. Success/Warning/Destructive Are Reused for AI Confidence -- Semantic Mismatch

```css
--ai-confidence-high: oklch(0.62 0.16 149);      /* identical to --success */
--ai-confidence-medium: oklch(0.75 0.16 85);     /* identical to --warning */
--ai-confidence-low: oklch(0.577 0.245 27.325); /* identical to --destructive */
```

**Problem:** Using the exact same values as success/warning/destructive creates semantic confusion. AI confidence "low" is not the same as "error" or "destructive" -- it suggests missing information, not danger. A user seeing a red badge on AI confidence may think the AI detected a problem rather than simply lacking data. Similarly, "medium" confidence is not a "warning" state.

**Fix:** Give AI confidence its own palette with distinct hues:

```css
/* Light mode */
--ai-confidence-high: oklch(0.62 0.16 149);      /* green -- keep */
--ai-confidence-medium: oklch(0.70 0.14 70);     /* warm gold, distinct from warning amber */
--ai-confidence-low: oklch(0.55 0.12 260);       /* purple/gray, not red */

/* Dark mode */
--ai-confidence-high: oklch(0.70 0.18 149);
--ai-confidence-medium: oklch(0.78 0.14 70);
--ai-confidence-low: oklch(0.55 0.12 260);
```

Also update the AI surface for better contrast:
```css
/* Light mode */
--ai-surface: oklch(0.96 0.01 280);  /* was 0.97 0.005 -- slightly more tint */

/* Dark mode */
--ai-surface-foreground: oklch(0.82 0.025 280);  /* was 0.85 0.03 -- slightly deeper */
```

### 8. Sidebar Primary Differs from Main Primary

```css
/* Light mode */
--primary: oklch(0.60 0.22 38);
--sidebar-primary: oklch(0.646 0.222 41.116);

/* Dark mode */
--primary: oklch(0.65 0.22 38);
--sidebar-primary: oklch(0.705 0.213 47.604);
```

**Problem:** The sidebar primary is noticeably brighter and slightly shifted in hue (41-48 vs 38). This creates an inconsistent brand experience -- the same "primary" action feels different depending on whether it's in the sidebar or main content area.

**Fix:** Align sidebar-primary with main primary, adjusting only for the sidebar context:

```css
/* Light mode */
--sidebar-primary: oklch(0.62 0.22 38);

/* Dark mode */
--sidebar-primary: oklch(0.68 0.22 38);
```

### 9. Preview Platform Colors: TikTok and Threads Too Low Contrast in Light Mode

```css
--preview-tiktok: oklch(0.08 0.01 260);   /* near-black, barely visible */
--preview-threads: oklch(0.12 0.02 280);  /* near-black */
```

**Problem:** These colors are essentially invisible (near L=0.1) in light mode. If used for icons, borders, or text, they would be nearly indistinguishable from black foreground text. They should still represent their brand but be perceptible.

**Fix:** Lighten for visibility while maintaining brand identity:

```css
/* Light mode */
--preview-tiktok: oklch(0.25 0.04 260);
--preview-threads: oklch(0.30 0.04 280);
--preview-x: oklch(0.30 0.04 260);        /* was 0.15 0.02 -- also near-black */
```

### 10. Missing Focus Ring Color Consistency

```css
--ring: oklch(0.737 0.021 106.9);       /* Light: muted warm gray */
--ring: oklch(0.58 0.031 107.3);        /* Dark: even more muted */
```

**Problem:** The focus ring uses a neutral gray rather than the brand color. Focus indicators are an accessibility critical feature and using a muted gray ring makes them hard to perceive, especially for users with visual impairments. The standard pattern is to use the primary/brand color for focus rings.

**Fix:** Use brand-tinted ring colors:

```css
/* Light mode */
--ring: oklch(0.75 0.10 38);

/* Dark mode */
--ring: oklch(0.72 0.12 38);
```

### 11. Hardcoded Overlay Backgrounds Don't Adapt Between Modes

Dialog and Sheet overlays in [dialog.tsx](components/ui/dialog.tsx) and [sheet.tsx](components/ui/sheet.tsx) use `bg-black/20` with `backdrop-blur-sm` -- hardcoded black at 20% opacity with no dark mode variant.

**Problem:** In dark mode, `bg-black/20` layered on top of a background already at L=0.12 results in an effective L~0.10. This creates an overly heavy, claustrophobic overlay that feels disconnected from the theme. Light mode gets a soft dimming while dark mode gets a near-black void.

**Fix:** Use theme-adaptive overlay colors:

```css
/* Add new tokens in :root */
--overlay: oklch(0 0 0 / 20%);

/* In .dark override */
--overlay: oklch(0 0 0 / 50%);
```

Then update dialog.tsx and sheet.tsx to use `bg-[oklch(var(--overlay))]` or define a `--overlay-bg` token mapped through `@theme inline`.

### 12. Destructive Dropdown Menu Item Colors Overridden by !important Cascade

In [dropdown-menu.tsx](components/ui/dropdown-menu.tsx), cascade-level slot selectors use `!important` overrides:
```
**:data-[variant=destructive]:text-accent-foreground!
**:data-[variant=destructive]:focus:bg-foreground/10!
```

These override the intended item-level destructive styling (`text-destructive`, `focus:bg-destructive/10`).

**Problem:** Destructive menu items lose their red text on focus and may appear as regular items, eliminating a critical visual safety signal. This is a UX safety issue -- users should clearly see when they're about to trigger a destructive action.

**Fix:** Remove the `!important` cascade overrides for destructive variants, or restructure the cascade so destructive-specific rules win without `!important`. In [dropdown-menu.tsx](components/ui/dropdown-menu.tsx), the slot selector cascade at line ~47 should exclude destructive from the blanket `text-accent-foreground!` override.

### 13. Current Time Indicator Uses Destructive Red

In [day-view.tsx](components/calendar/day-view.tsx), the current time indicator line and dot use `bg-destructive`.

**Problem:** A temporal indicator is informational, not destructive. A red line screaming "error" to indicate "right now" creates cognitive dissonance and dilutes the semantic meaning of destructive. Users may subconsciously associate the current moment with danger.

**Fix:** Use brand color instead:

```tsx
// Change bg-destructive to bg-brand for the time indicator
```

### 14. Unread Badges Use Destructive Variant Across Inbox Components

- [reply-panel.tsx](components/inbox/reply-panel.tsx): "New" badge uses `variant="destructive"`
- [status-tabs.tsx](components/inbox/status-tabs.tsx): Unread count uses `variant="destructive"`
- [engagement-item-card.tsx](components/inbox/engagement-item-card.tsx): UNREAD uses `bg-brand-soft text-brand` (correct approach)

**Problem:** Inconsistent and semantically wrong. "Unread" is a neutral/informational state, not an error. Two of three inbox components use red for unread, while the engagement card correctly uses brand colors. The engagement-item-card approach is the right pattern.

**Fix:** Standardize on brand-colored unread indicators:
- [reply-panel.tsx](components/inbox/reply-panel.tsx): Change "New" badge from `variant="destructive"` to `variant="outline"` with `text-brand border-brand`
- [status-tabs.tsx](components/inbox/status-tabs.tsx): Change unread badge from `variant="destructive"` to `variant="outline"` with `text-brand border-brand/50`

### 15. Platform Color Tokens Inconsistent Across Calendar Components

- [post-chip.tsx](components/calendar/post-chip.tsx): Uses `bg-preview-*` tokens (10 platforms defined)
- [list-view.tsx](components/calendar/list-view.tsx): Uses `bg-chart-1` through `bg-chart-6` (only 6 platforms)
- [post-preview-dialog.tsx](components/calendar/post-preview-dialog.tsx): Also uses `bg-chart-*`

**Problem:** The same semantic concept (platform brand colors) uses two completely different token families. The `chart-*` tokens cover only 6 platforms vs 10 `preview-*` tokens. Platforms like threads, googleBusiness, youtube, and bluesky have no chart color fallback.

**Fix:** Unify to a single platform color token family. Add `--color-platform-*` tokens or standardize on `preview-*`. Update list-view.tsx and post-preview-dialog.tsx to use `bg-preview-*` instead of `bg-chart-*`.

### 16. Widespread hsl(var(...)) Anti-Pattern with OKLCH Variables

Found ~40+ occurrences across 9 files where OKLCH-defined CSS variables are wrapped in `hsl()`:

| File | Occurrences | Pattern |
|---|---|---|
| [analytics-overview.tsx](components/analytics/analytics-overview.tsx) | ~10 | `hsl(var(--chart-N))`, `hsl(var(--muted-foreground))` |
| [engagement-sparkline-widget.tsx](components/dashboard/engagement-sparkline-widget.tsx) | 4 | `hsl(var(--muted-foreground))`, `hsl(var(--brand))` |
| [posting-streak-widget.tsx](components/dashboard/posting-streak-widget.tsx) | 3 | `hsl(var(--success))`, `hsl(var(--warning))`, `hsl(var(--destructive))` |
| [inline-suggestion.tsx](components/compose/inline-suggestion.tsx) | ~6 | `hsl(var(--muted-foreground) / 0.45)` |
| [login/page.tsx](app/(auth)/login/page.tsx) | ~3 | `hsl(var(--brand)/0.3)`, `hsl(var(--border)/0.5)` |
| [register/page.tsx](app/(auth)/register/page.tsx) | ~3 | Same as login |
| [auth/layout.tsx](app/(auth)/layout.tsx) | ~2 | `hsl(var(--muted)/0.4)` |

**Problem:** All CSS variables are defined as `oklch()` values. Wrapping them in `hsl()` is colorimetrically incorrect -- `hsl(0.65 0.22 38)` interprets the values as hue=0.65, saturation=0.22, lightness=38, which is a completely different color than `oklch(0.65 0.22 38)` (lightness=0.65, chroma=0.22, hue=38). The browser may silently produce wrong colors.

**Fix:** Replace all instances:
- Direct reference (no alpha): `hsl(var(--brand))` -> `var(--brand)`
- With alpha: `hsl(var(--brand)/0.3)` -> `oklch(from var(--brand) l c h / 0.3)`

### 17. Hardcoded RGBA Shadows Break Dark Mode

- [login/page.tsx](app/(auth)/login/page.tsx) line 86: `shadow-[0_8px_32px_rgba(0,0,0,0.08)...]`
- [register/page.tsx](app/(auth)/register/page.tsx) line 131: Same pattern

**Problem:** `rgba(0,0,0,0.08)` is a hardcoded black shadow that does not adapt to dark mode. On dark backgrounds, this creates a visible black shadow that looks muddy. The adjacent border already uses the correct pattern with `hsl(var(--border)/0.5)`.

**Fix:**
```tsx
// Change rgba(0,0,0,0.08) to:
shadow-[0_8px_32px_oklch(from_var(--foreground)_l_c_h_/_0.08)]
```

### 18. Landing Pages Use Non-Semantic Tailwind Colors

- [instagram/page.tsx](app/(landing)/platforms/instagram/page.tsx): `text-pink-500`, `bg-pink-500/10`
- [community/page.tsx](app/(landing)/community/page.tsx): `bg-slate-500/10`, `text-slate-500`

**Problem:** Landing pages bypass the design system's semantic tokens (`text-preview-instagram`, `bg-muted/10`) in favor of Tailwind's built-in palette. This creates inconsistency and makes future theme changes harder.

**Fix:** Replace with semantic tokens:
```tsx
// instagram/page.tsx
text-pink-500 -> text-preview-instagram
bg-pink-500/10 -> bg-preview-instagram/10

// community/page.tsx
bg-slate-500/10 -> bg-muted/10
text-slate-500 -> text-muted-foreground
```

### 19. Inactive Tab Text May Fail Contrast

In [tabs.tsx](components/ui/tabs.tsx):
```
Inactive: text-foreground/60 (light mode)
Dark mode inactive: dark:text-muted-foreground
```

**Problem:** At 60% opacity of foreground (L=0.153), the effective lightness is ~L=0.94 equivalent when composited -- this is likely below WCAG AA 4.5:1 for body text, especially at 12px. Dark mode uses `muted-foreground` (L=0.737) which is better but still borderline for small text.

**Fix:**
```css
/* In :root */
--muted-foreground: oklch(0.52 0.035 107.3);  /* darken slightly for better contrast */
```

And for tabs specifically, avoid `/60` opacity -- use `text-muted-foreground` consistently.

### 20. Switch Unchecked Track Nearly Invisible in Dark Mode

In [switch.tsx](components/ui/switch.tsx):
```
Unchecked: data-unchecked:bg-input
Dark mode: --input: oklch(1 0 0 / 15%)
```

**Problem:** A 15% white alpha on L=0.228 background is extremely faint. The unchecked switch track may appear broken or missing to users.

**Fix:** Use a solid dark mode input color with proper lightness:
```css
/* Already being fixed in finding #4 */
--input: oklch(0.32 0.018 106.5);
```

This will automatically fix the switch track.

---

## Implementation Steps

### Phase 1: globals.css Token Corrections

1. **Edit [globals.css](app/globals.css)** -- Apply all CSS variable value changes from findings #1-10, #19-20 in a single organized pass:
   - Light mode `:root` section: chart colors, warning, info, ring, muted-foreground, AI confidence, sidebar-primary, preview colors, AI surface
   - Dark mode `.dark` section: destructive, borders, info, warning, post-draft, post-publishing, chart colors, ring, AI confidence, sidebar-primary, preview colors, AI surface-foreground

### Phase 2: Component Anti-Pattern Fixes

2. **Fix hsl(var()) anti-pattern** -- Search and replace across all 9 affected files:
   - `hsl(var(--X))` without alpha -> `var(--X)`
   - `hsl(var(--X)/N)` -> `oklch(from var(--X) l c h / N)`
   - Files: [analytics-overview.tsx](components/analytics/analytics-overview.tsx), [engagement-sparkline-widget.tsx](components/dashboard/engagement-sparkline-widget.tsx), [posting-streak-widget.tsx](components/dashboard/posting-streak-widget.tsx), [inline-suggestion.tsx](components/compose/inline-suggestion.tsx), [login/page.tsx](app/(auth)/login/page.tsx), [register/page.tsx](app/(auth)/register/page.tsx), [auth/layout.tsx](app/(auth)/layout.tsx), [confidence-correlation-chart.tsx](components/analytics/confidence-correlation-chart.tsx), [post-frequency-chart.tsx](components/analytics/post-frequency-chart.tsx)

3. **Fix hardcoded RGBA shadows** in [login/page.tsx](app/(auth)/login/page.tsx) and [register/page.tsx](app/(auth)/register/page.tsx):
   - Replace `rgba(0,0,0,0.08)` with `oklch(from var(--foreground) l c h / 0.08)`

4. **Fix landing page non-semantic colors** in [instagram/page.tsx](app/(landing)/platforms/instagram/page.tsx) and [community/page.tsx](app/(landing)/community/page.tsx)

### Phase 3: Semantic Color Misuse Corrections

5. **Fix unread badge semantics** -- Change from `variant="destructive"` to brand-colored:
   - [reply-panel.tsx](components/inbox/reply-panel.tsx)
   - [status-tabs.tsx](components/inbox/status-tabs.tsx)

6. **Fix current time indicator** in [day-view.tsx](components/calendar/day-view.tsx):
   - Change `bg-destructive` to `bg-brand`

7. **Fix dropdown menu destructive cascade** in [dropdown-menu.tsx](components/ui/dropdown-menu.tsx):
   - Remove `!important` overrides that suppress destructive text color on focus

8. **Fix overlay backgrounds** in [dialog.tsx](components/ui/dialog.tsx) and [sheet.tsx](components/ui/sheet.tsx):
   - Add `--overlay` CSS variable in globals.css
   - Replace `bg-black/20` with theme-adaptive overlay

### Phase 4: Platform Color Unification

9. **Unify platform color tokens** across calendar components:
   - Add `@theme inline` mapping for any missing `preview-*` tokens
   - Update [list-view.tsx](components/calendar/list-view.tsx) and [post-preview-dialog.tsx](components/calendar/post-preview-dialog.tsx) to use `bg-preview-*` instead of `bg-chart-*`

### Phase 5: Verification

10. **Spot-check all affected components** in both light and dark modes:
    - Charts: [audience-growth-chart.tsx](components/analytics/audience-growth-chart.tsx), [analytics-overview.tsx](components/analytics/analytics-overview.tsx)
    - Alerts/buttons: [alert.tsx](components/ui/alert.tsx), [button.tsx](components/ui/button.tsx)
    - Inbox: [reply-panel.tsx](components/inbox/reply-panel.tsx), [status-tabs.tsx](components/inbox/status-tabs.tsx), [engagement-item-card.tsx](components/inbox/engagement-item-card.tsx)
    - Calendar: [day-view.tsx](components/calendar/day-view.tsx), [post-chip.tsx](components/calendar/post-chip.tsx), [posting-frequency.tsx](components/calendar/posting-frequency.tsx)
    - AI features: [trend-context-banner.tsx](components/compose/trend-context-banner.tsx), [brand-health-panel.tsx](components/settings/brand-health-panel.tsx), [ai-status-indicator.tsx](components/dashboard/ai-status-indicator.tsx)
    - Reddit: [trending-post-chip.tsx](components/reddit/trending-post-chip.tsx), [trending-table.tsx](components/reddit/trending-table.tsx)
    - Overlays: open dialogs, sheets, dropdown menus with destructive items
    - Forms: focus rings on inputs, switches in unchecked state, tabs inactive state

11. **No component logic changes required for Phase 1** -- CSS variable value changes propagate automatically through the token system.

---

## Completion Status

All 20 findings from the color palette audit have been implemented:

### Phase 1: globals.css Token Corrections (Findings #1-10, #19-20) -- COMPLETE
All CSS variable value changes applied in `app/globals.css`:
- Chart colors diversified across 5 distinct hues (#1)
- Destructive dark mode chroma increased (#2)
- Info color chroma boosted (#3)
- Dark mode borders given warm undertone (#4)
- Warning light mode darkened for contrast (#5)
- Post-draft dark mode adjusted (#6)
- AI confidence tokens given distinct palette (#7)
- Sidebar-primary aligned with main primary (#8)
- Preview platform colors (TikTok/Threads/X) lightened (#9)
- Focus ring uses brand-tinted color (#10)
- Muted-foreground darkened for better contrast (#19)
- Switch track fixed via input token (#20)

### Phase 2: Component Anti-Pattern Fixes (Findings #16-18) -- COMPLETE
- `hsl(var())` anti-pattern fixed across all affected files (#16)
- Hardcoded RGBA shadows replaced with theme-adaptive tokens (#17)
- Landing page non-semantic Tailwind colors replaced with semantic tokens (#18)

### Phase 3: Semantic Color Misuse Corrections (Findings #11-14) -- COMPLETE
- Unread badges standardized on brand-colored indicators (#14)
- Current time indicator changed from `bg-destructive` to `bg-brand` (#13)
- Dropdown menu `!important` cascade overrides removed (#12)
- Overlay backgrounds use `--overlay` CSS variable in dialog.tsx and sheet.tsx (#11)
- Media card and external media grid overlays updated from `bg-black/20` to `bg-overlay` (#11 continuation)

### Phase 4: Platform Color Unification (Finding #15) -- COMPLETE
- `recent-posts-list.tsx` uses `bg-preview-*` tokens instead of `bg-chart-*`
- `calendar-preview.tsx` uses `bg-preview-*` tokens instead of `bg-chart-*`

---

## Summary of All Changes

| # | Category | Issue | Severity | Status |
|---|---|---|---|---|
| 1 | Chart colors | Monochromatic teals, poor differentiation, colorblind-hostile | Critical | FIXED |
| 2 | Destructive dark mode | Washed out, chroma drop undermines urgency | High | FIXED |
| 3 | Info color | Low chroma, competes with muted-foreground | Medium | FIXED |
| 4 | Dark mode borders | Pure white alpha, cold appearance | Medium | FIXED |
| 5 | Warning light mode | May fail WCAG AA contrast for text | Medium | FIXED |
| 6 | Post-draft dark mode | No adjustment, too bright on dark cards | Low | FIXED |
| 7 | AI confidence tokens | Semantic mismatch with destructive/success/warning | Medium | FIXED |
| 8 | Sidebar primary | Inconsistent hue/lightness with main primary | Low | FIXED |
| 9 | Preview platform colors | TikTok/Threads/X near-invisible in light mode | Low | FIXED |
| 10 | Focus ring | Neutral gray, hard to perceive for accessibility | High | FIXED |
| 11 | Overlay backgrounds | Hardcoded black, doesn't adapt between modes | Medium | FIXED |
| 12 | Destructive dropdown items | !important cascade overrides red text on focus | High | FIXED |
| 13 | Current time indicator | Uses destructive red for temporal info | Medium | FIXED |
| 14 | Unread badges | Destructive variant for non-error state | Medium | FIXED |
| 15 | Platform color tokens | Two competing token families, missing coverage | Medium | FIXED |
| 16 | hsl(var()) anti-pattern | ~40+ occurrences, colorimetrically wrong | Critical | FIXED |
| 17 | Hardcoded RGBA shadows | 2 occurrences, breaks dark mode | Medium | FIXED |
| 18 | Landing page colors | Non-semantic Tailwind colors | Low | FIXED |
| 19 | Inactive tab contrast | text-foreground/60 may fail WCAG AA | Medium | FIXED |
| 20 | Switch unchecked track | 15% alpha nearly invisible in dark mode | Medium | FIXED |

1. **Edit [globals.css](app/globals.css)** -- Apply all color adjustments from the findings above in a single pass, organized by section (light mode `:root` changes, dark mode `.dark` changes).

2. **Verify chart rendering** -- Check that [audience-growth-chart.tsx](components/analytics/audience-growth-chart.tsx) and [analytics-overview.tsx](components/analytics/analytics-overview.tsx) display the new diverse chart palette correctly with the Recharts components.

3. **Spot-check key UI components** -- Verify the adjusted colors render properly in:
   - [alert.tsx](components/ui/alert.tsx) -- destructive variant
   - [button.tsx](components/ui/button.tsx) -- destructive variant, focus rings
   - [brand-health-panel.tsx](components/settings/brand-health-panel.tsx) -- three-state health
   - [trend-context-banner.tsx](components/compose/trend-context-banner.tsx) -- sentiment badges
   - [notification-bell.tsx](components/dashboard/notification-bell.tsx) -- type indicators
   - [post-chip.tsx](components/calendar/post-chip.tsx) -- post status colors
   - [ai-status-indicator.tsx](components/dashboard/ai-status-indicator.tsx) -- AI state dot
   - [trending-post-chip.tsx](components/reddit/trending-post-chip.tsx) -- AI confidence badges

4. **No component logic changes required** -- All improvements are purely CSS variable value changes. Components reference tokens by name (e.g., `text-destructive`, `bg-warning`), so swapping the underlying OKLCH values propagates automatically.

## Summary of Changes

| Category | Issue | Severity |
|---|---|---|
| Chart colors | Monochromatic, poor differentiation | High |
| Destructive dark mode | Washed out, low chroma | High |
| Focus ring | Neutral gray, hard to perceive | High |
| Info color | Low chroma, competes with muted text | Medium |
| Warning light mode | May fail contrast on text | Medium |
| AI confidence | Semantic mismatch with destructive | Medium |
| Dark mode borders | Pure alpha, cold appearance | Medium |
| Post-draft dark mode | No adjustment, too bright | Low |
| Sidebar primary | Inconsistent with main primary | Low |
| Preview dark colors | Near-invisible in light mode | Low |