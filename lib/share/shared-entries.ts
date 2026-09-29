import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

// The portfolio entries a share link exposes. PORTFOLIO ENTRIES ONLY: cases are
// never part of any share (clinical-narrative red-line), so every link-table
// read below is pinned to entry_type = 'portfolio'. Onboarding demo examples
// ("Demo audit - edit me") are never shared either.
//
// A specialty-scoped link covers entries TAGGED with the specialty plus entries
// the user LINKED as evidence to that specialty on the Specialties page - the
// link-evidence modal writes specialty_entry_links without tagging, so a
// tag-only filter showed a recipient far less than the owner saw.

export const SHARED_ENTRY_COLUMNS =
  'id, title, date, category, specialty_tags, interview_themes, notes, refl_free_text, created_at, updated_at'

export type ShareScopeLink = {
  user_id: string
  scope: string
  specialty_key: string | null
  theme_slug: string | null
}

type Row = Record<string, unknown> & { id: string; date: string | null }

const ID_CHUNK = 100

export async function fetchSharedEntries(
  supabase: SupabaseClient,
  link: ShareScopeLink,
): Promise<{ data: Row[] | null; error: PostgrestError | null }> {
  const base = () => supabase
    .from('portfolio_entries')
    .select(SHARED_ENTRY_COLUMNS)
    .eq('user_id', link.user_id)
    .is('deleted_at', null)
    .eq('is_demo', false)

  if (link.scope === 'theme' && link.theme_slug) {
    const { data, error } = await base().contains('interview_themes', [link.theme_slug]).order('date', { ascending: false })
    return { data: (data ?? null) as Row[] | null, error }
  }

  if (link.scope !== 'specialty' || !link.specialty_key) {
    const { data, error } = await base().order('date', { ascending: false })
    return { data: (data ?? null) as Row[] | null, error }
  }

  const { data: tagged, error: taggedError } = await base().contains('specialty_tags', [link.specialty_key])
  if (taggedError) return { data: null, error: taggedError }

  const { data: apps, error: appsError } = await supabase
    .from('specialty_applications')
    .select('id')
    .eq('user_id', link.user_id)
    .eq('specialty_key', link.specialty_key)
    .eq('is_active', true)
  if (appsError) return { data: null, error: appsError }

  const byId = new Map<string, Row>()
  for (const row of (tagged ?? []) as Row[]) byId.set(row.id, row)

  const appIds = (apps ?? []).map(app => app.id as string)
  if (appIds.length > 0) {
    const { data: links, error: linksError } = await supabase
      .from('specialty_entry_links')
      .select('entry_id')
      .in('application_id', appIds)
      .eq('entry_type', 'portfolio')
      .not('entry_id', 'is', null)
    if (linksError) return { data: null, error: linksError }

    const linkedIds = Array.from(new Set((links ?? []).map(l => l.entry_id as string))).filter(id => !byId.has(id))
    for (let i = 0; i < linkedIds.length; i += ID_CHUNK) {
      const { data: linked, error: linkedError } = await base().in('id', linkedIds.slice(i, i + ID_CHUNK))
      if (linkedError) return { data: null, error: linkedError }
      for (const row of (linked ?? []) as Row[]) byId.set(row.id, row)
    }
  }

  const rows = Array.from(byId.values()).sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
  return { data: rows, error: null }
}
