import type { createClient } from '@/lib/supabase/server'

type SupabaseClient = ReturnType<typeof createClient>

type PortfolioEntryLink = {
  entry_id: string | null
  entry_type: string | null
}

export async function filterLinksToActivePortfolioEntries<T extends PortfolioEntryLink>(
  supabase: SupabaseClient,
  links: T[]
): Promise<T[]> {
  const portfolioEntryIds = Array.from(new Set(
    links
      .filter(link => link.entry_type === 'portfolio' && link.entry_id)
      .map(link => link.entry_id as string)
  ))

  if (portfolioEntryIds.length === 0) {
    return links.filter(link => link.entry_id == null)
  }

  const { data, error } = await supabase
    .from('portfolio_entries')
    .select('id')
    .in('id', portfolioEntryIds)
    .is('deleted_at', null)

  if (error) {
    return links.filter(link => link.entry_id == null)
  }

  const activeEntryIds = new Set((data ?? []).map(entry => entry.id))
  return links.filter(link => {
    if (link.entry_id == null) return true
    return link.entry_type === 'portfolio' && activeEntryIds.has(link.entry_id)
  })
}
