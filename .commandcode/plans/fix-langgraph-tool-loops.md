# Fix LangGraph Agent Tool Loops & Wait Node Advancement

## Problem Summary

The onboarding agent graph has two **critical** issues where LLM tool calls are silently dropped, and a **medium-severity** issue where wait nodes hardcode step advancement, preventing multi-turn conversations within a step.

---

## Fix 1: Wire `audienceCollector` tool loop (CRITICAL)

**Current problem:** `audienceCollectorNode` binds `saveAudienceTool` and `getAudienceTool`, but the graph routes directly to `audienceCollectorWait` — no conditional edge, no tool execution node wired in.

### Changes to `lib/agent/graph.ts`

**A. Add a routing function** (after `routeAfterAccountConnector`, ~line 47):

```typescript
function routeAfterAudienceCollector(state: OnboardingStateType): string {
  const msgs = state.messages;
  const lastMsg = msgs[msgs.length - 1] as unknown as Record<string, unknown>;
  const hasToolCalls = Array.isArray(lastMsg?.tool_calls)
    && (lastMsg.tool_calls as unknown[]).length > 0;

  const iteration = ((state as Record<string, unknown>).__tool_loop_iteration as number) ?? 0;
  const maxIterations = 10;
  if (iteration >= maxIterations) {
    logger.warn('agent.tool_loop_guard_triggered', { node: 'audienceCollector', iterations: iteration, maxIterations });
    return 'audienceCollectorWait';
  }

  if (hasToolCalls) return 'audienceCollectorTools';
  return 'audienceCollectorWait';
}
```

**B. Add an `audienceCollectorTools` node** (after the `accountConnectorTools` wrapper ~line 121):

```typescript
.addNode('audienceCollectorTools', withDebugTrace('audienceCollectorTools', async (state) => {
  const iteration = ((state as Record<string, unknown>).__tool_loop_iteration as number ?? 0) + 1;
  const result = await audienceCollectorTools.invoke(state);
  return {
    ...(result as unknown as Partial<OnboardingStateType>),
    __tool_loop_iteration: iteration,
  };
}))
```

**C. Import `audienceCollectorTools`** at the top of `graph.ts`:

```typescript
import { audienceCollectorNode, audienceCollectorWait, audienceCollectorTools } from './nodes/audience-collector';
```

**D. Replace the hard edge** (`audienceCollector → audienceCollectorWait`) with conditional routing:

```typescript
// BEFORE:
.addEdge('audienceCollector', 'audienceCollectorWait')

// AFTER:
.addConditionalEdges('audienceCollector', loggedRouteAfterAudienceCollector, {
  audienceCollectorTools: 'audienceCollectorTools',
  audienceCollectorWait: 'audienceCollectorWait',
})
.addEdge('audienceCollectorTools', 'audienceCollector')
```

**E. Wrap the router and add destination to orchestrator's conditional, and to `getGraphStructure`:**

```typescript
const loggedRouteAfterAudienceCollector = createRoutedRouter('routeAfterAudienceCollector', routeAfterAudienceCollector);
```

Update `getGraphStructure()` to include `audienceCollectorTools` in nodes, and the new conditional edge.

---

## Fix 2: Wire `brandVoice` tool loop (CRITICAL)

Identical pattern to Fix 1. `brandVoiceNode` binds `saveBrandVoiceTool`, `getBrandVoiceTool`, and `previewBrandVoiceTool`. Graph routes directly to `brandVoiceWait`.

### Changes to `lib/agent/graph.ts`

**A. Add routing function:**

```typescript
function routeAfterBrandVoice(state: OnboardingStateType): string {
  const msgs = state.messages;
  const lastMsg = msgs[msgs.length - 1] as unknown as Record<string, unknown>;
  const hasToolCalls = Array.isArray(lastMsg?.tool_calls)
    && (lastMsg.tool_calls as unknown[]).length > 0;

  const iteration = ((state as Record<string, unknown>).__tool_loop_iteration as number) ?? 0;
  const maxIterations = 10;
  if (iteration >= maxIterations) {
    logger.warn('agent.tool_loop_guard_triggered', { node: 'brandVoice', iterations: iteration, maxIterations });
    return 'brandVoiceWait';
  }

  if (hasToolCalls) return 'brandVoiceTools';
  return 'brandVoiceWait';
}
```

**B. Add `brandVoiceTools` node:**

```typescript
.addNode('brandVoiceTools', withDebugTrace('brandVoiceTools', async (state) => {
  const iteration = ((state as Record<string, unknown>).__tool_loop_iteration as number ?? 0) + 1;
  const result = await brandVoiceTools.invoke(state);
  return {
    ...(result as unknown as Partial<OnboardingStateType>),
    __tool_loop_iteration: iteration,
  };
}))
```

**C. Import `brandVoiceTools`:**

```typescript
import { brandVoiceNode, brandVoiceWait, brandVoiceTools } from './nodes/brand-voice';
```

But `brandVoiceTools` doesn't exist yet — see `lib/agent/nodes/brand-voice.ts` changes below.

**D. Replace hard edge:**

```typescript
// BEFORE:
.addEdge('brandVoice', 'brandVoiceWait')

// AFTER:
.addConditionalEdges('brandVoice', loggedRouteAfterBrandVoice, {
  brandVoiceTools: 'brandVoiceTools',
  brandVoiceWait: 'brandVoiceWait',
})
.addEdge('brandVoiceTools', 'brandVoice')
```

**E. Update `getGraphStructure()`.**

### Changes to `lib/agent/nodes/brand-voice.ts`

Add a `ToolNode` export (like `audience-collector.ts` already has):

