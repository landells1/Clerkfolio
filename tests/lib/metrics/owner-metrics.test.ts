// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildChecklistBuckets, buildOwnerMetricsEmail, fetchOwnerMetrics, type OwnerMetricsSnapshot } from '@/lib/metrics/owner-metrics'

describe('buildChecklistBuckets', () => {
  it('buckets zero-completed profiles as none', () => {
    expect(buildChecklistBuckets([0, 0, 0])).toEqual({ none: 3, some: 0, all: 0 })
  })

  it('buckets any completed items as all (coarse ticked-vs-not signal)', () => {
    expect(buildChecklistBuckets([1, 5, 20])).toEqual({ none: 0, some: 0, all: 3 })
  })

  it('handles a mix', () => {
    expect(buildChecklistBuckets([0, 2, 0, 4])).toEqual({ none: 2, some: 0, all: 2 })
  })

  it('returns all zero for an empty profile set', () => {
    expect(buildChecklistBuckets([])).toEqual({ none: 0, some: 0, all: 0 })
  })
})

function snapshotFixture(overrides: Partial<OwnerMetricsSnapshot> = {}): OwnerMetricsSnapshot {
  return {
    windowLabel: 'week of 2026-07-06',
    totalUsers: 100,
    newSignups: 5,
    activeUsers: 20,
    portfolioEntriesCreated: 30,
    casesCreated: 10,
    onboardingCompleted: 80,
    onboardingIncomplete: 20,
    checklistCompletionBuckets: { none: 20, some: 0, all: 80 },
    specialtyPopularity: [{ specialtyKey: 'imt', count: 12 }, { specialtyKey: 'gp', count: 8 }],
    shareLinksCreated: 3,
    exportsUsed: 0,
    referralsCreated: 2,
    ...overrides,
  }
}

describe('buildOwnerMetricsEmail', () => {
  it('includes only aggregate counts, never PII, in text and html', () => {
    const email = buildOwnerMetricsEmail(snapshotFixture())
    expect(email.subject).toContain('week of 2026-07-06')
    expect(email.text).toContain('Total users: 100')
    expect(email.text).toContain('New signups this week: 5')
    expect(email.text).toContain('Active users this week: 20')
    expect(email.text).toContain('Portfolio entries created: 30')
    expect(email.text).toContain('Cases created: 10')
    expect(email.text).toContain('Completed onboarding: 80')
    expect(email.text).toContain('Not yet completed: 20')
    expect(email.text).toContain('imt: 12')
    expect(email.text).toContain('gp: 8')
    expect(email.text).toContain('Share links created: 3')
    expect(email.text).toContain('Referrals created: 2')

    // No @ sign anywhere implies no email address was interpolated in.
    expect(email.text).not.toContain('@')
    expect(email.html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/)
  })

  it('handles an empty specialty list gracefully', () => {
    const email = buildOwnerMetricsEmail(snapshotFixture({ specialtyPopularity: [] }))
    expect(email.text).toContain('no active specialty tracking this week')
    expect(email.html).toContain('No active specialty tracking this week')
  })

  it('escapes html-special characters in the window label', () => {
    const email = buildOwnerMetricsEmail(snapshotFixture({ windowLabel: '<script>alert(1)</script>' }))
    expect(email.html).not.toContain('<script>alert(1)</script>')
    expect(email.html).toContain('&lt;script&gt;')
  })
})

// ─── fetchOwnerMetrics: mock Supabase query builder ────────────────────────
// Chainable fake that resolves head:true counts and row-returning selects per
// table, matching the pattern used elsewhere for Supabase route/lib tests.
type FakeTableData = {
  count?: number
  rows?: unknown[]
}

function fakeSupabase(tables: Record<string, FakeTableData>) {
  function builder(table: string) {
    const data = tables[table] ?? { count: 0, rows: [] }
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      gte: () => chain,
      lt: () => chain,
      is: () => chain,
      then: (resolve: (value: { data: unknown[] | null; count: number | null; error: null }) => unknown) =>
        resolve({ data: data.rows ?? null, count: data.count ?? null, error: null }),
    }
    return chain
  }
  return { from: (table: string) => builder(table) } as unknown as Parameters<typeof fetchOwnerMetrics>[0]
}

describe('fetchOwnerMetrics', () => {
  const window = { start: new Date('2026-06-29T00:00:00Z'), end: new Date('2026-07-06T00:00:00Z'), label: 'week of 2026-06-29' }

  it('maps counts and dedupes active users across entries and cases', async () => {
    const supabase = fakeSupabase({
      profiles: { count: 50, rows: [] },
      portfolio_entries: { count: 12, rows: [{ user_id: 'u1' }, { user_id: 'u2' }] },
      cases: { count: 4, rows: [{ user_id: 'u2' }, { user_id: 'u3' }] },
      share_links: { count: 2, rows: [] },
      referrals: { count: 1, rows: [] },
      specialty_applications: { rows: [{ specialty_key: 'imt' }, { specialty_key: 'imt' }, { specialty_key: 'gp' }] },
    })

    const snapshot = await fetchOwnerMetrics(supabase, window)

    // u1, u2, u3 are distinct -> 3 active users despite u2 appearing twice.
    expect(snapshot.activeUsers).toBe(3)
    expect(snapshot.portfolioEntriesCreated).toBe(12)
    expect(snapshot.casesCreated).toBe(4)
    expect(snapshot.shareLinksCreated).toBe(2)
    expect(snapshot.referralsCreated).toBe(1)
    expect(snapshot.specialtyPopularity).toEqual([
      { specialtyKey: 'imt', count: 2 },
      { specialtyKey: 'gp', count: 1 },
    ])
    expect(snapshot.windowLabel).toBe('week of 2026-06-29')
  })

  it('defaults missing counts to zero instead of throwing', async () => {
    const supabase = fakeSupabase({})
    const snapshot = await fetchOwnerMetrics(supabase, window)
    expect(snapshot.totalUsers).toBe(0)
    expect(snapshot.activeUsers).toBe(0)
    expect(snapshot.specialtyPopularity).toEqual([])
  })
})
