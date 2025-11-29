/**
 * XState Machine: Authentication Flow
 *
 * Models the user authentication flow for E2E testing
 *
 * @xstate - This comment helps VS Code extension detect the machine
 */

import { setup } from 'xstate';

export interface AuthFlowContext {
  email: string;
  password: string;
  currentUrl: string;
  isAuthenticated: boolean;
}

export type AuthFlowEvent =
  | { type: 'NAVIGATE_TO_LOGIN' }
  | { type: 'RETURN_TO_LANDING' }
  | { type: 'ENTER_CREDENTIALS'; email: string; password: string }
  | { type: 'SUBMIT_LOGIN' }
  | { type: 'LOGIN_SUCCESS' }
  | { type: 'LOGIN_FAILED'; error: string }
  | { type: 'NAVIGATE_TO_DASHBOARD' }
  | { type: 'CLICK_LOGOUT' }
  | { type: 'LOGOUT_SUCCESS' }
  | { type: 'LOGOUT_FAILED'; error: string }
  | { type: 'RESET' };

/**
 * Auth Flow State Machine
 *
 * States:
 * - unauthenticated: User is not logged in (landing page)
 * - navigatingToLogin: Navigating to login page
 * - enteringCredentials: User is entering email/password
 * - submittingLogin: Login form submitted, waiting for response
 * - authenticated: User is logged in
 * - navigatingToDashboard: Redirecting to dashboard
 * - loggingOut: Logout in progress
 * - loggedOut: Successfully logged out
 *
 * Events:
 * - NAVIGATE_TO_LOGIN: Navigate from landing to login page
 * - RETURN_TO_LANDING: Return from login page back to landing page
 * - ENTER_CREDENTIALS: User enters email and password
 * - SUBMIT_LOGIN: Submit login form
 * - LOGIN_SUCCESS: Login succeeded
 * - LOGIN_FAILED: Login failed with error
 * - NAVIGATE_TO_DASHBOARD: Navigate to dashboard after login
 * - CLICK_LOGOUT: User clicks logout button
 * - LOGOUT_SUCCESS: Logout succeeded
 * - LOGOUT_FAILED: Logout failed
 * - RESET: Reset machine to initial state
 */
