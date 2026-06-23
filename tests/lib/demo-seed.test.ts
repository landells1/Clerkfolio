// Unit tests for the demo starter pack seed (F-014). The seed must be:
//  - skipped when the user dismissed/removed demos,
//  - skipped when the account already has any entry/case,
//  - exactly one case + one audit when the account is empty,
//  - idempotent: a 23505 (duplicate-key against the partial unique demo index)
//    is the exactly-once outcome we want, so it must NOT surface as an error.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ensureDemoStarterPack } from '@/lib/onboarding/demo-seed'

type PgError = { code?: string; message: string }

function makeFakeSupabase(opts: {
  entryCount?: number
  caseCount?: number
  insertErrors?: Record<string, PgError>
}) {
  const inserts: string[] = []
  const client = {
    inserts,
    from(table: string) {
      const countFor = table === 'cases' ? (opts.caseCount ?? 0) : (opts.entryCount ?? 0)
      return {
        select() {
          const chain = {
            eq() { return chain },
            is() { return Promise.resolve({ count: countFor, error: null }) },
          }
          return chain
        },
        insert() {
          inserts.push(table)
          return Promise.resolve({ error: opts.insertErrors?.[table] ?? null })
        },
      }
    },
  }
  return client
}

// The real signature wants the supabase server client; the fake only implements
// the slice the seed touches.
type SeedClient = Parameters<typeof ensureDemoStarterPack>[0]
const USER = '11111111-1111-1111-1111-111111111111'

afterEach(() => vi.restoreAllMocks())

describe('ensureDemoStarterPack', () => {
  it('does nothing (and inserts nothing) when demos were dismissed', async () => {
    const supabase = makeFakeSupabase({})
    const result = await ensureDemoStarterPack(supabase as unknown as SeedClient, USER, '2026-06-23T00:00:00Z')
    expect(result).toBe(false)
    expect(supabase.inserts).toEqual([])
  })

  it('does nothing when the account already has an entry', async () => {
    const supabase = makeFakeSupabase({ entryCount: 1 })
    const result = await ensureDemoStarterPack(supabase as unknown as SeedClient, USER)
    expect(result).toBe(false)
    expect(supabase.inserts).toEqual([])
  })

  it('does nothing when the account already has a case', async () => {
    const supabase = makeFakeSupabase({ caseCount: 3 })
    const result = await ensureDemoStarterPack(supabase as unknown as SeedClient, USER)
    expect(result).toBe(false)
    expect(supabase.inserts).toEqual([])
  })

  it('seeds exactly one case and one audit when the account is empty', async () => {
    const supabase = makeFakeSupabase({ entryCount: 0, caseCount: 0 })
    const result = await ensureDemoStarterPack(supabase as unknown as SeedClient, USER)
    expect(result).toBe(true)
    expect(supabase.inserts.sort()).toEqual(['cases', 'portfolio_entries'])
  })

  it('treats a duplicate-key (23505) as a silent no-op, not an error', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const supabase = makeFakeSupabase({
      insertErrors: {
        cases: { code: '23505', message: 'duplicate key value violates unique constraint' },
        portfolio_entries: { code: '23505', message: 'duplicate key value violates unique constraint' },
      },
    })
    const result = await ensureDemoStarterPack(supabase as unknown as SeedClient, USER)
    expect(result).toBe(true)
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('logs a genuine (non-23505) insert error but still resolves', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const supabase = makeFakeSupabase({
      insertErrors: { portfolio_entries: { code: '42501', message: 'permission denied' } },
    })
    const result = await ensureDemoStarterPack(supabase as unknown as SeedClient, USER)
    expect(result).toBe(true)
    expect(errSpy).toHaveBeenCalledTimes(1)
  })
})
