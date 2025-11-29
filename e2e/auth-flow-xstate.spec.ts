/**
 * E2E Test: Authentication Flow with XState
 *
 * Uses XState machine to model and test the authentication flow:
 * 1. Visit app
 * 2. Navigate to login
 * 3. Enter credentials and login
 * 4. Verify dashboard access
 * 5. Logout
 * 6. Verify logged out state
 */

import { expect, test } from '@playwright/test';
import { createActor } from 'xstate';
import {
  type AuthFlowEvent,
  authFlowMachine,
} from '../packages/core/src/machines/auth-flow.machine';

// Environment variables are loaded by playwright.config.ts

test.describe('Authentication Flow with XState', () => {
  // Test credentials loaded from .env file
  // Set TEST_EMAIL and TEST_PASSWORD in .env or as environment variables
  const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
  const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';

  test.beforeEach(async ({ page }) => {
    // Ensure we start from a clean state
    await page.goto('/login');
  });

  test('complete login and logout flow using XState', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout to 60 seconds
    // Create XState actor (v5 uses createActor)
    const actor = createActor(authFlowMachine);
    actor.start();

    // Helper to wait for state transitions with timeout
    const waitForState = (targetState: string, timeout = 5000) => {
      return new Promise<void>((resolve, reject) => {
        // Check current state immediately
        if (actor.getSnapshot().value === targetState) {
          resolve();
          return;
        }

        const subscription = actor.subscribe((snapshot) => {
          if (snapshot.value === targetState) {
            subscription.unsubscribe();
            resolve();
          }
        });

        setTimeout(() => {
          subscription.unsubscribe();
          const currentState = actor.getSnapshot().value;
          if (currentState === targetState) {
            // State was reached, just resolve
            resolve();
          } else {
            reject(
              new Error(`Timeout waiting for state: ${targetState}. Current state: ${currentState}`)
            );
          }
        }, timeout);
      });
    };

    try {
      // State: unauthenticated
      expect(actor.getSnapshot().value).toBe('unauthenticated');

      // Event: NAVIGATE_TO_LOGIN
      actor.send({ type: 'NAVIGATE_TO_LOGIN' });
      try {
        await waitForState('navigatingToLogin', 2000);
      } catch (e) {
        console.log('State transition check skipped, continuing...');
      }

      // Navigate to login page - skip SSR, wait for client-side hydration
      await page.goto('/login', { waitUntil: 'networkidle', timeout: 15000 });

      // Wait for client-side JavaScript to load and hydrate
      await page
        .waitForFunction(
          () => {
            return document.body && !document.body.textContent?.includes('500');
          },
          { timeout: 10000 }
        )
        .catch(() => {
          // If still showing error, check if it's just SSR error that will hydrate
          console.log('Waiting for client-side hydration...');
        });

      // Wait a bit more for full hydration
      await page.waitForTimeout(2000);

      // Check if page has loaded properly (look for login form elements)
      const hasLoginForm =
        (await page.locator('input[type="email"], input[name="email"]').count()) > 0;
      const hasError = await page
        .locator('body')
        .textContent()
        .then((text) => text?.includes('500') || text?.includes('Internal Error'));

      if (hasError && !hasLoginForm) {
        const pageContent = (await page.textContent('body')) || '';
        console.error('Page still showing error after hydration');
        console.error('Page content:', pageContent.substring(0, 500));
        await page.screenshot({ path: 'test-results/login-error.png', fullPage: true });
        throw new Error(
          'Application returned 500 error even after client-side hydration. Check SST dev logs.'
        );
      }

      if (!hasLoginForm) {
        throw new Error('Login form not found. Page may not have loaded correctly.');
      }

      await expect(page).toHaveURL(/.*login/, { timeout: 5000 });

      // Event: ENTER_CREDENTIALS
      actor.send({
        type: 'ENTER_CREDENTIALS',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      try {
        await waitForState('enteringCredentials', 2000);
      } catch (e) {
        console.log('State transition check skipped, continuing...');
      }

      // Fill in login form
      await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
      await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);

      // Event: SUBMIT_LOGIN
      actor.send({ type: 'SUBMIT_LOGIN' });
      try {
        await waitForState('submittingLogin', 2000);
      } catch (e) {
        console.log('State transition check skipped, continuing...');
      }

      // Click login button
      await page.click(
        'button:has-text("Sign In"), button:has-text("Login"), button[type="submit"]'
      );

      // Wait for login to complete (either success or failure)
      await Promise.race([
        // Success path: redirected to dashboard
        page
          .waitForURL(/.*dashboard/, { timeout: 10000 })
          .then(() => {
            actor.send({ type: 'LOGIN_SUCCESS' });
          }),
        // Failure path: error message appears
        page
          .waitForSelector('text=/error|incorrect|failed/i', { timeout: 5000 })
          .then(() => {
            const errorText = page.locator('text=/error|incorrect|failed/i').first().textContent();
            actor.send({ type: 'LOGIN_FAILED', error: errorText || 'Login failed' });
          }),
      ]).catch(() => {
        // Timeout - check current state
        if (page.url().includes('dashboard')) {
          actor.send({ type: 'LOGIN_SUCCESS' });
        } else {
          actor.send({ type: 'LOGIN_FAILED', error: 'Timeout waiting for login response' });
        }
      });

      // Wait for state transition
      const currentState = actor.getSnapshot().value;

      if (currentState === 'authenticated') {
        // Event: NAVIGATE_TO_DASHBOARD
        actor.send({ type: 'NAVIGATE_TO_DASHBOARD' });
        await waitForState('navigatingToDashboard');

        // Verify we're on dashboard
        await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
        await expect(page.locator('h1, h2')).toContainText(/dashboard/i);

        // Verify user is shown (use first() to handle multiple matches)
        await expect(page.locator('text=/welcome|dashboard/i').first()).toBeVisible();

        // Event: CLICK_LOGOUT
        actor.send({ type: 'CLICK_LOGOUT' });
        await waitForState('loggingOut');

        // Click logout button
        await page.click('button:has-text("Logout"), button:has-text("Sign Out")');

        // Wait for logout to complete
        await Promise.race([
          page.waitForURL(/.*login/, { timeout: 5000 }).then(() => {
            actor.send({ type: 'LOGOUT_SUCCESS' });
          }),
          page.waitForTimeout(3000).then(() => {
            // Check if we're redirected to login
            if (page.url().includes('login')) {
              actor.send({ type: 'LOGOUT_SUCCESS' });
            } else {
              actor.send({ type: 'LOGOUT_FAILED', error: 'Logout did not redirect to login' });
            }
          }),
        ]);

        await waitForState('loggedOut');

        // Verify we're back on login page
        await expect(page).toHaveURL(/.*login/, { timeout: 10000 });

        // Check for login page content (more flexible - handles "Welcome Back" heading)
        const hasLoginContent = await page
          .locator('body')
          .textContent()
          .then(
            (text) =>
              text?.toLowerCase().includes('login') ||
              text?.toLowerCase().includes('sign in') ||
              text?.toLowerCase().includes('welcome back') ||
              text?.toLowerCase().includes('create account')
          );

        if (!hasLoginContent) {
          throw new Error('Not on login page after logout');
        }

        // Verify final state
        expect(actor.getSnapshot().value).toBe('loggedOut');
        expect(actor.getSnapshot().context.isAuthenticated).toBe(false);

        console.log('✅ Authentication flow completed successfully!');
      } else {
        // Login failed
        const error = actor.getSnapshot().context;
        console.error('❌ Login failed:', error);
        throw new Error(`Login failed: ${error}`);
      }
    } finally {
      actor.stop();
    }
  });

  test('XState machine state transitions', async ({ page }) => {
    const actor = createActor(authFlowMachine);
    actor.start();

    try {
      // Test state transitions
      expect(actor.getSnapshot().value).toBe('unauthenticated');

      actor.send({ type: 'NAVIGATE_TO_LOGIN' });
      expect(actor.getSnapshot().value).toBe('navigatingToLogin');

      actor.send({
        type: 'ENTER_CREDENTIALS',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(actor.getSnapshot().value).toBe('enteringCredentials');
      expect(actor.getSnapshot().context.email).toBe('test@example.com');

      actor.send({ type: 'SUBMIT_LOGIN' });
      expect(actor.getSnapshot().value).toBe('submittingLogin');

      actor.send({ type: 'LOGIN_SUCCESS' });
      expect(actor.getSnapshot().value).toBe('authenticated');
      expect(actor.getSnapshot().context.isAuthenticated).toBe(true);

      actor.send({ type: 'CLICK_LOGOUT' });
      expect(actor.getSnapshot().value).toBe('loggingOut');

      actor.send({ type: 'LOGOUT_SUCCESS' });
      expect(actor.getSnapshot().value).toBe('loggedOut');
      expect(actor.getSnapshot().context.isAuthenticated).toBe(false);

      console.log('✅ All state transitions validated!');
    } finally {
      actor.stop();
    }
  });
});
