---
name: Fix OAuth Agent Trigger
overview: Wire the OAuth2 login flows into the onboarding agent by adding a ReAct tool execution loop, making the orchestrator aware of connected accounts, building an OAuth popup bridge with BroadcastChannel, and rendering inline connect buttons in the chat UI.
todos:
  - id: react-loop
    content: Split account connector into model node + ToolNode, add conditional edges in graph
    status: completed
  - id: orchestrator-awareness
    content: Add connected-account check to orchestrator to skip connect_accounts if already connected
    status: completed
  - id: oauth-popup-bridge
    content: Create /api/onboarding/oauth/initiate endpoint + BroadcastChannel bridge in onboarding page
    status: completed
  - id: inline-connect-buttons
    content: Wire AccountConnectionCard onConnect to popup flow, fix component to use Button + onClick
    status: completed
  - id: verification
    content: Run typecheck, lint, build and verify all acceptance criteria
    status: completed
isProject: false
---

# Fix OAuth Trigger Mechanism in Onboarding Agent

## Overview

The onboarding agent has 6 fully implemented OAuth2 platform flows, but the trigger mechanism is broken at three integration points: (1) `accountConnectorNode` has no ReAct tool execution loop, (2) the orchestrator is purely linear with no awareness of already-connected accounts, and (3) the OAuth callback doesn't bridge back into the agent graph state or the chat UI. This plan wires all pieces together into a functioning flow.

---

## Research Summary

