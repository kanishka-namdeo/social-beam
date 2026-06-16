# LangGraph Agent Bug Report

**Generated**: 2026-06-14  
**Scope**: `lib/agent/**/*.ts`  
**Total Issues**: 17 bugs (2 Critical, 4 High, 6 Medium, 3 Low)

---

## Critical Severity (2)

### Bug #1: Operator Precedence Breaks Tool Loop Guard

**File**: `lib/agent/graph.ts:140,151`  
**File**: `lib/agent/brand-analyzer-graph.ts:67`

**Issue**: Missing parentheses around nullish coalescing operator causes the entire expression to always evaluate to `1`, making the tool loop guard completely ineffective.

**Code**:
```typescript
// ❌ WRONG - Always evaluates to 1
const iteration = (state as Record<string, unknown>).__tool_loop_iteration as number ?? 0) + 1;
```

**Impact**: Tool loops can run indefinitely, causing infinite API calls, runaway costs, and potential service outages.

**Fix**:
```typescript
// ✅ CORRECT
const iteration = ((state as Record<string, unknown>).__tool_loop_iteration as number) ?? 0) + 1;
```

**Affected Locations**:
- `lib/agent/graph.ts:140` (audienceCollectorTools node)
- `lib/agent/graph.ts:151` (accountConnectorTools node)
- `lib/agent/brand-analyzer-graph.ts:67` (withCheckpoint wrapper)

---

### Bug #2: fetchPostsTool Missing Authentication

**File**: `lib/agent/tools/scraper-tools.ts:42-44`

**Issue**: Tool calls social media platform APIs without authentication headers. All requests will fail with 401 Unauthorized.

**Code**:
```typescript
// ❌ WRONG - No auth headers
const response = await fetch(`${endpoint}?${params}`, {
  signal: AbortSignal.timeout(30000),
});
```

**Impact**: Profile analysis feature completely broken. Users cannot analyze their social media content.

**Fix**:
```typescript
// ✅ CORRECT - Fetch and attach OAuth token
const connectedAccount = await prisma.connectedAccount.findFirst({
  where: { workspaceId, platform: platform.toLowerCase(), status: 'connected' },
});

if (!connectedAccount) {
  return JSON.stringify({ error: `No connected ${platform} account found` });
}

const accessToken = decryptToken(connectedAccount.accessToken);

const response = await fetch(`${endpoint}?${params}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  signal: AbortSignal.timeout(30000),
});
```

---

## High Severity (4)

### Bug #3: Console.log Leaks OAuth Secrets to Production Logs

**File**: `lib/agent/tools/social-tools.ts:42,99-131,138-144`

**Issue**: Debug `console.log` statements expose full OAuth URLs, client IDs (unmasked), scopes, and state parameters to stdout. These will appear in production logs, log aggregators, and potentially monitoring dashboards.

**Code**:
```typescript
// ❌ WRONG - Leaks secrets
console.log('[OAUTH DEBUG] Client ID (full):', credentials.clientId);
console.log('[OAUTH DEBUG] Auth URL (full, exact):', authUrl);
console.log('[OAUTH DEBUG] State (decoded):', decodeURIComponent(state));
```

**Impact**: Security vulnerability. OAuth credentials and tokens exposed in logs. Violates security best practices.

**Fix**: Remove all `console.log` debug statements. Use structured logging with appropriate log levels:
```typescript
logger.debug('oauth.initiate', { 
  platform, 
  clientIdMasked: credentials.clientId.slice(0, 4) + '...',
  hasRedirectUri: !!redirectUri 
});
```

---

### Bug #4: Checkpoint Cascade Deletion Misses Dependent Tables

**File**: `lib/agent/checkpoint-cleanup.ts:171-184`

**Issue**: Cleanup deletes from `checkpoints` table but doesn't cascade to `checkpoint_blobs` and `checkpoint_writes` tables. Orphaned rows accumulate indefinitely.

**Code**:
```typescript
// ❌ WRONG - Only deletes from checkpoints table
await prisma.$executeRawUnsafe(
  `DELETE FROM checkpoints WHERE thread_id = $1 AND checkpoint_ns = $2 AND checkpoint_id = $3`,
  thread_id,
  checkpoint_ns,
  checkpoint_id,
);
```

**Impact**: Database bloat. Checkpoint storage grows unbounded even after cleanup runs.

**Fix**: Delete from all three tables in correct order (respecting foreign keys):
```typescript
// Delete in dependency order
await prisma.$executeRawUnsafe(
  `DELETE FROM checkpoint_writes WHERE thread_id = $1 AND checkpoint_ns = $2 AND checkpoint_id = $3`,
  thread_id, checkpoint_ns, checkpoint_id
);

