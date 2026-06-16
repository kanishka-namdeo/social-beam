# Hierarchy Analysis: Web Search Optimization Rule

## Executive Summary

The `web-search-optimization.mdc` rule fits well within the existing hierarchy but requires minor adjustments to avoid redundancy with `plan-mode-enhancement.mdc` and `general.mdc`.

---

## Rule Hierarchy Position

### Current Hierarchy (Level 1 - Technical Guardrails)

```
Level 0: Persona (agent-persona.mdc)
  ↓
Level 1: Technical Guardrails
  ├── general.mdc (alwaysApply: true) - Core principles, web tool priority
  ├── agentic-reasoning-guardrails.mdc - Tool usage patterns
  ├── plan-mode-enhancement.mdc - Research requirements
  ├── plan-execution.mdc - Execution flow
  ├── subagent-orchestration.mdc - Coordination patterns
  └── web-search-optimization.mdc (NEW) - Query construction
```

### Position Assessment

**Correct Placement**: The rule belongs at Level 1 as a specialized tool-guidance rule.

**Activation Mode**: `alwaysApply: false` is appropriate - it should activate when WebSearch is used, not on every session.

---

## Redundancy Analysis

### Overlap with `general.mdc`

| general.mdc Content | web-search-optimization.mdc | Conflict? |
|---------------------|---------------------------|-----------|
| "Web Tool Priority" section | "Integration with Other Tools" section | No - complementary |
| "Prefer 2025-2026 sources" | "Include year (2025-2026)" | **Partial overlap** |
| "Official documentation > tech blogs" | "Use site-specific search" | **Reinforcement** |
| Fallback hierarchy | Tool selection guidance | No - different focus |

**Resolution**: The overlap is reinforcement, not redundancy. Both rules emphasize 2025-2026 sources and official docs, which strengthens the message.

### Overlap with `plan-mode-enhancement.mdc`

| plan-mode-enhancement.mdc | web-search-optimization.mdc | Conflict? |
|---------------------------|---------------------------|-----------|
| "Parallel Web Research" section | Query construction templates | **Complementary** |
| "WebSearch: '[library] best practices 2025 2026'" | "[topic] [aspect] [version] site: [domain] [year]" | **Enhanced specificity** |
| Research complexity scale | Query evaluation checklist | Different focus |

**Resolution**: Plan mode tells *when* to research; web-search-optimization tells *how* to construct queries. They're complementary.

### Overlap with `agentic-reasoning-guardrails.mdc`

| agentic-reasoning-guardrails.mdc | web-search-optimization.mdc | Conflict? |
|----------------------------------|---------------------------|-----------|
| "Parallel research queries" | Query construction | No - different focus |
| "Batch independent reads" | Query specificity | No - different focus |
| Tool loop prevention | Query efficiency | **Synergy** |

**Resolution**: Guardrails prevent tool misuse; web-search-optimization improves query quality. They work together.

---

## Required Updates

### 1. Update `general.mdc` - Reference New Rule

Add a cross-reference in the "Web Tool Priority" section:

```markdown
## Web Tool Priority

1. **Context7 MCP**: Version-specific library APIs (check `package.json` versions)
2. **WebSearch**: Best practices, current info (2025-2026 only)
   - See `web-search-optimization.mdc` for query construction guidelines
3. **WebFetch**: Known documentation URLs
4. **Browser-use MCP**: UI testing, fallback when blocked
```

### 2. Update `plan-mode-enhancement.mdc` - Reference Query Templates

Update the "Parallel Web Research" section:

```markdown
### 3. Parallel Web Research

Execute all applicable research in parallel:
- **Context7**: Query version-specific APIs for each library
- **WebSearch**: Follow query templates in `web-search-optimization.mdc`
  - Pattern: `[topic] [aspect] [version] site:[domain] [year]`
  - Example: `Next.js 15 cacheLife unstable_cache migration site:nextjs.org 2026`
- **WebFetch**: Top 3 official documentation URLs
```

### 3. Update `web-search-optimization.mdc` - Clarify Scope

Add explicit scope statement:

```markdown
## Rule Scope

This rule complements (does not replace):
- `general.mdc` - Web tool priority and fallback hierarchy
- `plan-mode-enhancement.mdc` - Research requirements and plan structure
- `agentic-reasoning-guardrails.mdc` - Tool usage patterns and batching

**Focus**: Query construction specificity and search engine optimization.
```

---

## Potential Conflicts

### Conflict 1: Query Style

**Risk**: `plan-mode-enhancement.mdc` suggests `"[library] best practices 2025 2026"` while `web-search-optimization.mdc` suggests more specific queries.

**Resolution**: Not a conflict - plan mode provides a starting point; web-search-optimization provides refinement. The agent can escalate from basic to specific as needed.

### Conflict 2: Tool Selection

**Risk**: Both rules discuss when to use WebSearch vs Context7.

**Resolution**: `general.mdc` owns the priority hierarchy; other rules reference it. No change needed.

### Conflict 3: Activation Timing

**Risk**: Multiple rules might activate simultaneously during research phases.

**Resolution**: This is by design. Rules are composable - `plan-mode-enhancement` + `web-search-optimization` + `agentic-reasoning-guardrails` should all activate during research tasks.

---

## Hierarchy Fit Assessment

| Criterion | Status | Notes |
|-----------|--------|-------|
| Follows Level 1 placement | ✅ Pass | Technical guardrail, not persona |
| Uses correct activation mode | ✅ Pass | `alwaysApply: false` with description |
| No circular references | ✅ Pass | References other rules correctly |
| Complements (not duplicates) | ✅ Pass | Fills gap in query construction |
| Cross-references existing rules | ⚠️ Needs update | Add references to general.mdc and plan-mode |
| Follows naming convention | ✅ Pass | kebab-case, descriptive |
| Under 500 lines | ✅ Pass | ~150 lines |
| Includes concrete examples | ✅ Pass | Extensive examples |

---

## Recommendations

### Immediate Actions

1. **Update `general.mdc`** - Add cross-reference to web-search-optimization
2. **Update `plan-mode-enhancement.mdc`** - Reference query templates
3. **Update `web-search-optimization.mdc`** - Add scope clarification

### Success Criteria

After updates:
- [ ] All three rules reference each other appropriately
- [ ] No contradictory guidance exists
- [ ] Query quality improves in plan mode
- [ ] Token efficiency increases (measure via search result relevance)

### Monitoring

Track for 2 weeks:
1. Are queries more specific (version numbers, site operators)?
2. Are search results more relevant (official docs vs tutorials)?
3. Any confusion between rules during research phases?

---

## Conclusion

The rule fits properly in the hierarchy and fills a genuine gap. Minor cross-referencing updates will ensure clean integration without confusion.

**Confidence**: High - the rule is well-designed and the overlaps are complementary, not redundant.