```typescript
import { ToolNode } from '@langchain/langgraph/prebuilt';

export const brandVoiceTools = new ToolNode([
  saveBrandVoiceTool,
  getBrandVoiceTool,
  previewBrandVoiceTool,
]);
```

---

## Fix 3: Make wait nodes state-aware — don't hardcode advancement (MEDIUM)

Currently every `*Wait` node unconditionally sets `currentStep` to the next step. This means:
- A single resume always advances the workflow by one step
- Users cannot have multi-turn conversations within a single step
- After `audienceCollectorWait`, the user can't say "let me clarify my audience"

### Approach

Wait nodes should check state to decide whether to advance or stay. The model nodes already run before the wait — if the LLM determined the step is complete (saved data, no more questions), the wait node advances. Otherwise it stays.

### Changes to `lib/agent/nodes/audience-collector.ts`

**audienceCollectorWait:** Advance only when audience data exists in state.

```typescript
// BEFORE:
return {
  messages: [new HumanMessage(userReply)],
  currentStep: 'connect_accounts',
};

// AFTER:
const shouldAdvance = state.audienceProfile != null;

return {
  messages: [new HumanMessage(userReply)],
  ...(shouldAdvance ? { currentStep: 'connect_accounts' } : {}),
};
```

### Changes to `lib/agent/nodes/account-connector.ts`

**accountConnectorWait:** Advance only when accounts are connected.

```typescript
// BEFORE:
return {
  messages: [new HumanMessage(userReply)],
  currentStep: 'analyze_profile',
};

// AFTER:
const connectedCount = state.connectedAccounts.filter(a => a.status === 'connected').length;
const shouldAdvance = connectedCount > 0;

return {
  messages: [new HumanMessage(userReply)],
  ...(shouldAdvance ? { currentStep: 'analyze_profile' } : {}),
};
```

### Changes to `lib/agent/nodes/brand-voice.ts`

**brandVoiceWait:** Advance only when brand voice is saved, or user explicitly skips.

```typescript
// BEFORE:
return {
  messages: [new HumanMessage(userReply)],
  currentStep: 'completion',
};

// AFTER:
const userSaidSkip = /skip|not now|later|no thanks/i.test(userReply);
const hasProfile = state.brandVoiceProfile != null;
const shouldAdvance = hasProfile || userSaidSkip;

return {
  messages: [new HumanMessage(userReply)],
  ...(shouldAdvance ? { currentStep: 'completion' } : {}),
};
```

### Changes to `lib/agent/nodes/user-info-collector.ts`

**userInfoCollectorWait:** Advance only when user submitted the form.

```typescript
// BEFORE:
return {
  messages: [new HumanMessage(userReply)],
  userInfo,
  currentStep: 'define_audience',
};

// AFTER:
const userInfo = userReply.toLowerCase().startsWith('my info:')
  ? parseUserInfo(userReply)
  : {};
const hasSubmittedForm = Object.keys(userInfo).length > 0;

// Track attempts for starvation guard in the collector node
const attempts = ((state.userInfo ?? {}) as Record<string, unknown>).__form_attempts as number ?? 0;

return {
  messages: [new HumanMessage(userReply)],
  ...(hasSubmittedForm
    ? { userInfo, currentStep: 'define_audience' }
    : { userInfo: { ...state.userInfo, __form_attempts: attempts + 1 } }
  ),
};
```

---

## Fix 4: Update `getGraphStructure()` in `graph.ts`

Must reflect new nodes, edges, and conditionals for both `audienceCollector` and `brandVoice`.

```typescript
nodes: [
  // ... existing nodes ...
  'audienceCollectorTools',  // new
  'brandVoiceTools',         // new
],
edges: [
  // Replace:
  // ['audienceCollector', 'audienceCollectorWait'] → removed
  // ['brandVoice', 'brandVoiceWait'] → removed
  // Add:
  ['audienceCollectorTools', 'audienceCollector'],
  ['brandVoiceTools', 'brandVoice'],
],
conditionals: [
  // ... existing ...
  {
    from: 'audienceCollector',
    router: 'routeAfterAudienceCollector',
    routes: ['audienceCollectorTools', 'audienceCollectorWait'],
  },
  {
    from: 'brandVoice',
    router: 'routeAfterBrandVoice',
    routes: ['brandVoiceTools', 'brandVoiceWait'],
  },
],
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `lib/agent/graph.ts` | Add 2 routing functions, 2 tool-node wrappers, 2 conditional edges + loop edges, update imports, update `getGraphStructure()` |
| `lib/agent/nodes/brand-voice.ts` | Export `brandVoiceTools` `ToolNode` |
| `lib/agent/nodes/audience-collector.ts` | Remove unconditional `currentStep` from wait node, add state-aware advancement check |
| `lib/agent/nodes/account-connector.ts` | Remove unconditional `currentStep` from wait node, add state-aware advancement |
| `lib/agent/nodes/user-info-collector.ts` | Remove unconditional `currentStep` from wait, add attempt tracking guard |

---

## Verification

1. **Graph compilation:** `buildWorkflow()` should compile without errors
2. **Mermaid diagram:** `getGraphMermaid()` should show 3 conditional routing diamonds (orchestrator + accountConnectorModel + audienceCollector + brandVoice)
3. **Tool execution:** Run `test-agent.ts` and verify that when the LLM emits `tool_calls` in the audience step, the tools actually execute (check DB for saved audience data)
4. **Brand voice tools:** Same verification — brand voice data should persist to DB when LLM calls tools
5. **Multi-turn:** After `interrupt()`, resuming with a non-completing message (e.g., "tell me more") should keep the user in the same step instead of advancing to the next one
6. **No infinite loops:** Tool-loop guard should trigger after 10 iterations in each tool loop
