/**
 * Example: XState Auth Machine
 *
 * This demonstrates how to model authentication flow as a state machine.
 * Use this pattern when your auth flow becomes complex (signup → verification → onboarding).
 */

import { setup } from 'xstate';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    username: string;
  } | null;
  error: string | null;
}

export type AuthEvent =
  | { type: 'CHECK_AUTH' }
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'SIGNUP'; email: string; password: string }
  | { type: 'VERIFY_EMAIL'; code: string }
  | { type: 'LOGOUT' }
  | { type: 'AUTH_SUCCESS'; user: AuthContext['user'] }
  | { type: 'AUTH_ERROR'; error: string }
  | { type: 'VERIFICATION_REQUIRED' }
  | { type: 'VERIFICATION_SUCCESS' };

/**
 * Auth state machine
 *
 * States:
 * - checking: Initial state, checking if user is authenticated
 * - unauthenticated: User is not logged in
 * - authenticated: User is logged in
 * - verifying: Waiting for email verification code
 * - error: Authentication error occurred
 */
export const authMachine = setup({
  types: {
    context: {} as AuthContext,
    events: {} as AuthEvent,
  },
  guards: {
    hasUser: ({ context }) => context.user !== null,
  },
  actors: {
    checkAuth: async () => {
      // Simulate checking auth
      // In real app, this would call AWS Amplify
      return { user: null };
    },
    login: async ({ input }: { input: { email: string; password: string } }) => {
      // Simulate login
      // In real app, this would call AWS Amplify signIn
      if (input.email === 'test@example.com') {
        return { user: { id: '1', email: input.email, username: 'test' } };
      }
      throw new Error('Invalid credentials');
    },
    signup: async ({ input }: { input: { email: string; password: string } }) => {
      // Simulate signup
      // In real app, this would call AWS Amplify signUp
      return { requiresVerification: true };
    },
    verifyEmail: async ({ input }: { input: { code: string } }) => {
      // Simulate verification
      // In real app, this would call AWS Amplify confirmSignUp
      if (input.code === '123456') {
        return { user: { id: '1', email: 'test@example.com', username: 'test' } };
      }
      throw new Error('Invalid verification code');
    },
  },
}).createMachine({
  id: 'auth',
  initial: 'checking',
  context: {
    user: null,
    error: null,
  },
  states: {
    checking: {
      invoke: {
        id: 'checkAuth',
        src: 'checkAuth',
        onDone: [
          {
            guard: 'hasUser',
            target: 'authenticated',
            actions: ({ event }) => {
              // Set user from event output
            },
          },
          {
            target: 'unauthenticated',
          },
        ],
        onError: {
          target: 'unauthenticated',
        },
      },
    },
    unauthenticated: {
      on: {
        LOGIN: {
          target: 'authenticating',
        },
        SIGNUP: {
          target: 'signingUp',
        },
      },
    },
    authenticating: {
      invoke: {
        id: 'login',
        src: 'login',
        input: ({ event }) => ({
          email: event.email,
          password: event.password,
        }),
        onDone: {
          target: 'authenticated',
          actions: ({ event, context }) => {
            context.user = event.output.user;
          },
        },
        onError: {
          target: 'error',
          actions: ({ event, context }) => {
            context.error = event.error.message;
          },
        },
      },
    },
    signingUp: {
      invoke: {
        id: 'signup',
        src: 'signup',
        input: ({ event }) => ({
          email: event.email,
          password: event.password,
        }),
        onDone: {
          target: 'verifying',
        },
        onError: {
          target: 'error',
          actions: ({ event, context }) => {
            context.error = event.error.message;
          },
        },
      },
    },
    verifying: {
      on: {
        VERIFY_EMAIL: {
          target: 'verifyingEmail',
        },
      },
    },
    verifyingEmail: {
      invoke: {
        id: 'verifyEmail',
        src: 'verifyEmail',
        input: ({ event }) => ({
          code: event.code,
        }),
        onDone: {
          target: 'authenticated',
          actions: ({ event, context }) => {
            context.user = event.output.user;
          },
        },
        onError: {
          target: 'error',
          actions: ({ event, context }) => {
            context.error = event.error.message;
          },
        },
      },
    },
    authenticated: {
      on: {
        LOGOUT: {
          target: 'unauthenticated',
          actions: ({ context }) => {
            context.user = null;
          },
        },
      },
    },
    error: {
      on: {
        LOGIN: {
          target: 'authenticating',
        },
        SIGNUP: {
          target: 'signingUp',
        },
      },
    },
  },
});

/**
 * Type helper for auth machine
 */
export type AuthMachine = typeof authMachine;
