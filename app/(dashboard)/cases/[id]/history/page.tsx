import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RestoreVersionButton from '@/components/history/restore-version-button'
import { formatCompetencyTheme } from '@/lib/types/portfolio-labels'
import { formatSpecialtyLabel } from '@/lib/specialties'

type Revision = {
  id: string
  snapshot: Record<string, unknown>
  created_at: string
}
const SUMMARY_FIELDS = ['title', 'date', 'clinical_domains', 'specialty_tags', 'interview_themes', 'notes']
const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  date: 'Date',
  clinical_domains: 'Clinical areas',
  specialty_tags: 'Linked specialties',
  interview_themes: 'Competency themes',
  notes: 'Notes',
}

function formatValue(field: string, value: unknown) {
  if (field === 'specialty_tags' && Array.isArray(value)) {
    return value.map(item => formatSpecialtyLabel(String(item))).join(', ') || 'empty'
  }
  if (field === 'interview_themes' && Array.isArray(value)) {
    return value.map(item => formatCompetencyTheme(String(item))).join(', ') || 'empty'
  }
  if (Array.isArray(value)) return value.join(', ') || 'empty'
  if (value === null || value === undefined || value === '') return 'empty'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  return String(value)
}

function changedFields(current: Record<string, unknown>, previous?: Record<string, unknown>) {
  if (!previous) return ['Original saved version']
  return SUMMARY_FIELDS.filter(key => JSON.stringify(current[key]) !== JSON.stringify(previous[key]))
}

export default async function CaseHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: c }, { data }] = await Promise.all([
    supabase
      .from('cases')
      .select('id')
      .eq('id', id)
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('entry_revisions')
      .select('id, snapshot, created_at')
      .eq('user_id', user!.id)
      .eq('entry_id', id)
      .eq('entry_type', 'case')
      .order('created_at', { ascending: false }),
  ])

  if (!c) notFound()

  const revisions = (data ?? []) as Revision[]

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8">
      <Link href={`/cases/${id}`} className="text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2]">Back to case</Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#F5F5F2]">Version history</h1>
      <p className="mt-1 text-sm text-[rgba(245,245,242,0.45)]">Restore any saved version. Your current version is saved before restore.</p>

      <div className="mt-6 space-y-3">
        {revisions.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6 text-sm text-[rgba(245,245,242,0.45)]">No saved revisions yet.</p>
        ) : revisions.map((revision, index) => {
          const previous = revisions[index + 1]?.snapshot
          const changed = changedFields(revision.snapshot, previous)
          const changedLabels = changed.map(field => FIELD_LABELS[field] ?? field)
          return (
            <article key={revision.id} className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#F5F5F2]">{new Date(revision.created_at).toLocaleString('en-GB')}</p>
                  <p className="mt-1 text-xs text-[rgba(245,245,242,0.4)]">{changedLabels.slice(0, 4).join(', ')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {revisions[index + 1] && (
                    <Link href={`/cases/${id}/history/diff?a=${revisions[index + 1].id}&b=${revision.id}`} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-[rgba(245,245,242,0.72)]">
                      Diff
                    </Link>
                  )}
                  <RestoreVersionButton revisionId={revision.id} entryType="case" entryPath={`/cases/${id}`} />
                </div>
              </div>
              <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                {SUMMARY_FIELDS.map(field => (
                  <div key={field} className="rounded-lg bg-[#0B0B0C] p-3">
                    <dt className="text-[10px] font-medium uppercase tracking-wider text-[rgba(245,245,242,0.55)]">{FIELD_LABELS[field] ?? field}</dt>
                    <dd className="mt-1 line-clamp-3 text-xs text-[rgba(245,245,242,0.62)]">{formatValue(field, revision.snapshot[field])}</dd>
                  </div>
                ))}
              </dl>
            </article>
          )
        })}
      </div>
    </div>
  )
}
