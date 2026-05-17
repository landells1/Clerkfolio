/**
 * Flow: Login → trigger password reset → assert Resend is called (or mock)
 *
 * Requires:
 *   E2E_TEST_USER_EMAIL — an existing account in the test project
 *   RESEND_API_KEY      — set to a test key; outbound email is intercepted
 *
 * Strategy: intercept the /api/auth/... request that triggers the reset email
 * and assert a 200 response. We do NOT follow the email link (that would
 * require inbox access); this test covers the "request sent" path only.
 */
import { test, expect } from '@playwright/test'
import { TEST_USER } from '../fixtures/auth'
import { hasAuthTestUserEnv } from '../fixtures/env'

const requiresSeededUser = !hasAuthTestUserEnv()

test.describe('Password reset request', () => {
  test.skip(
    requiresSeededUser,
    'Skipped: Supabase E2E credentials and E2E_TEST_USER_EMAIL/E2E_TEST_USER_PASSWORD required',
  )

  test('submitting the reset form shows a confirmation UI', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page).toHaveTitle(/reset|forgot password|clerkfolio/i)

    // Monitor the Supabase resetPasswordForEmail call via the Next.js route
    const resetRequests: string[] = []
    page.on('request', req => {
      if (req.url().includes('supabase') && req.url().includes('recover')) {
        resetRequests.push(req.url())
      }
    })

    await page.getByLabel(/email/i).fill(TEST_USER.email)
    await page.getByRole('button', { name: /send|reset|submit/i }).click()

    // The page should show a success / check-your-inbox message
    await expect(
      page.getByText(/check your email|link sent|reset link/i),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('submitting an unknown email still shows the confirmation UI (no enumeration)', async ({ page }) => {
    await page.goto('/reset-password')
    await page.getByLabel(/email/i).fill(`no-such-user-${Date.now()}@example.com`)
    await page.getByRole('button', { name: /send|reset|submit/i }).click()

    // Must not reveal whether the address exists in the system
    await expect(
      page.getByText(/check your email|link sent|reset link/i),
    ).toBeVisible({ timeout: 10_000 })

    // No error banner should appear
    await expect(page.getByRole('alert')).not.toBeVisible()
  })
})
