import type { SupabaseClient } from '@supabase/supabase-js'

// Evidence-link rows (specialty_entry_links, arcp_entry_links) only store the
// linked entry's id, so specialty evidence rows used to read "Evidence linked
// / Portfolio / View" for every link. These helpers resolve the linked entry's
// or case's title and date (the owner's own live rows, read under their RLS
// session) so pages can name what is linked and filter it by date.
// Display-only: nothing here changes scoring.

type LinkLike = { entry_id: string | null; entry_type: 'portfolio' | 'case' | null }
export type LinkedEntryMeta = { entry_title?: string | null; entry_date?: string | null }
type TitleRow = { id: string; title: string; date: string | null }

/** Pure join: copy title/date onto each link from the per-type lookups. */
export function attachLinkedEntryMeta<L extends LinkLike>(
  links: L[],
  portfolioRows: TitleRow[],
  caseRows: TitleRow[],
): (L & LinkedEntryMeta)[] {
  const portfolio = new Map(portfolioRows.map(row => [row.id, row]))
  const cases = new Map(caseRows.map(row => [row.id, row]))
  return links.map(link => {
    if (!link.entry_id || !link.entry_type) return link
    const row = (link.entry_type === 'case' ? cases : portfolio).get(link.entry_id)
    return row ? { ...link, entry_title: row.title, entry_date: row.date } : link
  })
}

const ID_BATCH = 100

async function fetchTitles(supabase: SupabaseClient, table: 'portfolio_entries' | 'cases', ids: string[]): Promise<TitleRow[]> {
  const rows: TitleRow[] = []
  for (let offset = 0; offset < ids.length; offset += ID_BATCH) {
    const { data } = await supabase
      .from(table)
      .select('id, title, date')
      .in('id', ids.slice(offset, offset + ID_BATCH))
      .is('deleted_at', null)
    rows.push(...((data ?? []) as TitleRow[]))
  }
  return rows
}

/** Resolve titles/dates for every entry/case the links point at. */
export async function withLinkedEntryMeta<L extends LinkLike>(
  supabase: SupabaseClient,
  links: L[],
): Promise<(L & LinkedEntryMeta)[]> {
  const portfolioIds = Array.from(new Set(links.filter(l => l.entry_type === 'portfolio' && l.entry_id).map(l => l.entry_id!)))
  const caseIds = Array.from(new Set(links.filter(l => l.entry_type === 'case' && l.entry_id).map(l => l.entry_id!)))
  const [portfolioRows, caseRows] = await Promise.all([
    portfolioIds.length > 0 ? fetchTitles(supabase, 'portfolio_entries', portfolioIds) : Promise.resolve([]),
    caseIds.length > 0 ? fetchTitles(supabase, 'cases', caseIds) : Promise.resolve([]),
  ])
  return attachLinkedEntryMeta(links, portfolioRows, caseRows)
}
