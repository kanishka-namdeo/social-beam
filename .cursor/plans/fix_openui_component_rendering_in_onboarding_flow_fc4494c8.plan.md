---
name: Fix OpenUI Component Rendering in Onboarding Flow
overview: Fix OpenUI component rendering by wiring agent nodes to populate the `uiComponent` state field, updating the SSE stream to emit component data, and ensuring the frontend renderer properly displays components from the stream.
todos:
  - id: fix-state-type
    content: "Update OnboardingState to type uiComponent as an object { type: string; props: Record<string, unknown> } instead of string | null"
    status: in_progress
  - id: update-account-connector-node
    content: Modify account-connector node to parse LLM output for component references and set uiComponent in state
    status: pending
  - id: update-profile-analyzer-node
    content: Modify profile-analyzer node to set uiComponent with ProfileSummaryCard data from analysis results
    status: pending
  - id: update-greeting-node
    content: Update greeting node to set uiComponent with StepIndicator showing progress
    status: pending
  - id: update-sse-streaming
    content: Update SSE handlers in chat and resume routes to correctly emit uiComponent objects
    status: pending
  - id: update-frontend-renderer
    content: Update frontend OpenUIRenderer to handle the correct component prop shape from state
    status: pending
  - id: verify-build
    content: Run pnpm run typecheck, pnpm run lint, and pnpm run build to verify
    status: pending
isProject: false
---

# Fix OpenUI Component Rendering in Onboarding Flow

## Problem

The onboarding flow has a complete OpenUI component library (`lib/openui/library.tsx`) with 4 components defined, and a frontend renderer in `app/(auth)/onboarding/page.tsx`. However, **no agent node populates the `uiComponent` state field**, so the SSE stream never sends component data to the frontend, and the OpenUI components never render.

The LLM is instructed in system prompts to "emit OpenUI components," but its text responses go into the LangChain `messages` array — not into the `uiComponent` state field that the frontend expects.

## Root Causes

1. **State type mismatch**: `uiComponent` is typed as `Annotation<string | null>` but the frontend expects `{ type: string; props: Record<string, unknown> }`
2. **No node writes uiComponent**: Every node only returns `messages` and `currentStep` — none return `uiComponent`
3. **SSE handler expects wrong shape**: The `on_chain_end` handler checks `output?.uiComponent` but since no node sets it, it's always `null`
4. **Frontend renderer is disconnected**: The `OpenUIRenderer` manually maps strings to components but never receives data to render

## Solution Overview

```mermaid
flowchart TD
    A[Agent Node] --> B[Returns { uiComponent: { type, props } }]
    B --> C[LangGraph state updated]
    C --> D[SSE on_chain_end reads output.uiComponent]
    D --> E[SSE emits { uiComponent: { type, props } }]
    E --> F[Frontend processStream attaches to message]
    F --> G[OpenUIRenderer renders component]
```



## Implementation

### Task 1: Fix State Type

**File**: `lib/agent/state.ts`

Change the `uiComponent` annotation from `string | null` to an object shape that matches what the frontend expects:

```typescript
import { Annotation } from "@langchain/langgraph";

// Current (broken):
uiComponent: Annotation<string | null>(),

// Fixed:
uiComponent: Annotation<{ type: string; props: Record<string, unknown> } | null>(),
```

This allows nodes to return structured component descriptors that flow through the graph and into the SSE stream.

### Task 2: Update Account Connector Node

**File**: `lib/agent/nodes/account-connector.ts`

Currently the node only returns messages from the LLM. After the LLM responds, we need to parse its output for component references and set `uiComponent`. The node should:

1. Keep the existing LLM call that generates conversational text
2. After the LLM responds, if the LLM mentioned a platform to connect, return a `uiComponent` alongside the messages
3. Use a structured approach: the LLM's system prompt already instructs it to mention `AccountConnectionCard` — we parse the response or use a second structured extraction

Simplified approach: since the account connector's job is to present platforms to connect, always return a `uiComponent` with the platform info from the LLM's response, or from the tool outputs (list_connected_platforms).

Key change to the return statement:

