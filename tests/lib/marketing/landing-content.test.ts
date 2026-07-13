import { describe, expect, it } from 'vitest'
import { LANDING_FAQS } from '@/lib/marketing/faqs'
import { MARKETING_EVENTS } from '@/lib/marketing/analytics-events'

describe('landing content invariants', () => {
  it('keeps FAQ content concise and clear of unsupported claims', () => {
    for (const [question, answer] of LANDING_FAQS) {
      const text = `${question} ${answer}`
      expect(text).not.toContain('—')
      expect(text.toLowerCase()).not.toContain('nhs approved')
      expect(text.toLowerCase()).not.toContain('fully compliant')
      expect(text.toLowerCase()).not.toContain('guarantee')
    }
  })

  it('uses unique, namespaced analytics event names', () => {
    const events = Object.values(MARKETING_EVENTS)
    expect(new Set(events).size).toBe(events.length)
    expect(events.every(event => event.startsWith('marketing_'))).toBe(true)
  })
})