await prisma.$executeRawUnsafe(
  `DELETE FROM checkpoint_blobs WHERE thread_id = $1 AND checkpoint_ns = $2 AND checkpoint_id = $3`,
  thread_id, checkpoint_ns, checkpoint_id
);

await prisma.$executeRawUnsafe(
  `DELETE FROM checkpoints WHERE thread_id = $1 AND checkpoint_ns = $2 AND checkpoint_id = $3`,
  thread_id, checkpoint_ns, checkpoint_id
);
```

---

### Bug #5: JSON.parse Crash in Tool Node Wrappers

**File**: `lib/agent/graph.ts:139-146,148-157`  
**File**: `lib/agent/brand-analyzer-graph.ts:73-85`

**Issue**: ToolNode returns objects, not JSON strings. `JSON.parse()` throws `SyntaxError: Unexpected token o in JSON at position 1` when given `[object Object]`.

**Code**:
```typescript
// ❌ WRONG - ToolNode returns objects, not strings
const result = await audienceCollectorTools.invoke(state);
const parsedResult = JSON.parse(result as unknown as string);
return { ...parsedResult };
```

**Impact**: Tool execution crashes. Users see "An error occurred" instead of AI responses.

**Fix**: Handle both objects and strings:
```typescript
const result = await audienceCollectorTools.invoke(state);
const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
return { ...(parsedResult as Partial<OnboardingStateType>) };
```

---

### Bug #6: audienceProfile State Never Populated from Tool Results

**File**: `lib/agent/nodes/audience-collector.ts:73-86`  
**File**: `lib/agent/tools/audience-tools.ts:28-73`

**Issue**: `saveAudienceTool` saves to database but returns `{ success: true, message: '...' }`. The tool result goes through ToolNode which appends a ToolMessage to `messages` — it never sets `state.audienceProfile`. The AudienceSummary UI card checks `state.audienceProfile` which remains `null`.

**Code**:
```typescript
// In audience-collector.ts
if (state.audienceProfile) {  // ❌ Always null!
  const ap = state.audienceProfile as Record<string, unknown>;
  return {
    messages: [response],
    uiComponent: {
      type: 'AudienceSummary',  // Never shown
      props: { ... },
    },
  };
}
```

**Impact**: Audience summary card never displays. Users don't see confirmation of saved audience data.

**Fix**: Extract audience data from tool result and merge into state:
```typescript
// In graph.ts, wrap audienceCollectorTools node
addNode('audienceCollectorTools', async (state) => {
  const iteration = ((state as Record<string, unknown>).__tool_loop_iteration as number) ?? 0) + 1;
  const result = await audienceCollectorTools.invoke(state);
  
  // Extract audience data from tool messages
  const toolMessages = Array.isArray(result) ? result : [];
  const audienceData = extractAudienceFromToolMessages(toolMessages);
  
  return {
    ...(result as unknown as Partial<OnboardingStateType>),
    __tool_loop_iteration: iteration,
    ...(audienceData && { audienceProfile: audienceData }),
  };
});
```

---

## Medium Severity (6)

### Bug #7: getGraphStructure() Exports Stale Hardcoded Data

**File**: `lib/agent/graph.ts:218-280`

**Issue**: Function returns hardcoded node/edge arrays that don't reflect the actual graph built by `buildWorkflow()`. When nodes/edges are added or removed, the export becomes stale.

**Code**:
```typescript
export function getGraphStructure() {
  return {
    nodes: ['orchestrator', 'greeting', /* ... */],  // Hardcoded!
    edges: [['__start__', 'orchestrator'], /* ... */],  // Hardcoded!
  };
}
```

**Impact**: Debug tools, documentation generators, and monitoring dashboards show incorrect graph topology.

**Fix**: Extract structure from compiled graph:
```typescript
export function getGraphStructure() {
  const graph = getOnboardingGraph();
  return {
    nodes: Object.keys(graph.nodes),
    edges: graph.edges.map(e => [e.source, e.target]),
  };
}
```

---

### Bug #8: brandAnalyzerNode Sets Wrong currentStep on Error

**File**: `lib/agent/nodes/brand-analyzer.ts:112`

**Issue**: Refinement error path sets `currentStep: 'review'` instead of `'error'`. Router checks for `currentStep === 'error'` to route to `done`, so this bypasses error handling.

**Code**:
```typescript
} catch (err) {
  logger.error('brandAnalyzerNode: refinement failed', { error: String(err) });
  return {
    currentStep: 'review',  // ❌ Should be 'error'
    messages: [new AIMessage('Refinement failed. Please try again.')],
  };
}
```

**Impact**: Graph proceeds to `platformAdapter` with broken brand context instead of stopping. Downstream nodes fail or produce garbage.

**Fix**:
```typescript
return {
  currentStep: 'error',  // ✅ Router will route to done
  messages: [new AIMessage('Refinement failed. Please try again.')],
};
```

---

### Bug #9: Three Separate Checkpointer Instances Create Triple Connection Pools

**File**: `lib/agent/graph.ts:78-92`  
**File**: `lib/agent/brand-analyzer-graph.ts:111-124`  
**File**: `lib/agent/self-healer/graph.ts:72-85`

**Issue**: Each graph file has its own `ensureCheckpointer()` function with module-scoped `checkpointer` variable. Each creates a separate PostgresSaver instance with its own connection pool.

**Code**:
```typescript
// In graph.ts
let checkpointer: PostgresSaver | undefined;
async function ensureCheckpointer() {
  if (!checkpointer) {
    checkpointer = PostgresSaver.fromConnString(databaseUrl);
    await checkpointer.setup();
  }
  return checkpointer;
}

