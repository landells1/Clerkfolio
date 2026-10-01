// @vitest-environment node
import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseTrashPurgeRequest, purgeTrash, MAX_ITEMS_PER_REQUEST } from '@/lib/trash/purge'

const ID = '11111111-2222-4333-8444-555555555555'
const ID2 = '66666666-7777-4888-9999-aaaaaaaaaaaa'

describe('parseTrashPurgeRequest', () => {
  it('accepts "everything in Trash"', () => {
    expect(parseTrashPurgeRequest({ all: true })).toEqual({ all: true })
  })

  it('accepts typed items and de-duplicates them', () => {
    expect(parseTrashPurgeRequest({ items: [{ id: ID, type: 'entry' }, { id: ID, type: 'entry' }, { id: ID2, type: 'log' }] }))
      .toEqual({ items: [{ id: ID, type: 'entry' }, { id: ID2, type: 'log' }] })
  })

  it('rejects malformed bodies', () => {
    expect(parseTrashPurgeRequest(null)).toBeNull()
    expect(parseTrashPurgeRequest({ all: 'yes' })).toBeNull()
    expect(parseTrashPurgeRequest({ items: [] })).toBeNull()
    expect(parseTrashPurgeRequest({ items: [{ id: 'not-a-uuid', type: 'entry' }] })).toBeNull()
    expect(parseTrashPurgeRequest({ items: [{ id: ID, type: 'deadline' }] })).toBeNull()
    expect(parseTrashPurgeRequest({ items: Array.from({ length: MAX_ITEMS_PER_REQUEST + 1 }, () => ({ id: ID, type: 'entry' })) })).toBeNull()
  })
})

// Minimal chainable fake: records every filter, resolves selects from a
// per-table store and deletes matching rows. Enough to prove purgeTrash only
// touches the owner's rows that are already in Trash.
type Row = { id: string; user_id: string; deleted_at: string | null }
function fakeSupabase(tables: Record<string, Row[]>) {
  const deleted: Record<string, string[]> = {}
  function builder(table: string) {
    const filters: ((row: Row) => boolean)[] = []
    let mode: 'select' | 'delete' = 'select'
    const api = {
      select: () => api,
      delete: () => { mode = 'delete'; return api },
      eq: (col: keyof Row, value: unknown) => { filters.push(row => row[col] === value); return api },
      not: (col: keyof Row, _op: string, _value: null) => { filters.push(row => row[col] !== null); return api },
      in: (col: keyof Row, values: unknown[]) => { filters.push(row => values.includes(row[col])); return api },
      order: () => api,
      range: () => api,
      then(resolve: (value: { data: { id: string }[]; error: null }) => void) {
        const rows = (tables[table] ?? []).filter(row => filters.every(f => f(row)))
        if (mode === 'delete') {
          deleted[table] = [...(deleted[table] ?? []), ...rows.map(r => r.id)]
          tables[table] = (tables[table] ?? []).filter(row => !rows.includes(row))
        }
        resolve({ data: rows.map(r => ({ id: r.id })), error: null })
      },
    }
    return api
  }
  return { client: { from: builder } as unknown as SupabaseClient, deleted }
}

describe('purgeTrash', () => {
  it('deletes only the owner\'s soft-deleted log rows that were asked for', async () => {
    const { client, deleted } = fakeSupabase({
      personal_log: [
        { id: ID, user_id: 'me', deleted_at: '2026-09-30T00:00:00Z' },
        { id: ID2, user_id: 'me', deleted_at: null },              // not in Trash
        { id: 'other', user_id: 'someone-else', deleted_at: '2026-09-30T00:00:00Z' },
      ],
    })
    const result = await purgeTrash(client, 'me', { items: [{ id: ID, type: 'log' }, { id: ID2, type: 'log' }] })
    expect(result).toEqual({ purged: { entries: 0, cases: 0, logs: 1 }, error: null })
    expect(deleted.personal_log).toEqual([ID])
  })
})
