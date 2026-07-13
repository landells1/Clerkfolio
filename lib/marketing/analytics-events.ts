export const MARKETING_EVENTS = {
  cta: 'marketing_cta_clicked',
  login: 'marketing_login_clicked',
  navigation: 'marketing_navigation_clicked',
  signupStarted: 'marketing_signup_started',
} as const

export type MarketingEventName = (typeof MARKETING_EVENTS)[keyof typeof MARKETING_EVENTS]