**LangGraph Tool Execution Pattern** (LangChain 2025-2026):
- The standard pattern for tool-using nodes in LangGraph is a conditional edge: after the model node, use `END` if no tool calls, or a `ToolNode` if there are tool calls. The ToolNode executes tools and routes back to the model node for another iteration.
- Source: [LangGraph ToolNode docs](https://langchain-ai.github.io/langgraph/how-tos/tool-calling/) (2025)
- Source: [LangGraph prebuilt ToolNode](https://langchain-ai.github.io/langgraph/reference/prebuilt/#langgraph.prebuilt.tool_node.ToolNode) — executes `Tool` instances from `AIMessage.tool_calls` and returns `ToolMessage` results

**OAuth Popup Pattern** (2025-2026 best practices):
- Opening OAuth in a popup window with `window.open()` and polling `window.opener` for completion is the standard pattern. The popup closes itself after redirect, and the parent window receives a message via `BroadcastChannel` or `postMessage`.
- Source: [OAuth 2.0 for SPAs — popup pattern](https://auth0.com/docs/get-started/authentication-and-authorization-flow/redirect-user-to-login) (2025)

---

## Implementation Approach

The fix has 4 independent concerns that build on each other:

1. **Add ReAct loop to `accountConnectorNode`** — wire the existing `ToolNode` + conditional edges so tools actually execute
2. **Make orchestrator skip `connect_accounts` when accounts already connected** — query `ConnectedAccount` table before advancing
3. **Build OAuth popup bridge** — frontend `BroadcastChannel` to capture callback result and inject it as a chat message
4. **Render inline connect buttons** — `AccountConnectionCard` with real `onConnect` handlers that open OAuth popups

---

## File Changes

| File | Change | API/Pattern Used |
|---|-----|---|---|
| `lib/agent/graph.ts` | Add `callModel` and `tools` nodes for account connector; add conditional edge | LangGraph conditional edges |
| `lib/agent/nodes/account-connector.ts` | Split into model-only node (removes single-invoke pattern) | LangGraph model invocation |
| `lib/agent/nodes/orchestrator.ts` | Query `ConnectedAccount` before advancing past `connect_accounts`; skip if all desired platforms connected | Prisma `findMany` |
| `lib/agent/state.ts` | Add `oauthAuthUrl` and `oauthCallbackResult` state fields | LangGraph Annotation |
| `lib/agent/tools/social-tools.ts` | Add `userId`/`workspaceId` capture to `initiateOauthTool` return for frontend use | Existing tool schema |
| `app/(auth)/onboarding/page.tsx` | Add inline connect buttons with popup OAuth flow + `BroadcastChannel` bridge | `window.open`, `BroadcastChannel` |
| `app/api/onboarding/oauth/callback/route.ts` | Add `BroadcastChannel` postMessage to notify parent of success/failure | `window.postMessage` via redirect page |

---

## Step-by-Step Implementation

### Task 1: Add ReAct Loop to Account Connector Node

**File: `lib/agent/nodes/account-connector.ts`**

Replace the current single-invoke pattern with a model-only node that returns the AI message (with tool calls):

```typescript
// Rename to accountConnectorModel — removes the tool execution
export async function accountConnectorModel(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const response = await model.invoke([...]);
  return { messages: [response] };
}

// Keep accountConnectorTools (already exists) — the ToolNode from @langchain/langgraph/prebuilt
```

**File: `lib/agent/graph.ts`**

Split the single `accountConnector` node into two nodes + conditional routing:

```typescript
.addNode('accountConnectorModel', accountConnectorModel)
.addNode('accountConnectorTools', accountConnectorTools)

// Replace the single edge with conditional routing:
.addConditionalEdges('accountConnectorModel', routeAfterAccountConnector, {
  accountConnectorTools: 'accountConnectorTools',
  orchestrator: 'orchestrator',
})
.addEdge('accountConnectorTools', 'accountConnectorModel')
.addEdge('accountConnector', 'orchestrator')  // keep for backward compat if needed, or replace entirely
```

Add `routeAfterAccountConnector` function:
```typescript
function routeAfterAccountConnector(state: OnboardingStateType): string {
  const lastMsg = state.messages[state.messages.length - 1];
  // If the last message is an AIMessage with tool_calls, route to ToolNode
  // Otherwise, route back to orchestrator
  if (lastMsg?.tool_calls?.length > 0) return 'accountConnectorTools';
  return 'orchestrator';
}
```

Update `routeFromOrchestrator` to route `connect_accounts` → `accountConnectorModel` instead of `accountConnector`.

### Task 2: Make Orchestrator Aware of Connected Accounts

**File: `lib/agent/nodes/orchestrator.ts`**

Before advancing from `connect_accounts`, query the DB to check if accounts are already connected:

```typescript
if (currentStep === 'connect_accounts') {
  // Check if there are any connected accounts for this workspace
  const accounts = await prisma.connectedAccount.findMany({
    where: { workspaceId: state.workspaceId, status: 'connected' },
  });
  if (accounts.length > 0) {
    // Skip to next step — accounts already connected
    const nextStep = stepOrder[currentIndex + 1];
    return { currentStep: nextStep };
  }
}
```

### Task 3: Build OAuth Popup Bridge

**File: `app/(auth)/onboarding/page.tsx`**

Add a `BroadcastChannel` listener on mount that captures OAuth callback results from the popup:

```typescript
const oauthChannelRef = useRef<BroadcastChannel | null>(null);

useEffect(() => {
  oauthChannelRef.current = new BroadcastChannel('oauth-callback');
  oauthChannelRef.current.onmessage = (event) => {
    const { platform, success } = event.data;
    if (success) {
      // Inject a user-style message into the chat so the agent knows
      const autoMsg = `I've connected my ${platform} account.`;
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: autoMsg,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      sendToAgent(autoMsg, [...messages, userMessage]);
    }
  };
  return () => oauthChannelRef.current?.close();
}, [messages, sendToAgent]);
```

Add `handleConnectPlatform` function that opens OAuth popup:

```typescript
const handleConnectPlatform = async (platform: string) => {
  // Call the agent with a specific instruction to initiate OAuth
  // OR more directly: fetch auth URL from an API endpoint
  const response = await fetch('/api/onboarding/oauth/initiate', {
    method: 'POST',
    body: JSON.stringify({ platform, workspaceId: session?.user?.workspaceId }),
  });
  const { authUrl } = await response.json();
  
  const width = 600, height = 700;
  const left = screen.width / 2 - width / 2;
  const top = screen.height / 2 - height / 2;
  const popup = window.open(
    authUrl,
    `oauth-${platform}`,
    `width=${width},height=${height},left=${left},top=${top}`
  );
  
  // Poll for popup close
  const poll = setInterval(() => {
    if (popup?.closed) {
      clearInterval(poll);
    }
  }, 500);
};
```

**File: `app/api/onboarding/oauth/initiate/route.ts`** (new)

Direct endpoint for frontend to get OAuth URLs without going through the agent:

```typescript
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });
  
  const { platform } = await req.json();
  const userId = session.user.id;
  const workspaceId = session.user.workspaceId;
  
  // Reuse initiateOauthTool logic directly
  const result = await initiateOauthTool.invoke({ platform, userId, workspaceId });
  return NextResponse.json(JSON.parse(result));
}
```

**File: `app/api/onboarding/oauth/callback/route.ts`**

After the redirect to `/onboarding?oauth=success&platform=X`, the page already handles this via URL params. Add a `useEffect` that fires a `BroadcastChannel` message when `oauthStatus` is detected:

```typescript
useEffect(() => {
  if (oauthStatus && typeof window !== 'undefined') {
    const channel = new BroadcastChannel('oauth-callback');
    channel.postMessage({
      platform: oauthStatus.platform,
      success: oauthStatus.success,
    });
    channel.close();
  }
}, [oauthStatus]);
```

### Task 4: Inline Connect Buttons in Chat

**File: `lib/agent/nodes/account-connector.ts`**

Update `buildSystemPrompt` to instruct the LLM to emit OpenUI components for each platform:

```
When presenting a platform to connect, emit an OpenUI component of type 
'AccountConnectionCard' with props: { platform: 'instagram', status: 'disconnected', onConnect: 'connect:instagram' }.
The onConnect value should be 'connect:{platform_name}'.
```

**File: `app/(auth)/onboarding/page.tsx`**

Update `OpenUIRenderer` to wire the `onConnect` prop to the popup flow:

```typescript
function OpenUIRenderer({ component, onConnect }: { component: ...; onConnect: (platform: string) => void }) {
  if (component.type === 'AccountConnectionCard') {
    const props = component.props as { platform: string; status: string; onConnect?: string };
    const platformName = props.onConnect?.replace('connect:', '') ?? props.platform;
    return (
      <AccountConnectionCardComponent
        platform={props.platform}
        status={props.status as 'disconnected' | 'connecting' | 'connected' | 'error'}
        onConnect={() => onConnect(platformName)}
      />
    );
  }
  // ...
}
```

Update message rendering to pass `handleConnectPlatform` to `OpenUIRenderer`:

```typescript
{message.uiComponent && (
  <div className="mt-3">
    <OpenUIRenderer component={message.uiComponent} onConnect={handleConnectPlatform} />
  </div>
)}
```

**File: `lib/openui/library.tsx`**

Update `AccountConnectionCardComponent` to use the `Button` component from shadcn and call `onConnect` as a function (currently renders a raw `<button>` with no onClick handler):

```typescript
import { Button } from '@/components/ui/button';

