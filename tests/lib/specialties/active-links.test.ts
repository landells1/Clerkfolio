// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { filterLinksToActiveEntries } from '@/lib/specialties/active-links'

type Link = {
  id: string
  entry_id: string | null
  entry_type: string | null
}

const link = (id: string, entryId: string | null, entryType: string | null): Link => ({
  id,
  entry_id: entryId,
  entry_type: entryType,
})

// Minimal stub of the Supabase client surface the filter uses:
//   supabase.from(table).select('id').in('id', ids).is('deleted_at', null)
// Configure per-table live ids (rows that survive the deleted_at-null filter)
// or an error; records which tables were actually queried.
function makeSupabase(config: {
  portfolioLiveIds?: string[]
  caseLiveIds?: string[]
  portfolioError?: boolean
  caseError?: boolean
}) {
  const queriedTables: string[] = []
  const supabase = {
    from(table: string) {
      queriedTables.push(table)
      return {
        select() {
          return {
            in(_column: string, ids: string[]) {
              return {
                is() {
                  const isError =
                    table === 'portfolio_entries' ? config.portfolioError : config.caseError
                  if (isError) {
                    return Promise.resolve({ data: null, error: { message: 'boom' } })
                  }
                  const live = new Set(
                    table === 'portfolio_entries'
                      ? config.portfolioLiveIds ?? []
                      : config.caseLiveIds ?? []
                  )
                  return Promise.resolve({
                    data: ids.filter(id => live.has(id)).map(id => ({ id })),
                    error: null,
                  })
                },
              }
            },
          }
        },
      }
    },
  }
  return { supabase: supabase as never, queriedTables }
}

describe('filterLinksToActiveEntries', () => {
  it('keeps live portfolio links and drops soft-deleted or missing ones', async () => {
    const { supabase } = makeSupabase({ portfolioLiveIds: ['p1'] })
    const links = [link('l1', 'p1', 'portfolio'), link('l2', 'p2', 'portfolio')]
    const result = await filterLinksToActiveEntries(supabase, links)
    expect(result.map(l => l.id)).toEqual(['l1'])
  })

  it('keeps live case links and drops soft-deleted or purged ones', async () => {
    const { supabase } = makeSupabase({ caseLiveIds: ['c1'] })
    const links = [link('l1', 'c1', 'case'), link('l2', 'c2', 'case')]
    const result = await filterLinksToActiveEntries(supabase, links)
    expect(result.map(l => l.id)).toEqual(['l1'])
  })

  it('filters mixed portfolio and case links against the right tables', async () => {
    const { supabase, queriedTables } = makeSupabase({
      portfolioLiveIds: ['p1'],
      caseLiveIds: ['c1'],
    })
    const links = [
      link('lp-live', 'p1', 'portfolio'),
      link('lp-dead', 'p2', 'portfolio'),
      link('lc-live', 'c1', 'case'),
      link('lc-dead', 'c2', 'case'),
    ]
    const result = await filterLinksToActiveEntries(supabase, links)
    expect(result.map(l => l.id)).toEqual(['lp-live', 'lc-live'])
    expect(queriedTables).toContain('portfolio_entries')
    expect(queriedTables).toContain('cases')
  })

  it('a case id being live never rescues a portfolio link with the same id (and vice versa)', async () => {
    const { supabase } = makeSupabase({ caseLiveIds: ['shared'], portfolioLiveIds: [] })
    const links = [link('lp', 'shared', 'portfolio'), link('lc', 'shared', 'case')]
    const result = await filterLinksToActiveEntries(supabase, links)
    expect(result.map(l => l.id)).toEqual(['lc'])
  })

  it('always passes through null-entry links (self-assessed / checkbox claims)', async () => {
    const { supabase } = makeSupabase({ portfolioLiveIds: [], caseLiveIds: [] })
    const links = [
      link('checkbox', null, null),
      link('dead-portfolio', 'p1', 'portfolio'),
      link('dead-case', 'c1', 'case'),
    ]
    const result = await filterLinksToActiveEntries(supabase, links)
    expect(result.map(l => l.id)).toEqual(['checkbox'])
  })

  it('drops links with an unknown entry_type', async () => {
    const { supabase } = makeSupabase({})
    const links = [link('weird', 'x1', 'mystery'), link('null-ok', null, null)]
    const result = await filterLinksToActiveEntries(supabase, links)
    expect(result.map(l => l.id)).toEqual(['null-ok'])
  })

  it('issues no queries when there are no entry-bound links', async () => {
    const { supabase, queriedTables } = makeSupabase({})
    const links = [link('a', null, null), link('b', null, null)]
    const result = await filterLinksToActiveEntries(supabase, links)
    expect(result).toHaveLength(2)
    expect(queriedTables).toEqual([])
  })

  it('uses knownActiveEntryIds to skip the portfolio lookup but still checks cases', async () => {
    const { supabase, queriedTables } = makeSupabase({ caseLiveIds: ['c1'] })
    const links = [
      link('lp', 'p1', 'portfolio'),
      link('lc', 'c1', 'case'),
      link('lc-dead', 'c2', 'case'),
    ]
    const result = await filterLinksToActiveEntries(supabase, links, new Set(['p1']))
    expect(result.map(l => l.id)).toEqual(['lp', 'lc'])
    expect(queriedTables).toEqual(['cases'])
  })

  it('uses knownActiveCaseIds to skip the cases lookup', async () => {
    const { supabase, queriedTables } = makeSupabase({})
    const links = [link('lc', 'c1', 'case'), link('lc-dead', 'c2', 'case')]
    const result = await filterLinksToActiveEntries(
      supabase,
      links,
      undefined,
      new Set(['c1'])
    )
    expect(result.map(l => l.id)).toEqual(['lc'])
    expect(queriedTables).toEqual([])
  })

  it('fails safe on a portfolio lookup error: drops portfolio links, keeps null links and live cases', async () => {
    const { supabase } = makeSupabase({ portfolioError: true, caseLiveIds: ['c1'] })
    const links = [
      link('lp', 'p1', 'portfolio'),
      link('lc', 'c1', 'case'),
      link('null-ok', null, null),
    ]
    const result = await filterLinksToActiveEntries(supabase, links)
    expect(result.map(l => l.id)).toEqual(['lc', 'null-ok'])
  })

  it('fails safe on a cases lookup error: drops case links, keeps null links and live portfolio', async () => {
    const { supabase } = makeSupabase({ caseError: true, portfolioLiveIds: ['p1'] })
    const links = [
      link('lp', 'p1', 'portfolio'),
      link('lc', 'c1', 'case'),
      link('null-ok', null, null),
    ]
    const result = await filterLinksToActiveEntries(supabase, links)
    expect(result.map(l => l.id)).toEqual(['lp', 'null-ok'])
  })
})
