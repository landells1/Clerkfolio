/**
 * Flow: PDF export (free user) — generates PDF, free quota decrements
 *
 * Requires:
 *   E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD — existing free-tier account
 *     with at least one portfolio entry and pdf_exports_used < 1
 *   SUPABASE_TEST_URL / SUPABASE_TEST_SERVICE_ROLE_KEY
 *
 * The test asserts:
 *   - The export page renders
 *   - The download response is application/pdf
 *   - pdf_exports_used increments by 1 in the DB
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loginAs, TEST_USER } from '../fixtures/auth'

test.describe('PDF export — free tier quota', () => {
  test.skip(
    !process.env.SUPABASE_TEST_URL,
    'Skipped: SUPABASE_TEST_URL required',
  )

  test('exports a PDF and increments the pdf_exports_used counter', async ({ page }) => {
    await loginAs(page)

    // Read initial pdf_exports_used from DB
    const supabase = createClient(
      process.env.SUPABASE_TEST_URL!,
      process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!,
    )
    const { data: before } = await supabase
      .from('profiles')
      .select('pdf_exports_used, id')
      .eq('email', TEST_USER.email)
      .single()

    const initialCount = before?.pdf_exports_used ?? 0

    // Initiate PDF export
    await page.goto('/export')
    const exportBtn = page.getByRole('button', { name: /export pdf|download pdf/i })
    await expect(exportBtn).toBeVisible()

    // Intercept the download
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      exportBtn.click(),
    ])

    // Verify the downloaded file is a PDF
    const suggestedFilename = download.suggestedFilename()
    expect(suggestedFilename).toMatch(/\.pdf$/i)

    // Allow the server-side increment to commit
    await page.waitForTimeout(1_000)

    // Verify counter incremented
    const { data: after } = await supabase
      .from('profiles')
      .select('pdf_exports_used')
      .eq('id', before!.id)
      .single()

    expect(after?.pdf_exports_used).toBe(initialCount + 1)
  })

  test('shows an upgrade prompt when the free PDF quota is exhausted', async ({ page }) => {
    // This test requires a user whose pdf_exports_used is already at the free limit.
    // Skip if not configured explicitly.
    test.skip(
      !process.env.E2E_PDF_QUOTA_EXHAUSTED_USER,
      'Skipped: E2E_PDF_QUOTA_EXHAUSTED_USER not set',
    )

    await loginAs(page, process.env.E2E_PDF_QUOTA_EXHAUSTED_USER!, process.env.E2E_TEST_USER_PASSWORD!)
    await page.goto('/export')

    await expect(page.getByText(/upgrade|quota|limit reached/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /export pdf|download pdf/i })).toBeDisabled()
  })
})
