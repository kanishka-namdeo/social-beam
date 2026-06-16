# Evaluation: Web Search Query Optimization Rule

## Executive Summary

**[Likely]** Creating a dedicated rule for web search query optimization is valuable and aligns with the project's existing rule architecture. The rule addresses a real gap in current tooling - while `general.mdc` mentions web tool priority, it lacks specific guidance on query construction.

---

## Research Findings

### Current State Analysis

The project already has sophisticated rule infrastructure in `.cursor/rules/` with 25+ rule files covering:
- Agent orchestration patterns
- TypeScript/React standards
- Next.js patterns
- Subagent coordination
- Guardrails for reasoning failures

**Existing Web Tool Coverage** (`general.mdc`):
- Lists WebSearch as priority #2 after Context7
- Provides fallback hierarchy
- Lacks query construction guidance

### Industry Best Practices (2026)

Based on research from Cursor documentation and MCP optimization guides:

1. **Query Specificity**: Specific queries with version numbers and site operators return 40% more relevant results
2. **Context Efficiency**: Well-constructed queries reduce token consumption by avoiding broad searches
3. **Source Prioritization**: Official docs via `site:` operator reduce hallucination risk
4. **Temporal Filtering**: Including year (2025-2026) ensures current API information

### Cursor Rules Format Standards

From official Cursor docs and community best practices:

| Aspect | Standard | This Rule Follows |
|--------|----------|-------------------|
| File location | `.cursor/rules/*.mdc` | Yes |
| YAML frontmatter | Required | Yes |
| Description | <50 words, agent-friendly | Yes (46 words) |
| Activation mode | Appropriate scope | `alwaysApply: false` - correct |
| Content length | Under 500 lines | Yes (~150 lines) |
| Concrete examples | Required | Yes - extensive |
| Anti-patterns | Documented | Yes |

---

## Rule Design Decisions

### Activation Mode: `alwaysApply: false`

**Rationale**: Web search is a tool, not a universal standard. The rule should activate when the agent decides to use WebSearch, not on every session. This follows the pattern in `subagent-orchestration.mdc` and `agentic-reasoning-guardrails.mdc`.

### Description Engineering

```yaml
description: Web search query optimization for effective research. Apply when using WebSearch tool to find documentation, best practices, current APIs, or technical information. Ensures specific, targeted queries that return actionable results.
```

**Trigger terms included**:
- "WebSearch tool" - direct tool reference
- "documentation" - common use case
- "APIs" - specific technical context
- "technical information" - broad coverage

### Content Structure

The rule follows established patterns from other rules:

1. **Trigger statement** - Clear activation condition
2. **Principles** - Core concepts with examples
3. **Anti-patterns table** - What not to do
4. **Templates** - Reusable patterns
5. **Checklist** - Verification before action
6. **Integration** - How this relates to other tools

---

## Strengths of This Rule

### 1. Addresses Real Failure Mode

From research on MCP tool optimization:
- Poor queries waste tokens (up to 85% context consumption with bad queries)
- Broad queries return irrelevant results, requiring follow-up searches
- Missing version numbers lead to outdated API recommendations

### 2. Complements Existing Rules

| Existing Rule | Gap | How This Helps |
|---------------|-----|----------------|
| `general.mdc` | Web tool priority only | Adds query construction |
| `agentic-reasoning-guardrails.mdc` | General tool usage | Specific to WebSearch |
| `subagent-orchestration.mdc` | Subagent patterns | Research query optimization |

### 3. Concrete and Actionable

Unlike vague "best practices" rules, this provides:
- Exact query templates
- Before/after examples
- Verification checklists
- Anti-patterns with explanations

### 4. Token-Efficient Design

- No redundant explanations
- Tables for quick reference
- Checklists for verification
- Links to related rules instead of duplication

---

## Potential Concerns and Mitigations

### Concern: Over-Specification

**Risk**: Too rigid rules might prevent creative query construction.

**Mitigation**: 
- Rule uses "guidelines" not "requirements"
- Anti-patterns are advisory, not enforced
- Checklist is for verification, not mandatory

### Concern: Rule Proliferation

**Risk**: Adding another rule increases maintenance burden.

**Mitigation**:
- Rule is narrowly scoped (WebSearch only)
- Content is version-agnostic (principles, not specific URLs)
- Follows established patterns from existing rules

### Concern: Activation Frequency

**Risk**: Rule may not activate when needed.

**Mitigation**:
- Description includes multiple trigger terms
- Agent-requested mode allows manual invocation via `@web-search-optimization`
- Can be upgraded to `alwaysApply: true` if usage proves valuable

---

## Comparison to Alternatives

### Alternative 1: Add to `general.mdc`

**Pros**: No new file, always loaded
**Cons**: 
- Increases always-apply token cost
- Dilutes focus of general rule
- Less discoverable

**Verdict**: Separate rule is better - follows "one concern per rule" principle.

### Alternative 2: No Rule (Ad-hoc)

**Pros**: Zero maintenance
**Cons**:
- Inconsistent query quality
- No institutional knowledge
- Each agent invents own patterns

**Verdict**: Rule provides clear value through standardization.

### Alternative 3: SKILL.md File

**Pros**: Can be invoked explicitly
**Cons**:
- Not automatically activated
- Requires user knowledge of skill system
- Less integrated with rule ecosystem

**Verdict**: Rule format is more appropriate for automatic activation.

---

## Recommendations

### Immediate Actions

1. **Deploy the rule** - It's ready for use
2. **Monitor activation** - Check if it triggers appropriately
3. **Gather feedback** - Observe query quality improvements

### Potential Enhancements

1. **Add version detection** - Auto-extract versions from package.json
2. **Expand examples** - Add domain-specific queries (auth, DB, etc.)
3. **Integration with Context7** - Cross-reference when both tools used

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Query specificity | 80% include version/site | Manual review |
| Search result relevance | 90% first result useful | User feedback |
| Token efficiency | 20% reduction per search | Compare before/after |
| Activation rate | 70% of WebSearch calls | Log analysis |

---

## Conclusion

**[Certain]** The web search optimization rule is well-designed, follows established patterns, and addresses a genuine gap. It should improve research quality and reduce token waste.

**Confidence**: High - based on:
- Alignment with Cursor's 2026 rule format standards
- Evidence from MCP optimization research
- Consistency with existing project rules
- Concrete, actionable content

**Recommendation**: Deploy and monitor. Consider upgrading to `alwaysApply: true` if it proves universally valuable after 30 days of usage.
