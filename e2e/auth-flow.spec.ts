/**
 * Example: E2E Testing Auth Flow with Playwright
 *
 * This demonstrates testing state-driven user flows end-to-end.
 * XState makes these flows predictable and testable.
 */

import { expect, test } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from login page (unauthenticated state)
    await page.goto('/login');
  });

  test('should complete login flow', async ({ page }) => {
    // State: unauthenticated
    await expect(page.locator('h1, h2')).toContainText(/login|sign in/i);

    // Transition: LOGIN event
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button:has-text("Sign In"), button:has-text("Login")');

    // State: authenticating (loading state)
    await expect(page.locator('text=loading, text=signing'))
      .toBeVisible({ timeout: 2000 })
      .catch(() => {
        // Loading might be too fast, continue
      });

    // Final state: authenticated (redirected to dashboard)
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 5000 });
    await expect(page.locator('h1, h2')).toContainText(/dashboard/i);
  });

  test('should complete signup → verification → dashboard flow', async ({ page }) => {
    // State: unauthenticated
    await expect(page.locator('h1, h2')).toContainText(/login|sign in/i);

    // Transition: Switch to signup
    await page.click('button:has-text("Sign Up"), a:has-text("Sign Up")');

    // State: signingUp
    await page.fill('input[type="email"], input[name="email"]', 'newuser@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    await page.click('button:has-text("Sign Up"), button[type="submit"]');

    // State: verifying (waiting for verification code)
    await expect(page.locator('text=verification, text=code, input[name="code"]')).toBeVisible({
      timeout: 5000,
    });

    // Transition: VERIFY_EMAIL event
    await page.fill('input[name="code"], input[type="text"]', '123456');
    await page.click('button:has-text("Verify"), button[type="submit"]');

    // Final state: authenticated
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('should handle login error state', async ({ page }) => {
    // State: unauthenticated
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In"), button:has-text("Login")');

    // State: error
    await expect(page.locator('text=error, text=invalid, text=incorrect')).toBeVisible({
      timeout: 5000,
    });

    // Should remain in unauthenticated state (can retry)
    await expect(page).toHaveURL(/.*login/);
  });

  test('should handle logout flow', async ({ page }) => {
    // First authenticate
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In"), button:has-text("Login")');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 5000 });

    // State: authenticated
    // Transition: LOGOUT event
    await page.click('button:has-text("Logout"), button:has-text("Sign Out")');

    // Final state: unauthenticated (redirected to login)
    await expect(page).toHaveURL(/.*login/, { timeout: 5000 });
  });
});