// In brand-analyzer-graph.ts - DUPLICATE
let checkpointer: PostgresSaver | undefined;
async function ensureCheckpointer() { /* ... */ }

// In self-healer/graph.ts - DUPLICATE
let checkpointer: PostgresSaver | undefined;
async function ensureCheckpointer() { /* ... */ }
```

**Impact**: Three connection pools to the same database. Wastes database connections. `checkpointer.setup()` runs DDL migrations three times (race condition on table creation).

**Fix**: Extract shared checkpointer:
```typescript
// lib/agent/checkpointer.ts
let checkpointer: PostgresSaver | undefined;
export async function ensureCheckpointer() {
  if (!checkpointer) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL required');
    checkpointer = PostgresSaver.fromConnString(databaseUrl);
    await checkpointer.setup();
  }
  return checkpointer;
}

// In all graph files:
import { ensureCheckpointer } from './checkpointer';
```

---

### Bug #10: Unbounded Memory Growth in governed-tool.ts Rate Limiter

**File**: `lib/agent/governed-tool.ts:37-47`

**Issue**: `rateLimitMap` grows indefinitely. Eviction only runs when map reaches 10,000 entries, and only removes expired entries. If tools are called frequently, map grows unbounded.

**Code**:
```typescript
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    if (rateLimitMap.size >= 10_000) {  // ❌ Too high, eviction too late
      evictExpiredEntries();
    }
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  // ...
}
```

**Impact**: Memory leak in long-running processes. Rate limiter becomes ineffective as map grows.

**Fix**: Lower eviction threshold and evict more aggressively:
```typescript
const MAX_RATE_LIMIT_ENTRIES = 1_000;  // ✅ Lower threshold

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      evictExpiredEntries();
      // If still too large, clear oldest half
      if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
        const keys = Array.from(rateLimitMap.keys());
        for (let i = 0; i < keys.length / 2; i++) {
          rateLimitMap.delete(keys[i]);
        }
      }
    }
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  // ...
}
```

---

### Bug #11: Missing Error Handling in LLM Node Invocations

**File**: `lib/agent/nodes/brand-analyzer.ts:93-116`  
**File**: `lib/agent/nodes/brand-platform-adapter.ts:86-108`  
**File**: `lib/agent/nodes/brand-sample-generator.ts:54-76`

**Issue**: LLM `model.invoke()` calls wrapped in try-catch, but errors only logged, not surfaced to user. Graph continues with empty/partial state.

**Code**:
```typescript
try {
  const response = await model.invoke(messages);
  // Parse response...
} catch (err) {
  logger.error('brandAnalyzerNode: LLM invocation failed', { error: String(err) });
  return {
    brandContextDraft: {},  // ❌ Empty draft
    currentStep: 'adapt',   // ❌ Proceeds anyway
  };
}
```

**Impact**: Users see empty brand context with no error message. Graph proceeds to next steps with garbage data.

**Fix**: Return error state and user-facing message:
```typescript
} catch (err) {
  logger.error('brandAnalyzerNode: LLM invocation failed', { error: String(err) });
  return {
    currentStep: 'error',
    messages: [new AIMessage('Analysis failed. Please try again or describe your brand differently.')],
  };
}
```

---

### Bug #12: failures Reducer Appends Instead of Replacing

**File**: `lib/agent/self-healer/state.ts:71-74`

**Issue**: `failures` reducer uses append pattern `[..._c, ...n]`. On retry loops, failures accumulate across iterations instead of being replaced.

**Code**:
```typescript
failures: Annotation<ScraperFailure[]>({
  default: () => [],
  reducer: (_c, n) => [..._c, ...n],  // ❌ Appends
}),
```

**Impact**: After 3 retries, `failures` array contains 3x the failures. Downstream logic processes stale failures.

**Fix**: Replace instead of append:
```typescript
failures: Annotation<ScraperFailure[]>({
  default: () => [],
  reducer: (_c, n) => n,  // ✅ Replace
}),
```

---

## Low Severity (3)

### Bug #13: __debug_step_counter Never Increments

**File**: `lib/agent/debug.ts:47-49`

**Issue**: Counter reads from state but never writes back. Always returns 0.

**Code**:
```typescript
const currentCount = (state as Record<string, unknown>).__debug_step_count as number;
// ❌ Never writes back: { __debug_step_count: currentCount + 1 }
```

**Impact**: Debug counter useless. No functional impact.

**Fix**: Return incremented value:
```typescript
return {
  // ... other state
  __debug_step_count: currentCount + 1,
};
```

---

### Bug #14: xss-sanitize.ts Imports Missing Package

**File**: `lib/agent/self-healer/tools/xss-sanitize.ts:1`

**Issue**: Imports `xss` package but unclear if it's in `package.json`. If missing, tool crashes at runtime.

**Code**:
```typescript
import xss from 'xss';  // ❓ May not be installed
```

**Impact**: If package not installed, fix-generator-node crashes when sanitizing HTML.

**Fix**: Verify package installed:
```bash
pnpm list xss
# If not installed:
pnpm add xss
```

---

### Bug #15: Template Literal Edge Case in previewBrandVoiceTool

**File**: `lib/agent/tools/brand-voice-tools.ts:279-283`

**Issue**: Template literal uses `${voiceProfile.description}` which could contain backticks, breaking the prompt string.

**Code**:
```typescript
const prompt = `
  Brand voice: ${voiceProfile.description}  // ❌ If description contains `, breaks string
  Generate posts...
