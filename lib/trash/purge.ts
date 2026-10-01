import type { SupabaseClient } from '@supabase/supabase-js'
import { purgeEvidenceForEntriesClient, type EvidencePurgeTarget } from '@/lib/evidence/client-purge'
import { fetchAllRows } from '@/lib/supabase/fetch-all'

// Owner-initiated permanent delete from Trash ("Delete permanently now" and
// "Empty trash"). Runs on the server under the signed-in user's own session
// (RLS) with explicit user_id filters as a second guard, and only ever touches
// rows that are ALREADY soft-deleted (in Trash). The nightly purge-deleted cron
// (30-day auto-purge) is separate and unchanged.
//
// Evidence follows the multi-link rule: each doomed entry's link rows are
// deleted first, and a physical file (storage object + evidence_files row) is
// removed only when its LAST link is gone - a file still attached to another
// live entry or case survives. Rows are deleted only for batches whose
// evidence cleanup succeeded.

export type TrashItemType = 'entry' | 'case' | 'log'
export type TrashPurgeRequest = { all: true } | { items: { id: string; type: TrashItemType }[] }
export type TrashPurgeResult = {
  purged: { entries: number; cases: number; logs: number }
  error: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TABLE: Record<TrashItemType, 'portfolio_entries' | 'cases' | 'personal_log'> = {
  entry: 'portfolio_entries',
  case: 'cases',
  log: 'personal_log',
}
export const MAX_ITEMS_PER_REQUEST = 500
const ID_BATCH = 100

/** Validate and normalise a request body; null when it is malformed. */
export function parseTrashPurgeRequest(body: unknown): TrashPurgeRequest | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const record = body as Record<string, unknown>
  if (record.all === true) return { all: true }
  if (!Array.isArray(record.items) || record.items.length === 0 || record.items.length > MAX_ITEMS_PER_REQUEST) return null
  const items: { id: string; type: TrashItemType }[] = []
  const seen = new Set<string>()
  for (const raw of record.items) {
    if (!raw || typeof raw !== 'object') return null
    const { id, type } = raw as Record<string, unknown>
    if (typeof id !== 'string' || !UUID_RE.test(id)) return null
    if (type !== 'entry' && type !== 'case' && type !== 'log') return null
    const key = `${type}:${id}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ id, type })
  }
  return { items }
}

/** Ids of the user's rows in `table` that are in Trash (optionally limited to `ids`). */
async function trashedIds(supabase: SupabaseClient, userId: string, type: TrashItemType, ids?: string[]): Promise<string[]> {
  if (ids && ids.length === 0) return []
  const table = TABLE[type]
  if (ids) {
    const found: string[] = []
    for (let offset = 0; offset < ids.length; offset += ID_BATCH) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .in('id', ids.slice(offset, offset + ID_BATCH))
      if (error) throw new Error('lookup_failed')
      found.push(...((data ?? []) as { id: string }[]).map(row => row.id))
    }
    return found
  }
  const { data, error } = await fetchAllRows<{ id: string }>((from, to) => supabase
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('id')
    .range(from, to))
  if (error) throw new Error('lookup_failed')
  return (data ?? []).map(row => row.id)
}

async function purgeTable(supabase: SupabaseClient, userId: string, type: TrashItemType, ids: string[]): Promise<{ purged: number; ok: boolean }> {
  let purged = 0
  for (let offset = 0; offset < ids.length; offset += ID_BATCH) {
    const batch = ids.slice(offset, offset + ID_BATCH)
    if (type !== 'log') {
      const targets: EvidencePurgeTarget[] = batch.map(id => ({ entryId: id, entryType: type === 'entry' ? 'portfolio' : 'case' }))
      const evidence = await purgeEvidenceForEntriesClient(supabase, userId, targets)
      if (evidence.error) return { purged, ok: false }
    }
    const { data, error } = await supabase
      .from(TABLE[type])
      .delete()
      .in('id', batch)
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .select('id')
    if (error) return { purged, ok: false }
    purged += (data ?? []).length
  }
  return { purged, ok: true }
}

export async function purgeTrash(supabase: SupabaseClient, userId: string, request: TrashPurgeRequest): Promise<TrashPurgeResult> {
  const purged = { entries: 0, cases: 0, logs: 0 }
  const wanted = (type: TrashItemType) => ('all' in request ? undefined : request.items.filter(item => item.type === type).map(item => item.id))
  let ids: Record<TrashItemType, string[]>
  try {
    const [entry, kase, log] = await Promise.all([
      trashedIds(supabase, userId, 'entry', wanted('entry')),
      trashedIds(supabase, userId, 'case', wanted('case')),
      trashedIds(supabase, userId, 'log', wanted('log')),
    ])
    ids = { entry, case: kase, log }
  } catch {
    return { purged, error: 'Could not read your Trash. Please try again.' }
  }

  const entries = await purgeTable(supabase, userId, 'entry', ids.entry)
  purged.entries = entries.purged
  const cases = await purgeTable(supabase, userId, 'case', ids.case)
  purged.cases = cases.purged
  const logs = await purgeTable(supabase, userId, 'log', ids.log)
  purged.logs = logs.purged

  const ok = entries.ok && cases.ok && logs.ok
  return { purged, error: ok ? null : 'Some items could not be deleted permanently. Please try again.' }
}
