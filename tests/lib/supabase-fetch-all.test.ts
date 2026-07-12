// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type { PostgrestError } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/supabase/fetch-all'

type Row = { id: number }

// Build a page factory that slices a fixed dataset by the inclusive [from, to]
// range, mimicking PostgREST's `.range()`. Records every (from, to) it is asked
// for so tests can assert the pagination walk.
function datasetPager(dataset: Row[]) {
  const calls: Array<{ from: number; to: number }> = []
  const page = vi.fn(async (from: number, to: number) => {
    calls.push({ from, to })
    return { data: dataset.slice(from, to + 1), error: null as PostgrestError | null }
  })
  return { page, calls }
}

const err = (message: string): PostgrestError =>
  ({ name: 'PostgrestError', message, details: '', hint: '', code: 'X' }) as PostgrestError

describe('fetchAllRows', () => {
  it('concatenates rows across multiple pages, in order', async () => {
    const dataset: Row[] = [1, 2, 3, 4, 5].map(id => ({ id }))
    const { page, calls } = datasetPager(dataset)

    const { data, error } = await fetchAllRows(page, { pageSize: 2 })

    expect(error).toBeNull()
    expect(data).toEqual(dataset)
    // Pages: [0,1], [2,3], [4,5] — the last page returns 1 row (< pageSize) and stops.
    expect(calls).toEqual([
      { from: 0, to: 1 },
      { from: 2, to: 3 },
      { from: 4, to: 5 },
    ])
    expect(page).toHaveBeenCalledTimes(3)
  })

  it('does an extra fetch to terminate when the total is an exact page multiple', async () => {
    const dataset: Row[] = [1, 2, 3, 4].map(id => ({ id }))
    const { page, calls } = datasetPager(dataset)

    const { data, error } = await fetchAllRows(page, { pageSize: 2 })

    expect(error).toBeNull()
    expect(data).toEqual(dataset)
    // 4 rows / pageSize 2 = two full pages; a third (empty) page is required to
    // prove the end has been reached rather than truncating at a full page.
    expect(calls).toEqual([
      { from: 0, to: 1 },
      { from: 2, to: 3 },
      { from: 4, to: 5 },
    ])
    expect(page).toHaveBeenCalledTimes(3)
  })

  it('propagates a page error and returns null data (no partial result)', async () => {
    const dataset: Row[] = [1, 2, 3, 4, 5].map(id => ({ id }))
    const failure = err('page 2 blew up')
    let call = 0
    const page = vi.fn(async (from: number, to: number) => {
      call++
      if (call === 2) return { data: null as Row[] | null, error: failure }
      return { data: dataset.slice(from, to + 1), error: null as PostgrestError | null }
    })

    const { data, error } = await fetchAllRows(page, { pageSize: 2 })

    expect(data).toBeNull()
    expect(error).toBe(failure)
    // Stops immediately on the erroring page; never requests page 3.
    expect(page).toHaveBeenCalledTimes(2)
  })

  it('surfaces the max-pages safety bound as an error, never a truncated success', async () => {
    // A pathological pager that always returns a full page, so a short page never
    // arrives to terminate the loop.
    const page = vi.fn(async (from: number, to: number) =>
      ({ data: [{ id: from }, { id: to }], error: null as PostgrestError | null }),
    )

    const { data, error } = await fetchAllRows(page, { pageSize: 2, maxPages: 3 })

    expect(data).toBeNull()
    expect(error).not.toBeNull()
    expect(error?.code).toBe('FETCH_ALL_MAX_PAGES')
    expect(page).toHaveBeenCalledTimes(3)
  })

  it('returns an empty array for an empty table (single short page)', async () => {
    const { page, calls } = datasetPager([])

    const { data, error } = await fetchAllRows(page, { pageSize: 2 })

    expect(error).toBeNull()
    expect(data).toEqual([])
    expect(calls).toEqual([{ from: 0, to: 1 }])
    expect(page).toHaveBeenCalledTimes(1)
  })

  it('defaults to a 1000-row page window', async () => {
    const { page, calls } = datasetPager([{ id: 1 }])

    await fetchAllRows(page)

    expect(calls[0]).toEqual({ from: 0, to: 999 })
  })
})