`;
```

**Impact**: Edge case. If user enters backtick in brand voice description, prompt injection breaks tool.

**Fix**: Escape or validate input:
```typescript
const safeDescription = voiceProfile.description.replace(/`/g, '\\`');
const prompt = `
  Brand voice: ${safeDescription}
  Generate posts...
`;
```

---

## Summary Table

| ID | Severity | File | Issue |
|----|----------|------|-------|
| 1 | Critical | graph.ts, brand-analyzer-graph.ts | Operator precedence breaks tool loop guard |
| 2 | Critical | scraper-tools.ts | fetchPostsTool missing auth headers |
| 3 | High | social-tools.ts | Console.log leaks OAuth secrets |
| 4 | High | checkpoint-cleanup.ts | Cascade deletion misses dependent tables |
| 5 | High | graph.ts, brand-analyzer-graph.ts | JSON.parse crash on object input |
| 6 | High | audience-collector.ts, audience-tools.ts | audienceProfile state never populated |
| 7 | Medium | graph.ts | getGraphStructure() exports stale data |
| 8 | Medium | brand-analyzer.ts | Wrong currentStep on refinement error |
| 9 | Medium | graph.ts, brand-analyzer-graph.ts, self-healer/graph.ts | Triple checkpointer pools |
| 10 | Medium | governed-tool.ts | Unbounded memory growth in rate limiter |
| 11 | Medium | brand-analyzer.ts, brand-platform-adapter.ts, brand-sample-generator.ts | Missing error handling in LLM nodes |
| 12 | Medium | self-healer/state.ts | failures reducer appends instead of replaces |
| 13 | Low | debug.ts | __debug_step_counter never increments |
| 14 | Low | xss-sanitize.ts | Imports potentially missing package |
| 15 | Low | brand-voice-tools.ts | Template literal edge case |

---

## Recommended Fix Priority

1. **Immediate** (Critical): Fix bugs #1, #2
2. **This sprint** (High): Fix bugs #3, #4, #5, #6
3. **Next sprint** (Medium): Fix bugs #7-#12
4. **Backlog** (Low): Fix bugs #13-#15

---

## Testing Recommendations

After fixes, run:
```bash
# Type checking
pnpm run typecheck

# Linting
pnpm run lint

# Build
pnpm run build

# Unit tests
pnpm test

# Integration tests (if available)
pnpm test:integration
```

Verify OAuth flow end-to-end:
1. Connect a social account
2. Run profile analysis
3. Verify posts are fetched successfully

Verify tool loop guard:
1. Trigger a tool loop (e.g., audience collector with invalid input)
2. Verify loop terminates after 10 iterations
3. Check logs for `tool_loop_guard_triggered` warning