```typescript
// After the LLM responds, construct uiComponent from the response or platform list
const componentData = extractComponentFromLLMResponse(messages[messages.length - 1]?.content);
return {
  messages: [new AIMessage(llmResponse)],
  currentStep: "connect_accounts",
  uiComponent: componentData || null,
};
```

Where `extractComponentFromLLMResponse` parses the LLM output for platform mentions, or falls back to the last tool output from `listConnectedPlatformsTool`.

### Task 3: Update Profile Analyzer Node

**File**: `lib/agent/nodes/profile-analyzer.ts`

This node already runs a structured LLM analysis that produces `profileAnalysis` (tone, postTypes, audienceInsights). It should also return a `uiComponent` with `ProfileSummaryCard` data:

```typescript
return {
  messages: [new AIMessage(`Profile analysis complete...`)],
  profileAnalysis: analysis,
  currentStep: "train_brand_voice",
  uiComponent: {
    type: "ProfileSummaryCard",
    props: {
      tone: analysis.tone,
      postTypes: analysis.postTypes,
      imageAnalysis: analysis.imageAnalysis,
      audienceInsights: analysis.audienceInsights,
    },
  },
};
```

### Task 4: Update Greeting Node

**File**: `lib/agent/nodes/greeting.ts`

The greeting node should return a `StepIndicator` component showing the onboarding progress (step 1 of 7):

```typescript
const stepLabels = ["Welcome", "Your Info", "Audience", "Connect", "Analyze", "Brand Voice", "Complete"];
return {
  messages: [new AIMessage(welcomeMessage)],
  currentStep: "collect_info",
  uiComponent: {
    type: "StepIndicator",
    props: {
      currentStep: 1,
      totalSteps: 7,
      stepLabels,
    },
  },
};
```

### Task 5: Update SSE Streaming

**Files**: `app/api/onboarding/chat/route.ts` and `app/api/onboarding/resume/route.ts`

The `on_chain_end` handler already checks for `output?.uiComponent`. Since the state type is now correct (object not string), this should work. Verify the emit line:

```typescript
if (output?.uiComponent) {
  streamText(encoder.encode(`data: ${JSON.stringify({ uiComponent: output.uiComponent })}\n\n`));
}
```

### Task 6: Update Frontend Renderer

**File**: `app/(auth)/onboarding/page.tsx`

The `OpenUIRenderer` currently expects `component.type` and passes props manually. Since `uiComponent` now has shape `{ type: string; props: Record<string, unknown> }`, update the renderer to spread props:

```tsx
function OpenUIRenderer({ component, onConnect }: { component: { type: string; props: Record<string, unknown> }; onConnect?: (platform: string) => void }) {
  const { type, props } = component;
  
  if (type === 'AccountConnectionCard') {
    return (
      <AccountConnectionCardComponent
        platform={props.platform as string}
        status={props.status as 'disconnected' | 'connecting' | 'connected' | 'error'}
        onConnect={() => onConnect?.(props.platform as string)}
      />
    );
  }
  // ... similar for other types
}
```

Also verify the `processStream` handler correctly attaches `uiComponent` to the message object with the right shape.

### Task 7: Verification

Run the standard verification suite:

- `pnpm run typecheck` — no type errors
- `pnpm run lint` — no lint warnings  
- `pnpm run build` — successful build

## Files to Modify


| File                                   | Change                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `lib/agent/state.ts`                   | Change `uiComponent` type from `string                                   |
| `lib/agent/nodes/greeting.ts`          | Add `uiComponent` return with `StepIndicator`                            |
| `lib/agent/nodes/account-connector.ts` | Parse LLM response and return `uiComponent` with `AccountConnectionCard` |
| `lib/agent/nodes/profile-analyzer.ts`  | Add `uiComponent` return with `ProfileSummaryCard` from analysis data    |
| `app/api/onboarding/chat/route.ts`     | Verify SSE emit for `uiComponent` object                                 |
| `app/api/onboarding/resume/route.ts`   | Verify SSE emit for `uiComponent` object                                 |
| `app/(auth)/onboarding/page.tsx`       | Update `OpenUIRenderer` to spread props from `{ type, props }` shape     |


