import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'
import { formatSpecialtyLabel } from '@/lib/specialties'

// Showcase is a permanent public page - anyone with the slug can read it.
// Free-text notes routinely contain clinical reflections, supervisor names,
// and informal context that the user typed assuming it was private. Do NOT
// expose notes here. If a user needs richer disclosure they can issue a
// per-recipient share_link with hide_notes=false.
type Entry = {
  id: string
  title: string
  category: Category
  date: string
  specialty_tags: string[] | null
}

function categoryLabel(category: Category) {
  return CATEGORIES.find(item => item.value === category)?.label ?? category
}

function dedupeEntries(entries: Entry[]) {
  const seen = new Set<string>()
  return entries.filter(entry => {
    const key = `${entry.category}|${entry.date}|${entry.title.trim().toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default async function ShowcasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, public_slug, public_showcase_enabled')
    .eq('public_slug', slug)
    .eq('public_showcase_enabled', true)
    .maybeSingle()

  if (!profile) notFound()

  const { data: entries } = await supabase
    .from('portfolio_entries')
    .select('id, title, category, date, specialty_tags')
    .eq('user_id', profile.id)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  const ownerName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Clerkfolio user'
  const visibleEntries = dedupeEntries((entries ?? []) as Entry[])

  return (
    <main className="min-h-screen bg-[#0B0B0C] text-[#F5F5F2]">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8 border-b border-white/[0.08] pb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[#1B6FD9]">Clerkfolio showcase</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{ownerName}</h1>
          <p className="mt-1 text-sm text-[rgba(245,245,242,0.45)]">{visibleEntries.length} portfolio entries</p>
        </header>

        {visibleEntries.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-8 text-sm text-[rgba(245,245,242,0.55)]">
            No public portfolio entries have been added to this showcase yet.
          </div>
        ) : (
        <div className="space-y-4">
          {visibleEntries.map(entry => (
            <article key={entry.id} className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[rgba(245,245,242,0.55)]">{categoryLabel(entry.category)}</p>
                  <h2 className="mt-1 text-lg font-semibold">{entry.title}</h2>
                </div>
                <time className="text-xs text-[rgba(245,245,242,0.55)]">{new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
              </div>
              {entry.specialty_tags?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.specialty_tags.map(tag => (
                    <span key={tag} className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-[rgba(245,245,242,0.55)]">
                      {formatSpecialtyLabel(tag)}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
        )}
      </div>
    </main>
  )
}
