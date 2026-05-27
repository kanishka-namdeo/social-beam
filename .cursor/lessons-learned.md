# Lessons Learned

## 2026-05-21 - `useContext` null error: 4 distinct root causes

- **Mistake**: The `"Cannot read properties of null (reading 'useContext')"` runtime error appeared across 7+ separate conversations with 4 different root causes, each requiring a different fix. The agent kept fixing symptoms without capturing the pattern class.
- **Root causes identified**:
  1. **Missing `'use client'`**: Files using React hooks in Next.js App Router default to Server Components where the React dispatcher is null.
  2. **SessionProvider in Server Component**: `SessionProvider` uses `useContext` internally and must be in a Client Component wrapper.
  3. **`null` vs `undefined` for SessionProvider**: When `auth()` returns `null`, passing it directly to `SessionProvider.session` can cause context issues. Convert to `undefined`.
  4. **`radix-ui` bare package import**: The `radix-ui` npm package is types-only. Importing from it (instead of `@radix-ui/react-*`) provides no real React components, causing all internal `useContext` calls to find `null` context.
  5. **Conditional SessionProvider rendering**: Skipping `SessionProvider` when no session exists breaks `signIn()` from `next-auth/react` which requires the context even on unauthenticated pages.
- **Rules updated**:
  - `react-component-boundaries.mdc` — Added "Third-Party Context Providers in Server Components" section, added both new mistakes to the anti-pattern table
  - `react-module-anti-patterns.mdc` — Added "Third-Party UI Library Import Anti-Pattern" section at top with full radix-ui explanation and detection commands
  - `nextjs-patterns.mdc` — Added "SessionProvider in Root Layout" subsection with correct patterns and 3 critical rules
- **Code fixed**:
  - `components/providers.tsx` — Changed `session={session}` to `session={session ?? undefined}` to normalize null to undefined

## 2026-05-21 - Buffer competitor analysis: API feasibility reveals feature gaps

- **Mistake**: Planning features based on competitor parity without verifying platform API constraints. Buffer has features that their users demand, but some are not feasible via API at all.
- **Root cause**: Assuming competitors ship features with full functionality. Many Buffer features are partial implementations or use workarounds.
- **Key feasibility findings (all verified against 2026 APIs)**:
  1. **Instagram collaborator invites** (157 votes): API is READ-ONLY. No POST/create endpoint. Only pre-approved accounts can be tagged.
  2. **Instagram multi-video carousels** (323 votes): Videos supported but Reels explicitly blocked from carousels by API.
  3. **TikTok custom video covers** (619 votes total for thumbnails): Frame-based selection only via `video_cover_timestamp_ms`. No custom image upload.
  4. **LinkedIn rich text** (171 votes): Posts API "little text format" only supports mentions + hashtags. No bold/italic.
  5. **YouTube scheduling** (130 votes): Feasible via `status.publishAt` + `privacyStatus=private` but requires API verification audit.
- **Rules updated**:
  - `product-context.mdc` — Added Competitor Intelligence table with Buffer mapping and feasibility docs. Added Rule 5: check feasibility status before planning features marked "NOT FEASIBLE via API".
  - `plan-mode-enhancement.mdc` — Added competitor feasibility check to Parallel Web Research step.
  - `continuous-improvement.mdc` — Added "Competitor Analysis as Input" and "Platform API Feasibility Pre-Check" sections with known 2026 API limitations.
- **Docs created**:
  - `docs/competitor-analysis/buffer-features-mapping.md` — 15 top Buffer features mapped to SocialBeam scope with vote counts
  - `docs/competitor-analysis/buffer-features-feasibility-2026.md` — Full API feasibility analysis for all 15 features against 2026 platform documentation
- **MVP scope updated** (`docs/mvp-scope.md` v1.2.0):
  - Content Queue elevated P1 → P0 (383 votes, core differentiator)
  - Auto-resize/crop elevated P1 → P0 (259 votes, prevents posting failures)
  - Account-wide search added P1 (155 votes, PostgreSQL FTS)
  - Phase 2 additions split by feasibility: P1 (feasible) vs P2 (partial) vs NOT FEASIBLE
  - Tech stack updated: Sharp v0.34.5, rss-parser, PostgreSQL FTS

## 2026-05-25 - Transcript analysis: 6 sessions, 10+ mistake patterns identified

