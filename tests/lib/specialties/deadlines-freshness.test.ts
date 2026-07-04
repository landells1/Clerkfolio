import { describe, it, expect } from 'vitest'
import { NHS_ROUND_3_2026_DEADLINES, isSpecialtyCycleStale } from '@/lib/specialties/deadlines'

// Freshness tripwire (P1-9b). The NHS_ROUND_3_2026_DEADLINES set is pinned to a
// single recruitment round and is surfaced both in the Timeline UI and — the
// worse case — pushed into users' subscribed calendars via the ICS feed. Once
// the round closes those dates become misleading past-dated events.
//
// Unlike the SPECIALTY-REFRESH tripwire (driven by sources[].lastVerified on
// the scoring configs, ~2028 horizon), nothing else fails `npm run test` when
// these recruitment dates go stale. This suite forces a refresh AHEAD of that:
// it fails once we come within REFRESH_LEAD_DAYS of the staleness cutoff, giving
// the owner a runway to replace the dates with the next round from
// NHS_RECRUITMENT_TIMELINE_URL (verify against the source — dates are
// time-sensitive) and rename the const to the new cycle.

// How far ahead of the staleness cutoff the test starts failing. The cutoff is
// (latest close-date + 30-day grace, per isSpecialtyCycleStale), so a 60-day
// lead means this suite goes red ~90 days after the last pinned date — early
// enough to refresh before any subscriber sees a stale event.
const REFRESH_LEAD_DAYS = 60

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

describe('NHS recruitment deadline freshness', () => {
  it('has a non-empty pinned round with well-formed dates', () => {
    expect(NHS_ROUND_3_2026_DEADLINES.length).toBeGreaterThan(0)
    for (const deadline of NHS_ROUND_3_2026_DEADLINES) {
      expect(deadline.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('is not already stale', () => {
    // If this fails, the pinned round has fully elapsed and users are seeing
    // misleading past dates NOW — refresh NHS_ROUND_3_2026_DEADLINES urgently.
    expect(isSpecialtyCycleStale(NHS_ROUND_3_2026_DEADLINES)).toBe(false)
  })

  it(`will not go stale within the next ${REFRESH_LEAD_DAYS} days — refresh the round before this fails`, () => {
    // Tripwire: assert the cycle is still fresh REFRESH_LEAD_DAYS from now. When
    // this flips to failing, the round is about to close — replace the dates
    // with the next official round (see the block comment above) to clear it.
    const horizon = addDays(new Date(), REFRESH_LEAD_DAYS)
    expect(isSpecialtyCycleStale(NHS_ROUND_3_2026_DEADLINES, horizon)).toBe(false)
  })
})