export function AccountConnectionCardComponent(props: ...) {
  // ... statusColors ...
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <span className="font-medium capitalize">{props.platform}</span>
        <span className={`ml-2 text-xs ${statusColors[props.status]}`}>{props.status}</span>
      </div>
      {props.status === 'disconnected' && (
        <Button size="sm" onClick={() => props.onConnect && props.onConnect()}>
          Connect
        </Button>
      )}
    </div>
  );
}
```

Update the schema to accept a function-aware type — since OpenUI schemas use strings for actions, the `onConnect` field stays as `z.string()` in the schema but the component renderer converts it to a callback.

---

## Verification Steps

- [ ] `pnpm run typecheck` (0 errors)
- [ ] `pnpm run lint` (0 warnings)
- [ ] `pnpm run build` (success)
- [ ] Graph compiles without errors — `accountConnectorModel` and `accountConnectorTools` nodes registered
- [ ] ReAct loop works: LLM can call `initiate_oauth` → tool executes → result fed back → LLM responds
- [ ] Inline connect buttons render in chat and call `handleConnectPlatform` on click
- [ ] OAuth popup opens with correct URL for each platform
- [ ] After OAuth callback, `BroadcastChannel` message injects auto-message into chat
- [ ] Orchestrator skips `connect_accounts` when accounts already connected
- [ ] Goal selection "Connect accounts" flows through greeting normally

---

## Breaking Changes & Migrations

No breaking changes. This is additive — new nodes, new state fields, new API endpoint.

---

## Security Considerations

**OAuth State Parameter**: The state parameter already includes `userId`, `workspaceId`, and `codeVerifier` (for X). This prevents CSRF attacks. The popup pattern doesn't change this — the OAuth flow still goes through the server callback.

**BroadcastChannel**: Only same-origin tabs can listen to the channel, so cross-origin attacks are not possible. The channel only transmits `{ platform, success }` — no tokens or PII.

**Token Encryption**: Unchanged — still AES-256-CBC in `social-tools.ts`.

---

## Execution Order

1. **Task 1**: Split account connector into model + ToolNode, add conditional edges in graph
2. **Task 2**: Add connected-account check to orchestrator
3. **Task 3**: Create `/api/onboarding/oauth/initiate` endpoint + `BroadcastChannel` bridge in page
4. **Task 4**: Wire `AccountConnectionCard` onConnect to popup flow, update component

Each task depends on the previous for state/imports. Sequential subagent dispatch.