export const authFlowMachine = setup({
  types: {
    context: {} as AuthFlowContext,
    events: {} as AuthFlowEvent,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEMCuAXAFgMQDYHsB3AOlQDs0swz0BLAY2XUgGIA5AQQDUBJAcQ4AVAKIB9QQHlRAGQl8ebANoAGALqJQAB3yxadfGQ0gAHogBMygIwAOYgFYAbGbuWAnGdfW7d1wBYANCAAnojeAOzEzsrKHr5mAMwxvgC+yYGUOAQkFAButFBMtGRQgvjS+FBFLMJsIgBKogDCdcIAIjWCPBzSAMoq6kgg2rr6hoOmCGZx8cSudoleYXbKDsoBwaHxvvYJvomuMdbWlg6p6RiZRMTUzABORVCNt5A3tMi4sCw9AKoAQgCyPEEMjkCn6RmGeloBiMEymYTMswc1jCyjC7jsYV8WMCIQQx3s0WUWzm0TsZmRZxAGTwV1gqAARgBbPR0YrlSpkFiyeRsUQ-RqNYQ9PpqCE6KEw8bmDzEFZRMJhZHeVzxBy4xC+SzKYiWXzWeKeZwOMLxSxTKk0rLEenM1kPDlVHkKUTYDg8aRtcGDSGjWEy1xypzLRXKnxqjUIOxa4iK+LRg0+RzWU5pakXWkkDKvRjMCDsbj8IRiSSiVocHoACV+Eg4dVa3q0Er90qjR0ixOUB0W8WO8Uj8TMiNcI6NYS8Dkn8UtGet2ZoDCYrEa0h4jQA0iC+BJvoJG0Nm9CxqAJnZ2xZ9soe33I749rHllY0cir1ewjOsJniLl8oViqVWmQWBMAZfBkFufMVzXTceR3PcxR9Q8pRPRBtWsHUsRHSxDTVVwlnVDYEEHYdR2sMxx0cKcP0uEgCCgTkoAkDBuTkOD+W+QVhVFAYmxGI9-QQbCRzlIltScBxVQRAcYljU1fHcQ1sUNOxqK-OiGKY9AWO3XdXXdT0GwQ3jJWPExUNfWN5NcITcPwyMLERKYRwTYlnEsLFVOtdTIE0lgWh6YR4J4g8+OQszBNNGY5g8eNcJWawB2cYgrLHCcqKpMh8AgOAjCtIhxVC0yJgAWgIvFirsWYRynLx3J8SwThUtM8pIch5zoXNIAKkyBJsO97HHK8EjWMJtX7QjwgfaJYmGi1mtnK4fwKNkSjKCoim6lsUMmBIHFjYk9WJeJUTsibMSmmI-FmlJ5s-a0bjAe5iieF4F3eeBEMKgSKV8PbVlVEcr3Q1VI28RETknFMlSHNxLE8ulGRZdAVsdUzfX41s4lB6NdTclM5jNBqbvOO6rnaxc802jHtq1CJH2icSU1h8a8T2GZjqsk0lRRNV4eyZA8mWh4AKAkCwIgqmwomLxtnjVVvCvM93LMRKZhSsiKMnBxp1umjiHUh5NMlorUJ+4hB2Oc1yS2BrEsq0dUso7W+f1ioYAgI3Pp61sTmJc3w1+o4lWiu2qpHDW0ud1JkiAA */
  id: 'authFlow',
  initial: 'unauthenticated',
  context: {
    email: '',
    password: '',
    currentUrl: '',
    isAuthenticated: false,
  },
  states: {
    unauthenticated: {
      on: {
        NAVIGATE_TO_LOGIN: {
          target: 'navigatingToLogin',
        },
      },
    },
    navigatingToLogin: {
      on: {
        RETURN_TO_LANDING: {
          target: 'unauthenticated',
          actions: ({ context }) => {
            context.currentUrl = '/';
            context.email = '';
            context.password = '';
          },
        },
        ENTER_CREDENTIALS: {
          target: 'enteringCredentials',
          actions: ({ event, context }) => {
            context.email = event.email;
            context.password = event.password;
          },
        },
      },
    },
    enteringCredentials: {
      on: {
        RETURN_TO_LANDING: {
          target: 'unauthenticated',
          actions: ({ context }) => {
            context.currentUrl = '/';
            context.email = '';
            context.password = '';
          },
        },
        SUBMIT_LOGIN: {
          target: 'submittingLogin',
        },
      },
    },
    submittingLogin: {
      on: {
        RETURN_TO_LANDING: {
          target: 'unauthenticated',
          actions: ({ context }) => {
            context.currentUrl = '/';
            context.email = '';
            context.password = '';
            context.isAuthenticated = false;
          },
        },
        LOGIN_SUCCESS: {
          target: 'authenticated',
          actions: ({ context }) => {
            context.isAuthenticated = true;
          },
        },
        LOGIN_FAILED: {
          target: 'unauthenticated',
          actions: ({ context }) => {
            context.isAuthenticated = false;
            context.email = '';
            context.password = '';
          },
        },
      },
    },
    authenticated: {
      on: {
        NAVIGATE_TO_DASHBOARD: {
          target: 'navigatingToDashboard',
        },
        CLICK_LOGOUT: {
          target: 'loggingOut',
        },
      },
    },
    navigatingToDashboard: {
      on: {
        CLICK_LOGOUT: {
          target: 'loggingOut',
        },
      },
    },
    loggingOut: {
      on: {
        LOGOUT_SUCCESS: {
          target: 'loggedOut',
          actions: ({ context }) => {
            context.isAuthenticated = false;
            context.email = '';
            context.password = '';
            context.currentUrl = '';
          },
        },
        LOGOUT_FAILED: {
          target: 'authenticated',
        },
      },
    },
    loggedOut: {
      on: {
        RESET: {
          target: 'unauthenticated',
        },
      },
    },
  },
});

export type AuthFlowMachine = typeof authFlowMachine;