- **Mistake**: Serial drip-feeding on file search — agent ran 9 Glob calls across 18 turns looking for screenshots that didn't exist, instead of escalating to Shell after 2 empty results.
- **Root cause**: Ignored existing 3-turn rule — agent kept retrying Glob with minor pattern variants instead of switching strategy.
- **Rule updated**:
  - `agentic-reasoning-guardrails.mdc` — Added Rule 7 (Escalation Protocol for Empty Results): Glob → Shell → Ask user. No 4th retry. Added Rule 8 (Comprehensive Debug Dispatch): one subagent per bug with all hypotheses. Added Rule 9 (Verify Subagent Conclusions): independently verify at least one key claim. Added Rule 10 (Third-Party API Diagnosis requires Current Research): WebSearch/WebFetch before recommending OAuth/API changes.
  - `general.mdc` — Added Package Manager Enforcement table (pnpm only, ban bunx/npx/yarn). Added Icon Library Verification section (grep node_modules before using icon names).
  - `agent-handoff-verification.mdc` — Added StrReplace Safety section: list children before large JSX replacements, split multi-section replacements, read exact lines before markdown table StrReplace.
  - `plan-mode-enhancement.mdc` — Added Step 4 (Verify Referenced Files Exist): Glob/Shell check before citing referenced files as data sources.

### Mistake patterns captured from transcript analysis

| # | Mistake | Turns Wasted | Root Cause | Rule Updated |
|---|---------|-------------|------------|-------------|
| 1 | Serial drip-feeding on missing screenshots (9 Glob calls) | 18 | Ignored escalation rule | `agentic-reasoning-guardrails.mdc` Rule 7 |
| 2 | Phantom assumption: cited "88 screenshots" without verifying files exist | 18 | No file-existence verification | `plan-mode-enhancement.mdc` Step 4 |
| 3 | StrReplace failures on markdown table (4 consecutive failures) | 9 | Insufficient context in old_string | `agent-handoff-verification.mdc` StrReplace Safety |
| 4 | Wrong LinkedIn OAuth diagnosis (claimed openid not supported) | 7 | Stale training data, no web research | `agentic-reasoning-guardrails.mdc` Rule 10 |
| 5 | Used `bunx` instead of `pnpm` | 1 (uncorrected) | Ignored package manager rule | `general.mdc` Package Manager table |
| 6 | Toolbar deleted in large StrReplace (30+ line JSX replacement) | 3 | Lost track of child elements | `agent-handoff-verification.mdc` StrReplace Safety |
| 7 | Assumed non-existent Phosphor icon names (PanelRightOpen) | 4 (typecheck caught) | Knowledge gap, no verification | `general.mdc` Icon Library Verification |
| 8 | 3 overlapping subagent dispatches for one LinkedIn OAuth bug | 3 subagents | Fragmented debug dispatch | `agentic-reasoning-guardrails.mdc` Rule 8 |
| 9 | Accepted subagent's "double-encoding bug" conclusion without verification | 2 subagents | Blind subagent trust | `agentic-reasoning-guardrails.mdc` Rule 9 |
| 10 | Canvas file placed in wrong directory, with external imports | 4 (user pushback) | Knowledge gap on Cursor conventions | Noted — no rule added (low frequency) |

## 2026-05-25 - LinkedIn OAuth "Bad request": root cause analysis patterns

- **Mistake**: Agent diagnosed LinkedIn OAuth "Bad request" as invalid scopes (`openid`, `profile`) based on training data, when those scopes are actually correct per LinkedIn's 2025 docs.
- **Root cause**: Acting on uncertain third-party API knowledge without current documentation research.
- **Additional mistake**: Agent dispatched 3 separate subagents for overlapping hypotheses (double-encoding, DB credentials, error point tracing) instead of one comprehensive debug dispatch.
- **Rule updated**:
  - `agentic-reasoning-guardrails.mdc` — Added Rule 10: mandatory WebSearch/WebFetch before recommending third-party API scope/credential/endpoint changes.
  - `agentic-reasoning-guardrails.mdc` — Added Rule 8: one subagent per bug with ALL hypotheses, not sequential narrow-scoped dispatches.
  - `lib/oauth/credentials.ts` — Enhanced `resolveCredentials` logging with masked client ID and explicit source field (`database` vs `env`) for troubleshooting credential override issues.
  - `lib/agent/tools/social-tools.ts` — Added `oauth.initiate.debug` log entry with platform, masked client ID, credential source, auth URL, redirect URI, and scopes.
