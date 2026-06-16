# Agent Safety Controls — Implementation Summary

## Overview
Implemented comprehensive safety controls for all three agent graphs (onboarding, brand-analyzer, self-healer) plus compose agent.

## Files Created

### 1. `lib/agent/tool-policy.ts`
Defines which tools each agent type is allowed to use.

**Agent Allowlists:**
- **onboarding**: OAuth, account connection, audience/brand context management, post fetching
- **brand-analyzer**: Web crawling (web_fetch, web_search), brand context saving
- **self-healer**: DOM probing, failure detection, fix application, verification
- **compose**: Brand context retrieval, voice preview

**Exports:**
- `TOOL_ALLOWLISTS`: Record mapping agent types to allowed tool sets
- `validateToolAccess(agentType, toolName)`: Returns `{ allowed, reason? }`

### 2. `lib/agent/governed-tool.ts`
Wraps tool execution with policy checking and rate limiting.

**Features:**
- Validates tool access against allowlists before execution
- Per-tool rate limiting: 30 calls per 60-second window
- Logs all invocations with access granted/denied status

**Exports:**
- `createGovernedTool({ toolName, agentType, description, schema, toolFn })`: Creates a governed tool wrapper

### 3. `lib/agent/hitl-gate.ts`
Human-in-the-loop approval system for destructive operations.

**Features:**
- In-memory pending action store (MVP; can migrate to DB)
- 10-minute timeout for approvals
- Tracks action details, status, resolution

**Exports:**
- `requestApproval(action, details)`: Returns Promise that resolves when approved/rejected
- `approveAction(actionId)`: Approves pending action
- `rejectAction(actionId, reason)`: Rejects with reason
- `listPendingApprovals()`: Lists all pending approvals

### 4. `lib/agent/behavior-monitor.ts`
Tracks per-agent-run metrics and enforces safety thresholds.

**Thresholds:**
- Max tool calls per run: 50
- Max token usage per run: 100,000
- Max error rate: 30% of actions
- Max execution time: 10 minutes

**Exports:**
- `startAgentRun(runId, agentType)`: Initializes run tracking
- `recordAgentAction(runId, action)`: Records tool calls, LLM calls, errors, node transitions
- `checkAgentHealth(runId)`: Returns `{ healthy, reason? }` based on thresholds
- `finishAgentRun(runId)`: Cleans up run metrics
- `listActiveRuns()`: Lists all active runs with health status

### 5. `lib/agent/kill-switch.ts`
Manages active agent runs with abort controllers for external termination.

**Exports:**
- `registerAgentRun(runId, agentType)`: Registers run, returns AbortController
- `killAgentRun(runId)`: Aborts running agent, returns success boolean
- `unregisterAgentRun(runId)`: Removes run from tracking
- `listActiveRuns()`: Lists active runs with metadata
- `getAbortController(runId)`: Retrieves abort controller for a run

### 6. `app/api/admin/agent-runs/route.ts`
Admin API endpoint for managing agent runs.

**Endpoints:**
- **GET** `/api/admin/agent-runs`: Lists all active agent runs
- **DELETE** `/api/admin/agent-runs?runId=<id>`: Kills specified agent run

**Auth:** Gated behind admin role verification (checks session + DB).

## Files Modified

### `lib/agent/self-healer/graph.ts`
Added LangGraph `interruptBefore: ['fixApplier']` to pause execution before applying code patches, requiring human approval via the HITL gate.

## Integration Points

### Using Governed Tools
Replace direct tool creation with `createGovernedTool`:

```typescript
import { createGovernedTool } from '@/lib/agent/governed-tool';
import { z } from 'zod';

const myTool = createGovernedTool({
  toolName: 'my_tool',
  agentType: 'onboarding',
  description: 'Does something useful',
  schema: z.object({ input: z.string() }),
  toolFn: async (input) => {
    // Tool logic
    return JSON.stringify({ result: 'success' });
  },
});
```

### Using Behavior Monitor
Wrap agent invocations with monitoring:

```typescript
import { startAgentRun, recordAgentAction, checkAgentHealth, finishAgentRun } from '@/lib/agent/behavior-monitor';
import { registerAgentRun, killAgentRun } from '@/lib/agent/kill-switch';

const runId = crypto.randomUUID();
startAgentRun(runId, 'brand-analyzer');
const abortController = registerAgentRun(runId, 'brand-analyzer');

try {
  // During agent execution, record actions:
  recordAgentAction(runId, {
    type: 'tool_call',
    toolName: 'web_fetch',
    timestamp: Date.now(),
  });

  // Check health periodically:
  const health = checkAgentHealth(runId);
  if (!health.healthy) {
    killAgentRun(runId);
    throw new Error(`Agent unhealthy: ${health.reason}`);
  }

  // Run agent with abort signal:
  await graph.invoke(input, { signal: abortController.signal });
} finally {
  finishAgentRun(runId);
  unregisterAgentRun(runId);
}
```

### Using HITL Gate
Request approval before destructive operations:

```typescript
import { requestApproval } from '@/lib/agent/hitl-gate';

// In self-healer fix applier node:
const approval = await requestApproval('apply_code_patches', {
  patches: state.proposedFixes,
  scraperNames: state.proposedFixes.map(f => f.scraperName),
});

if (!approval.approved) {
  return { currentStep: 'report', reason: approval.reason };
}

// Proceed with applying patches
```

### Admin API Usage
List and kill agent runs:

```bash
# List active runs
curl -X GET http://localhost:3000/api/admin/agent-runs \
  -H "Authorization: Bearer <admin-token>"

# Kill a run
curl -X DELETE "http://localhost:3000/api/admin/agent-runs?runId=<run-id>" \
  -H "Authorization: Bearer <admin-token>"
```

## Testing Recommendations

1. **Tool Policy**: Verify each agent can only call allowed tools
2. **Rate Limiting**: Confirm 30-call limit resets after 60s window
3. **HITL Gate**: Test approval/rejection/timeout flows
4. **Behavior Monitor**: Verify thresholds trigger correctly
5. **Kill Switch**: Confirm abort controllers terminate runs cleanly
6. **Admin API**: Test auth gating and run management

## Future Enhancements

- Migrate HITL gate to DB-backed storage for persistence across restarts
- Add WebSocket notifications for pending approvals
- Implement automatic retry logic for transient failures
- Add metrics export to monitoring systems (Datadog, Grafana)
- Create admin UI for viewing/killing agent runs
- Add per-user rate limits in addition to per-tool limits
