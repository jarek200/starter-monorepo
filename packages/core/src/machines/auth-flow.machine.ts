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
 * - unauthenticated: User is not logged in
 * - navigatingToLogin: Navigating to login page
 * - enteringCredentials: User is entering email/password
 * - submittingLogin: Login form submitted, waiting for response
 * - authenticated: User is logged in
 * - navigatingToDashboard: Redirecting to dashboard
 * - loggingOut: Logout in progress
 * - loggedOut: Successfully logged out
 */
export const authFlowMachine = setup({
  types: {
    context: {} as AuthFlowContext,
    events: {} as AuthFlowEvent,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEMCuAXAFgMQDYHsB3AOlQDs0swz0BLAY2XUgGIA5AQQDUBJAcQ4AVAKIB9QQHlRAGQl8ebANoAGALqJQAB3yxadfGQ0gAHogBMygIwAOYgFYAbGbvWz1gJwB2D64A0IAE9EOztPYjMAFncPCLtLByiQgF8k-0ocAhIKADdaKCZaMihBfGl8KEKWYTYRACVRAGFa4QARasEeDmkAZRV1JBBtXX1DAdMESLMAZmJ3OymbM29ra081-yCEeYj7aamI5TdLTzMHBxS0jAyiYmpmACdCqAb7yDvaZFxYFm6AVQAhACyPEEMjkCj6RiGeloBiM40iJ1mDhWdmU1imLkxEQ2iGslmIUWingiBwix2UygiFxA6TwN1gqAARgBbPR0IplCpkFiyeRsUR-BoNYTdXpqKE6GFwsbmMzuYjKJwRDEnMzOfZTXEIcnKYiWFULCJuRxrM40umZYiM1nsp5cyp8hSibAcHjSVqQgbQkbwuUKpWRVXqjURLWBYLk4hrKaxzzRWJU86pWlXekkdLvRjMCDsbj8IRiSSiFocboACX+Eg4tRaXq0Ut9sq2K3CygWp3i7lj1js2qm6tm7miGIWxzMx2Tlyw6eImZoDCYrAa0h4DQA0mC+BJfoJ64NG7DRqBxi5bBYOw4uz2+xGdWHo1EVma7FFPFPUzOrTk8gUiiUWmQWBMCZfBkHuXMVzXTc+R3PcJW9Q8ZRPRBLHRPVPDRSkJ0pV9+0HYcR1jSxx0nC00ytAgoG5KAJAwXk5DgwVfmFUVxX6BthiPP0EEsKZh0VSlDmsKkFn429NimQ5o08WN5WUd85hNcivxuKiaLo9AGO3XcXTdD06wQzjpWPExUPQ6MsMONDlDwu8LDMcIn2WUJ3FiVYVOuEh1MgTSWGabphHgjiDy45CzN42SZjmBZ31WKYEipfC7EJYcVmI0j3xSFMyHwCA4CMS0iElMLTPGABaBxtXKlLCLq+rhymTzZ3Iec6GzSASpMnibFJexvBsSw3BRfFtRCMISWHWzrCvbsspTIqsmQXJ8g5YpSnKQouqbFCJmmBxo3bSx3DQuYHCkzwxtCR8ppcWapnm6cvNuGgwEeIoXjeBdPngRDSp404IgOhxlDclwgciE6rsc+IHFCFVnFcc7mqtG02XQNaHVMn1uObY0rp2IaogUqxbJVTwUZuNrFxzbbcd28kwiJNKwxHVZtTDGYHsNUlrHJC9KaWla-3WwDgNA8CIDp8Lxl7HZMW7BwvAcTwSKifCZiJGI4dV87rEF4h1KeTTpbK1DAeIAd8SWVwPDh8NJOcIdhwOdsPAHSw7ANnyIBNv7uubeJ20tuw3JsNERuS52+fcJZ5jmMNsqSIA */
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
        SUBMIT_LOGIN: {
          target: 'submittingLogin',
        },
      },
    },
    submittingLogin: {
      on: {
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
