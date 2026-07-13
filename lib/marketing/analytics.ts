'use client'

import { track } from '@vercel/analytics'
import { getConsent } from '@/lib/consent'
import type { MarketingEventName } from '@/lib/marketing/analytics-events'
type MarketingEventProperties = Record<string, string | number | boolean>

export function trackMarketingEvent(
  name: MarketingEventName,
  properties?: MarketingEventProperties,
): void {
  if (getConsent()?.analytics !== true) return
  track(name, properties)
}
