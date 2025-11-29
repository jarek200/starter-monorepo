# XState Machines

This directory contains XState state machines for the application.

## Auth Flow Machine

The `auth-flow.machine.ts` defines the authentication flow state machine used in E2E tests.

## Visualization

### VS Code Extension (Recommended)

Use the **Stately Visual Editor** extension:

1. Open `auth-flow.machine.ts`
2. Press `Cmd+Shift+P` → "Open Visual Editor"
3. Execute the machine by sending events in the visual editor

### Alternative: Online Visualizer

1. Go to https://stately.ai/viz
2. Copy the machine code from `auth-flow.machine.ts`
3. Paste into the visualizer and click "Simulate"

## Files

- `auth-flow.machine.ts` - Main authentication flow machine (XState v5)
