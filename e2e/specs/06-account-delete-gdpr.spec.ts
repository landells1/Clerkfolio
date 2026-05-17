/**
 * Flow: Account delete → GDPR ZIP export download
 *
 * Requires:
 *   E2E_GDPR_TEST_USER_EMAIL / E2E_GDPR_TEST_USER_PASSWORD
 *     — a DISPOSABLE account created specifically for this test.
 *     DO NOT point at the main E2E test user; this test deletes the account.
 *   SUPABASE_TEST_URL / SUPABASE_TEST_SERVICE_ROLE_KEY
 *
 * The test:
 *   1. Logs in as the disposable user
 *   2. Triggers the data-export (GDPR ZIP) download and asserts a .zip arrives
 *   3. Initiates account deletion with the required "DELETE" confirmation text
 *   4. Asserts the user can no longer log in after deletion
 */
import { test, expect } from '@playwright/test'
import { loginAs } from '../fixtures/auth'
import { hasSupabaseTestEnv } from '../fixtures/env'

const GDPR_EMAIL = process.env.E2E_GDPR_TEST_USER_EMAIL ?? ''
const GDPR_PASSWORD = process.env.E2E_GDPR_TEST_USER_PASSWORD ?? ''

test.describe('Account delete + GDPR export', () => {
  test.skip(
    !hasSupabaseTestEnv() || !GDPR_EMAIL || !GDPR_PASSWORD,
    'Skipped: Supabase E2E credentials plus E2E_GDPR_TEST_USER_EMAIL and E2E_GDPR_TEST_USER_PASSWORD required',
  )

  test('downloads a GDPR data-export ZIP before deletion', async ({ page }) => {
    await loginAs(page, GDPR_EMAIL, GDPR_PASSWORD)

    await page.goto('/settings')

    // Find the data export / GDPR download button
    const exportBtn = page.getByRole('button', { name: /export.*data|download.*data|gdpr|my data/i })
    await expect(exportBtn).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      exportBtn.click(),
    ])

    expect(download.suggestedFilename()).toMatch(/\.(zip)$/i)
  })

  test('account deletion requires "DELETE" confirmation and then signs out', async ({ page }) => {
    await loginAs(page, GDPR_EMAIL, GDPR_PASSWORD)
    await page.goto('/settings')

    // Navigate to the danger zone / delete account section
    const dangerLink = page.getByRole('link', { name: /delete account|danger zone/i })
    if (await dangerLink.isVisible()) await dangerLink.click()

    // The delete button should be present
    const deleteBtn = page.getByRole('button', { name: /delete.*account|permanently delete/i })
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // Confirmation modal: type "DELETE"
    const confirmInput = page.getByRole('textbox', { name: /confirm|type delete/i })
    await expect(confirmInput).toBeVisible()
    await confirmInput.fill('DELETE')

    const confirmBtn = page.getByRole('button', { name: /confirm.*delete|yes.*delete|delete.*account/i })
    await confirmBtn.click()

    // After deletion the user should be redirected to login
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('deleted account cannot log in again', async ({ page }) => {
    // The previous test already deleted the account; this just verifies.
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(GDPR_EMAIL)
    await page.getByLabel(/password/i).fill(GDPR_PASSWORD)
    await page.getByRole('button', { name: /sign in|log in/i }).click()

    // Should stay on /login or show an error — NOT redirect to /dashboard
    await expect(page).not.toHaveURL(/\/dashboard/)
    await expect(
      page.getByText(/invalid|incorrect|no account|not found/i),
    ).toBeVisible({ timeout: 8_000 })
  })
})
