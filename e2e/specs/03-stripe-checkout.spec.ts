/**
 * Flow: Stripe checkout (test mode) → webhook → tier becomes Pro
 *
 * Requires:
 *   E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD — existing account (free tier)
 *   STRIPE_TEST_SECRET_KEY                       — sk_test_… key
 *   STRIPE_TEST_WEBHOOK_SECRET                   — whsec_… from `stripe listen`
 *   SUPABASE_TEST_URL / SUPABASE_TEST_SERVICE_ROLE_KEY
 *
 * Setup: start the app with `next start`, then run `stripe listen --forward-to
 * http://localhost:3000/api/stripe/webhook` before this test.
 *
 * The test fills in Stripe's hosted Checkout with the 4242 test card.
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loginAs, TEST_USER } from '../fixtures/auth'
import { hasAuthTestUserEnv } from '../fixtures/env'

test.describe('Stripe checkout → Pro tier', () => {
  test.skip(
    !process.env.STRIPE_TEST_SECRET_KEY || !hasAuthTestUserEnv(),
    'Skipped: STRIPE_TEST_SECRET_KEY, Supabase E2E credentials and seeded auth user required',
  )

  test('completes Stripe checkout and upgrades to Pro', async ({ page }) => {
    await loginAs(page)

    // Navigate to upgrade/billing page
    await page.goto('/upgrade')
    await expect(page.getByText(/pro|upgrade|billing/i)).toBeVisible()

    // Click the upgrade / subscribe button
    await page.getByRole('button', { name: /upgrade|subscribe|get pro/i }).click()

    // Wait for redirect to Stripe hosted Checkout
    await page.waitForURL(/stripe\.com\/pay/, { timeout: 15_000 })

    // Fill in the Stripe test card (4242 4242 4242 4242)
    const cardFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first()
    await cardFrame.getByPlaceholder(/card number/i).fill('4242424242424242')
    await cardFrame.getByPlaceholder(/mm \/ yy/i).fill('12/30')
    await cardFrame.getByPlaceholder(/cvc/i).fill('123')

    // Fill in billing details if required
    const emailField = page.getByLabel(/email/i)
    if (await emailField.isVisible()) await emailField.fill(TEST_USER.email)

    const nameField = page.getByLabel(/name on card|cardholder/i)
    if (await nameField.isVisible()) await nameField.fill('E2E Test User')

    // Submit the payment
    await page.getByRole('button', { name: /pay|subscribe|confirm/i }).click()

    // Stripe redirects back after payment
    await page.waitForURL(/clerkfolio|localhost/, { timeout: 30_000 })

    // Allow webhook processing time
    await page.waitForTimeout(3_000)

    // Verify tier in the database
    const supabase = createClient(
      process.env.SUPABASE_TEST_URL!,
      process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!,
    )
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('email', TEST_USER.email)    // works only if email is on the profiles table
      .single()

    expect(profile?.tier).toBe('pro')
  })
})
