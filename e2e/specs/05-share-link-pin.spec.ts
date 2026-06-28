/**
 * Flow: Share link with PIN — create, access with correct PIN (200),
 *       wrong PIN triggers lockout after N attempts
 *
 * Requires:
 *   E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD — existing account
 *   SUPABASE_TEST_URL / SUPABASE_TEST_SERVICE_ROLE_KEY
 *
 * The lockout threshold (N) is whatever the app enforces; this test drives
 * 5 wrong PINs which should be sufficient to trigger any reasonable lockout.
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loginAs } from '../fixtures/auth'
import { hasAuthTestUserEnv } from '../fixtures/env'

const CORRECT_PIN = '5678'
const WRONG_PIN = '0000'

test.describe('Share link with PIN', () => {
  test.skip(
    !hasAuthTestUserEnv(),
    'Skipped: Supabase E2E credentials and seeded auth user required',
  )

  let shareToken: string

  test.beforeEach(async ({ page }) => {
    await loginAs(page)

    // Create a new PIN-protected share link via the UI (the canonical share
    // surface is now Import & export -> Share; F-027 retired /settings/shared-links).
    await page.goto('/export?tab=share')
    await page.getByRole('button', { name: /create|new link|add link/i }).click()

    // Enable PIN protection
    const pinToggle = page.getByLabel(/pin|protect with pin/i)
    if (await pinToggle.isVisible()) await pinToggle.check()

    // Fill in the PIN
    const pinInput = page.getByLabel(/enter pin|pin code/i)
    if (await pinInput.isVisible()) await pinInput.fill(CORRECT_PIN)

    await page.getByRole('button', { name: /save|create|generate/i }).click()

    // Grab the generated share link token from the page
    const linkEl = page.getByRole('link', { name: /\/share\//i }).first()
    const href = await linkEl.getAttribute('href') ?? ''
    const tokenMatch = href.match(/\/share\/([^/?]+)/)
    shareToken = tokenMatch?.[1] ?? ''
    expect(shareToken, 'Share token must be extracted from the created link').toBeTruthy()
  })

  test('correct PIN grants access to the shared portfolio', async ({ page }) => {
    // Visit the share link as an unauthenticated visitor
    await page.context().clearCookies()
    await page.goto(`/share/${shareToken}`)

    // Enter the PIN
    await expect(page.getByLabel(/pin/i)).toBeVisible()
    await page.getByLabel(/pin/i).fill(CORRECT_PIN)
    await page.getByRole('button', { name: /access|submit|view/i }).click()

    // Should now show the portfolio content
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByText(/portfolio|entries/i)).toBeVisible()
  })

  test('wrong PIN returns an error, not portfolio content', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(`/share/${shareToken}`)

    await page.getByLabel(/pin/i).fill(WRONG_PIN)
    await page.getByRole('button', { name: /access|submit|view/i }).click()

    await expect(page.getByText(/incorrect|invalid|wrong pin|try again/i)).toBeVisible()
    // Portfolio content must NOT appear
    await expect(page.getByRole('heading', { name: /portfolio/i })).not.toBeVisible()
  })

  test('too many wrong PINs triggers lockout', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(`/share/${shareToken}`)

    // Submit 5 wrong PINs — enough to exceed any reasonable threshold
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.getByLabel(/pin/i).fill(WRONG_PIN)
      await page.getByRole('button', { name: /access|submit|view/i }).click()
      // Wait for the response
      await page.waitForTimeout(300)
    }

    // Either the link is locked (rate-limit page) or we're still on the PIN form
    // but the error text should indicate lockout / too many attempts
    const bodyText = await page.locator('body').innerText()
    const isLocked =
      /locked|too many|rate.?limit|blocked|try again later/i.test(bodyText)

    expect(isLocked, 'Expected lockout message after 5 wrong PIN attempts').toBe(true)
  })
})
