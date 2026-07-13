'use client'

import type { ComponentProps } from 'react'
import Link from 'next/link'
import { trackMarketingEvent } from '@/lib/marketing/analytics'

type TrackedLinkProps = ComponentProps<typeof Link> & {
  analyticsEvent: Parameters<typeof trackMarketingEvent>[0]
  analyticsProperties?: Parameters<typeof trackMarketingEvent>[1]
}

export function TrackedLink({
  analyticsEvent,
  analyticsProperties,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackMarketingEvent(analyticsEvent, analyticsProperties)
        onClick?.(event)
      }}
    />
  )
}
