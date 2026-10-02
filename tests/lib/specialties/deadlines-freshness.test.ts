import { describe, it, expect } from 'vitest'
import {
  NHS_NATIONAL_RECRUITMENT_ROUNDS,
  NHS_ROUND_1_2027_DEADLINES,
  NHS_ROUND_3_2026_DEADLINES,
  NHS_ROUND_3_2027_DEADLINES,
  currentNationalRecruitmentDeadlines,
  nationalDeadlineId,
  type SpecialtyDeadline,
} from '@/lib/specialties/deadlines'

// Freshness tripwire (P1-9b). The pinned national NHS recruitment rounds are
// surfaced both in the Timeline UI and (the worse case) pushed into users'
// subscribed calendars via the ICS feed. Once every pinned round closes those
// dates become misleading past-dated events.
//
// Unlike the SPECIALTY-REFRESH tripwire (driven by sources[].lastVerified on
// the scoring configs, ~2028 horizon), nothing else fails `npm run test` when
// these recruitment dates go stale. This suite forces a refresh AHEAD of that:
// it fails once we come within REFRESH_LEAD_DAYS of the moment every pinned
// round is stale, giving the owner a runway to pin the next round from
// NHS_RECRUITMENT_TIMELINE_URL (verify against the source - dates are
// time-sensitive) and add it to NHS_NATIONAL_RECRUITMENT_ROUNDS.

// How far ahead of the staleness cutoff the test starts failing. The cutoff is
// (latest close-date of the newest round + 30-day grace, per
// isSpecialtyCycleStale), so a 60-day lead means this suite goes red ~30 days
// before the newest pinned date.
const REFRESH_LEAD_DAYS = 60

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

describe('NHS recruitment deadline freshness', () => {
  it('has non-empty pinned rounds with well-formed dates and round-unique ids', () => {
    expect(NHS_NATIONAL_RECRUITMENT_ROUNDS.length).toBeGreaterThan(0)
    const ids = new Set<string>()
    for (const round of NHS_NATIONAL_RECRUITMENT_ROUNDS) {
      expect(round.length).toBeGreaterThan(0)
      for (const deadline of round) {
        expect(deadline.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        const id = nationalDeadlineId(deadline)
        expect(ids.has(id)).toBe(false)
        ids.add(id)
      }
      // One specialtyKey per round, so ids stay unique across rounds.
      expect(new Set(round.map(deadline => deadline.specialtyKey)).size).toBe(1)
    }
  })

  it('is not already stale', () => {
    // If this fails, every pinned round has fully elapsed and users are seeing
    // misleading past dates NOW - pin the current round urgently.
    expect(currentNationalRecruitmentDeadlines().stale).toBe(false)
  })

  it(`will not go stale within the next ${REFRESH_LEAD_DAYS} days - pin the next round before this fails`, () => {
    const horizon = addDays(new Date(), REFRESH_LEAD_DAYS)
    expect(currentNationalRecruitmentDeadlines(horizon).stale).toBe(false)
  })
})

describe('currentNationalRecruitmentDeadlines', () => {
  it('shows every round that is still current, sorted by date', () => {
    const { deadlines, stale } = currentNationalRecruitmentDeadlines(new Date('2026-09-28T12:00:00Z'))
    expect(stale).toBe(false)
    expect(deadlines.some(d => d.specialtyKey === 'nhs_round_3_2026')).toBe(true)
    expect(deadlines.some(d => d.specialtyKey === 'nhs_round_1_2027')).toBe(true)
    const dates = deadlines.map(d => d.date)
    expect([...dates].sort()).toEqual(dates)
  })

  it('drops a closed round once its grace window has passed', () => {
    // Round 3 2026 ends 2026-10-29; +30 days grace = 2026-11-28.
    const { deadlines, stale } = currentNationalRecruitmentDeadlines(new Date('2026-12-15T12:00:00Z'))
    expect(stale).toBe(false)
    expect(deadlines.some(d => d.specialtyKey === 'nhs_round_3_2026')).toBe(false)
    expect(deadlines).toHaveLength(NHS_ROUND_1_2027_DEADLINES.length + NHS_ROUND_3_2027_DEADLINES.length)
  })

  it('falls back to the most recent round, flagged stale, once every round has elapsed', () => {
    const { deadlines, stale } = currentNationalRecruitmentDeadlines(new Date('2030-01-01T12:00:00Z'))
    expect(stale).toBe(true)
    expect(deadlines).toEqual(NHS_ROUND_3_2027_DEADLINES)
  })

  it('keeps only the later round once the earlier one has gone stale', () => {
    // Round 1 2027 ends 2027-04-15; +30 days grace = 2027-05-15.
    const { deadlines, stale } = currentNationalRecruitmentDeadlines(new Date('2027-06-01T12:00:00Z'))
    expect(stale).toBe(false)
    expect(deadlines.every(d => d.specialtyKey === 'nhs_round_3_2027')).toBe(true)
  })

  it('treats the last day of the grace window as current, in UTC', () => {
    // Round 3 2027 ends 2027-10-28, so the cutoff is 2027-11-27T00:00:00Z.
    const rounds = [NHS_ROUND_3_2027_DEADLINES]
    expect(currentNationalRecruitmentDeadlines(new Date('2027-11-27T00:00:00Z'), rounds).stale).toBe(false)
    expect(currentNationalRecruitmentDeadlines(new Date('2027-11-27T00:00:01Z'), rounds).stale).toBe(true)
  })

  it('handles empty input', () => {
    expect(currentNationalRecruitmentDeadlines(new Date(), [])).toEqual({ deadlines: [], stale: false })
    const onlyOld: SpecialtyDeadline[][] = [NHS_ROUND_3_2026_DEADLINES]
    expect(currentNationalRecruitmentDeadlines(new Date('2030-01-01T12:00:00Z'), onlyOld).stale).toBe(true)
  })
})
