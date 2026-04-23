export const TRIAL_DAYS = 180 // 6 months

export type SubscriptionInfo = {
  isPro: boolean
  isPastDue: boolean
  isTrial: boolean
  isExpired: boolean
  trialEndsAt: Date | null
  daysRemaining: number | null
  canExport: boolean
}

type ProfileSubFields = {
  trial_started_at: string | null
  subscription_status: string | null
  subscription_period_end: string | null
}

export function getSubscriptionInfo(profile: ProfileSubFields): SubscriptionInfo {
  const now = new Date()

  // Active paid subscription
  const isPro =
    profile.subscription_status === 'active' &&
    profile.subscription_period_end != null &&
    new Date(profile.subscription_period_end) > now

  if (isPro) {
    return { isPro: true, isPastDue: false, isTrial: false, isExpired: false, trialEndsAt: null, daysRemaining: null, canExport: true }
  }

  // Past-due: payment failed but still within the period — grant access during grace period
  const isPastDue =
    profile.subscription_status === 'past_due' &&
    profile.subscription_period_end != null &&
    new Date(profile.subscription_period_end) > now

  if (isPastDue) {
    return { isPro: false, isPastDue: true, isTrial: false, isExpired: false, trialEndsAt: null, daysRemaining: null, canExport: true }
  }

  // Trial window
  const start = profile.trial_started_at ? new Date(profile.trial_started_at) : new Date()
  const trialEndsAt = new Date(start)
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS)

  const msLeft = trialEndsAt.getTime() - now.getTime()
  const daysRemaining = Math.max(0, Math.ceil(msLeft / 86400000))
  const isTrial = now < trialEndsAt

  return {
    isPro: false,
    isPastDue: false,
    isTrial,
    isExpired: !isTrial,
    trialEndsAt,
    daysRemaining: isTrial ? daysRemaining : null,
    canExport: isTrial,
  }
}
