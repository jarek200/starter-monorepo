# E2E Tests with XState

This directory contains end-to-end tests that use XState to model application state flows.

## Authentication Flow Test

The `auth-flow-xstate.spec.ts` test demonstrates:
- Using XState to model authentication state transitions
- Playwright to interact with the browser
- Complete login → dashboard → logout flow

## Running the Tests

### Prerequisites

1. Make sure your dev server is running on `http://localhost:3000`:
   ```bash
   pnpm web:dev
   ```

2. Set test credentials (optional, defaults provided):
   ```bash
   export TEST_EMAIL=your@email.com
   export TEST_PASSWORD=YourPassword123!
   ```

### Run Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run only the XState auth flow test
pnpm test:e2e auth-flow-xstate

# Run with UI mode (interactive)
pnpm test:e2e:ui
```

## XState Machine

The `authFlowMachine` models these states:
- `unauthenticated` → User not logged in
- `navigatingToLogin` → Navigating to login page
- `enteringCredentials` → Filling in login form
- `submittingLogin` → Login request in progress
- `authenticated` → User logged in
- `navigatingToDashboard` → Redirecting to dashboard
- `loggingOut` → Logout in progress
- `loggedOut` → Successfully logged out

## Test Flow

1. Start in `unauthenticated` state
2. Navigate to `/login`
3. Enter email and password
4. Submit login form
5. Verify redirect to `/dashboard`
6. Click logout button
7. Verify redirect back to `/login`
8. End in `loggedOut` state

## Customization

To test with different credentials, set environment variables:
```bash
TEST_EMAIL=test@example.com TEST_PASSWORD=Password123! pnpm test:e2e
```

Or update the defaults in `auth-flow-xstate.spec.ts`.




