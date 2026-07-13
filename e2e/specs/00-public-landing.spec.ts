import { expect, test } from '@playwright/test'

test.describe('public landing page', () => {
  test('presents the approved product story with clean semantics', async ({ page }) => {
    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', error => pageErrors.push(error.message))

    await page.goto('/')

    await expect(page).toHaveTitle('Clerkfolio | One medical portfolio for your whole career')
    await expect(page.getByRole('heading', { level: 1, name: /one medical portfolio for your whole career/i })).toBeVisible()
    await expect(page.getByText('Public sign-ups opening soon').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'See how Clerkfolio works' })).toBeVisible()

    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('[role="img"] button')).toHaveCount(0)
    await expect(page.locator('[role="img"] main')).toHaveCount(0)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('GMC-aligned categories')
    expect(bodyText).not.toContain('passphrase-protected')
    expect(bodyText).not.toContain('anonymised record')
    expect(bodyText).not.toContain('—')

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(hasHorizontalOverflow).toBe(false)
    expect(consoleErrors).toEqual([])
    expect(pageErrors).toEqual([])
  })

  test('navigation and the responsive menu expose the public journeys', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Log in' }).first()).toHaveAttribute('href', '/login')
    await expect(page.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    await expect(page.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
    await expect(page.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact')

    const menuButton = page.getByRole('button', { name: 'Open menu' })
    if (await menuButton.isVisible()) {
      await menuButton.click()
      await expect(page.getByRole('link', { name: 'Product' })).toBeVisible()
      await expect(page.getByText('Public sign-ups opening soon').last()).toBeVisible()
      await page.getByRole('link', { name: 'How it works' }).click()
      await expect(page).toHaveURL(/\/#how$/)
      await expect(page.getByRole('heading', { name: /record it once/i })).toBeVisible()
    }
  })
})
