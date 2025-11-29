# XState Machines

This directory contains XState state machines for the application.

## Auth Flow Machine

The `auth-flow.machine.ts` defines the authentication flow state machine used in E2E tests.

## Visualization

### Official XState Inspector (Recommended)

Use the **official** `@statelyai/inspect` package for local visualization:

```bash
# Run the inspector example
pnpm inspect:xstate
```

This will:
1. Open a browser window with the XState Inspector
2. Show your state machine in real-time
3. Display state transitions as they happen

### Using in Your Code

```typescript
import { createActor } from 'xstate';
import { authFlowMachine, setupInspector } from '@sst-monorepo/core';

// Setup inspector (opens automatically)
const inspector = setupInspector();

// Create actor with inspector
const actor = createActor(authFlowMachine, {
  inspect: inspector.inspect,
});

actor.start();

// Send events and watch them in the inspector window
actor.send({ type: 'NAVIGATE_TO_LOGIN' });
```

### Alternative: Stately Visualizer (Online)

If you prefer the online visualizer:

1. Go to https://stately.ai/viz
2. Copy the machine code from `auth-flow.machine.ts`
3. Paste into the visualizer

## Files

- `auth-flow.machine.ts` - Main authentication flow machine
- `use-inspector.ts` - Inspector setup utility
- `inspect-example.ts` - Example usage of the inspector
