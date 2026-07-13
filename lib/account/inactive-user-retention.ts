/**
 * Accounts are retained for two calendar years after their last sign-in. An
 * account that has never signed in is measured from its creation time instead.
 * Calendar years, rather than a fixed millisecond duration, avoid leap-year
 * surprises in the retention policy.
 */
export const INACTIVE_ACCOUNT_RETENTION_YEARS = 2

type AuthUserActivity = {
  created_at?: string | null
  last_sign_in_at?: string | null
}

export function inactiveAccountCutoff(now = new Date()): Date {
  const year = now.getUTCFullYear() - INACTIVE_ACCOUNT_RETENTION_YEARS
  const month = now.getUTCMonth()
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(now.getUTCDate(), lastDayOfTargetMonth)

  return new Date(Date.UTC(
    year,
    month,
    day,
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds(),
  ))
}

export function accountLastActivityAt(user: AuthUserActivity): Date | null {
  const timestamp = user.last_sign_in_at ?? user.created_at
  if (!timestamp) return null

  const activity = new Date(timestamp)
  return Number.isNaN(activity.getTime()) ? null : activity
}

export function isAccountInactiveForRetention(
  user: AuthUserActivity,
  now = new Date(),
): boolean {
  const activity = accountLastActivityAt(user)
  return activity !== null && activity.getTime() <= inactiveAccountCutoff(now).getTime()
}
