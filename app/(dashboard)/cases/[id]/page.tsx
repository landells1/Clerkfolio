import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { IMPORTANCE_LABELS, isImportance } from '@/lib/types/importance'
import DeleteCaseButton from '@/components/cases/delete-case-button'
import LogSimilarButton from '@/components/cases/log-similar-button'
import DuplicateCaseButton from '@/components/cases/duplicate-case-button'
import SaveCaseTemplateButton from '@/components/cases/save-case-template-button'
import PinButton from '@/components/ui/pin-button'
import EvidenceFiles from '@/components/shared/evidence-files'
import MarkdownRenderer from '@/components/ui/markdown-renderer'
import { fetchEvidenceForEntry } from '@/lib/evidence/server'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ uploaded?: string }>
}) {
  const { id } = await params
  const { uploaded } = await searchParams
  const uploadedCount = uploaded ? Number(uploaded) : 0
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: c }, evidenceFiles] = await Promise.all([
    supabase
      .from('cases')
      .select('*')
      .eq('id', id)
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .single(),
    fetchEvidenceForEntry(supabase, id, 'case'),
  ])

  if (!c) notFound()

  const importance = c.importance

  return (
    <div className="p-8 max-w-2xl">
      {/* Back + actions */}
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/cases" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          {(c.clinical_domains?.length ? c.clinical_domains : c.clinical_domain ? [c.clinical_domain] : []).map((domain: string) => (
            <span key={domain} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
              {domain}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LogSimilarButton
            domains={c.clinical_domains?.length ? c.clinical_domains : c.clinical_domain ? [c.clinical_domain] : []}
            tags={c.specialty_tags}
          />
          <Link
            href={`/cases/${c.id}/edit`}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] border border-white/[0.08] rounded-lg hover:text-[var(--text-primary)] hover:border-white/[0.15] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </Link>
          <SaveCaseTemplateButton caseData={c} />
          <DuplicateCaseButton caseId={c.id} />
          <PinButton table="cases" id={c.id} initialPinned={c.pinned ?? false} noun="case" />
          <DeleteCaseButton id={c.id} />
        </div>
      </div>

      {uploadedCount > 0 && (
        <div role="status" className="mb-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-[var(--success)]">
          {uploadedCount} evidence file{uploadedCount === 1 ? '' : 's'} uploaded successfully - listed below.
        </div>
      )}

      <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 space-y-6">
        {/* Title + date */}
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight mb-1">{c.title}</h1>
          <p className="text-sm text-[var(--text-muted)] font-mono">{formatDate(c.date)}</p>
        </div>

        {/* Linked specialties */}
        {c.specialty_tags?.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-[var(--text-emphasis)] uppercase tracking-wider mb-2">Linked specialties</p>
            <div className="flex flex-wrap gap-1.5">
              {c.specialty_tags.map((tag: string) => (
                <span key={tag} className="px-2.5 py-1 rounded-lg text-xs bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border border-accent/30">
                  {formatSpecialtyLabel(tag)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Importance */}
        {isImportance(importance) && (
          <div>
            <p className="text-[10px] font-medium text-[var(--text-emphasis)] uppercase tracking-wider mb-2">Importance</p>
            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs bg-[var(--bg-overlay-soft)] text-[var(--text-primary)] border border-white/[0.08]">
              {IMPORTANCE_LABELS[importance]}
            </span>
          </div>
        )}

        {/* Notes */}
        {c.notes && (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-medium text-[var(--text-emphasis)] uppercase tracking-wider mb-3">Notes</p>
            <MarkdownRenderer value={c.notes} />
          </div>
        )}

        {/* Evidence files */}
        {evidenceFiles.length > 0 && (
          <div className="border-t border-white/[0.06] pt-5">
            <EvidenceFiles initialFiles={evidenceFiles} canDelete entryId={id} entryType="case" />
          </div>
        )}

        {/* Metadata */}
        <div className="border-t border-white/[0.06] pt-4 flex justify-between text-[10px] text-[var(--text-secondary)] font-mono">
          <span>Added {formatDate(c.created_at)}</span>
          <span>Updated {formatDate(c.updated_at)}</span>
        </div>
      </div>
    </div>
  )
}
