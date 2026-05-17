/**
 * Flow: Signup → onboarding wizard → create first portfolio entry → logout
 *
 * Requires:
 *   SUPABASE_TEST_URL, SUPABASE_TEST_SERVICE_ROLE_KEY  — test project credentials
 *   E2E_BASE_URL (default http://localhost:3000)
 *
 * The test creates a brand-new account using a timestamped address so it can
 * run repeatably without pre-seeded fixtures. Global setup truncates the profiles
 * table so this user disappears on the next run.
 */
import { test, expect } from '@playwright/test'
import { hasSupabaseTestEnv } from '../fixtures/env'

const TIMESTAMP = Date.now()
const NEW_USER_EMAIL = `e2e+signup-${TIMESTAMP}@clerkfolio-test.co.uk`
const NEW_USER_PASSWORD = 'E2eSignup@99!'
const requiresSupabase = !hasSupabaseTestEnv()

test.describe('Signup → onboarding → first portfolio entry → logout', () => {
  test.skip(
    requiresSupabase,
    'Skipped: SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY and SUPABASE_TEST_SERVICE_ROLE_KEY required',
  )

  test('completes the full new-user flow', async ({ page }) => {
    // ── 1. Navigate to signup ────────────────────────────────────────────────
    await page.goto('/signup')
    await expect(page).toHaveTitle(/sign up|create account|clerkfolio/i)

    await page.getByLabel(/email/i).fill(NEW_USER_EMAIL)
    await page.getByLabel(/password/i).first().fill(NEW_USER_PASSWORD)

    // Confirm password field if present
    const confirmField = page.getByLabel(/confirm password/i)
    if (await confirmField.isVisible()) {
      await confirmField.fill(NEW_USER_PASSWORD)
    }

    await page.getByRole('button', { name: /sign up|create account|get started/i }).click()

    // Expect either email-confirmation holding page or onboarding redirect
    await page.waitForURL(/\/(onboarding|check-email|signup-confirm)/, { timeout: 10_000 })

    // ── 2. Onboarding wizard ─────────────────────────────────────────────────
    // Skip email-confirmation in test mode if redirected to a holding page
    const isOnOnboarding = page.url().includes('/onboarding')
    if (!isOnOnboarding) {
      // In the test environment Supabase auto-confirms emails; if we're stuck on a
      // holding page, fail with a clear message rather than timing out.
      await expect(page, 'Expected auto-confirm to redirect to /onboarding').toHaveURL(/\/onboarding/)
    }

    // Select a career stage
    const careerStageSelect = page.getByRole('combobox', { name: /career stage/i })
    if (await careerStageSelect.isVisible()) {
      await careerStageSelect.selectOption({ index: 1 })
    }

    // Advance through wizard steps (each step has a Next/Continue button)
    for (let step = 0; step < 5; step++) {
      const nextBtn = page.getByRole('button', { name: /next|continue|finish|complete/i })
      if (!(await nextBtn.isVisible({ timeout: 1_000 }).catch(() => false))) break
      await nextBtn.click()
    }

    // Wizard completion should redirect to /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.getByRole('main')).toBeVisible()

    // ── 3. Create first portfolio entry ─────────────────────────────────────
    await page.goto('/portfolio')
    const addBtn = page.getByRole('link', { name: /add|new entry|create/i }).first()
    await addBtn.click()
    await page.waitForURL(/\/portfolio\/create/)

    // Fill in the minimum required fields
    const titleInput = page.getByLabel(/title/i)
    await titleInput.fill('E2E test audit')

    const dateInput = page.getByLabel(/date/i).first()
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-04-01')
    }

    // Submit the form
    await page.getByRole('button', { name: /save|submit|create/i }).click()

    // Should redirect back to portfolio or entry detail
    await page.waitForURL(/\/portfolio/, { timeout: 10_000 })
    await expect(page.locator('text=E2E test audit')).toBeVisible()

    // ── 4. Logout ───────────────────────────────────────────────────────────
    await page.goto('/settings')
    const signOutBtn = page.getByRole('button', { name: /sign out|log out/i })
    await signOutBtn.click()
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })
})
