import { createClient } from '@/lib/supabase/server'
import EntryForm from '@/components/portfolio/entry-form'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'
import type { Template } from '@/lib/types/templates'
import Link from 'next/link'

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; title?: string; text?: string; url?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: trackedSpecialties }, { data: rawTemplates }] = await Promise.all([
    supabase
      .from('specialty_applications')
      .select('specialty_key')
      .eq('user_id', user!.id),
    supabase
      .from('templates')
      .select('*')
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order('is_curated', { ascending: false })
      .order('created_at', { ascending: true }),
  ])

  const specialtyKeys = trackedSpecialties?.map(s => s.specialty_key) ?? []
  const templates = (rawTemplates ?? []) as Template[]
  const requestedCategory = resolvedSearchParams.category
  const sharedTitle = resolvedSearchParams.title?.slice(0, 200).trim() ?? ''
  const sharedNotes = [resolvedSearchParams.text, resolvedSearchParams.url].filter(Boolean).join('\n\n').trim()
  const defaultCategory = CATEGORIES.some(category => category.value === requestedCategory)
    ? requestedCategory as Category
    : sharedTitle || sharedNotes ? 'custom' : undefined

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/portfolio"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">New entry</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Log a new portfolio achievement</p>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6">
        <EntryForm
          mode="create"
          defaultCategory={defaultCategory}
          initialData={sharedTitle || sharedNotes ? {
            category: defaultCategory,
            title: sharedTitle || 'Shared item',
            notes: sharedNotes || null,
            custom_free_text: sharedNotes || null,
          } : undefined}
          userInterests={specialtyKeys}
          templates={templates}
          authenticatedUserId={user!.id}
        />
      </div>
    </div>
  )
}
