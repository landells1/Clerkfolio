import { type Page } from '@playwright/test'

export const TEST_USER = {
  email: process.env.E2E_TEST_USER_EMAIL ?? 'e2e-test@clerkfolio-test.co.uk',
  password: process.env.E2E_TEST_USER_PASSWORD ?? 'E2eTestPass123!',
}

/** Sign in via the login page and wait for the dashboard. */
export async function loginAs(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/(dashboard|onboarding)/)
}

/** Sign out from anywhere in the app. */
export async function logout(page: Page) {
  // Settings sidebar link or dropdown
  await page.goto('/settings')
  const signOutBtn = page.getByRole('button', { name: /sign out|log out/i })
  if (await signOutBtn.isVisible()) {
    await signOutBtn.click()
  } else {
    // Fallback: navigate directly to logout endpoint if it exists
    await page.goto('/auth/signout')
  }
  await page.waitForURL(/\/login/)
}
