import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSpecialtyConfig } from '@/lib/specialties'
import DeleteCaseButton from '@/components/cases/delete-case-button'
import LogSimilarButton from '@/components/cases/log-similar-button'
import DuplicateCaseButton from '@/components/cases/duplicate-case-button'
import PinCaseButton from '@/components/cases/pin-case-button'
import EvidenceFiles from '@/components/shared/evidence-files'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: c }, { data: evidenceFiles }] = await Promise.all([
    supabase
      .from('cases')
      .select('*')
      .eq('id', id)
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('evidence_files')
      .select('*')
      .eq('entry_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!c) notFound()

  return (
    <div className="p-8 max-w-2xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/cases" className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
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
        <div className="flex items-center gap-2">
          <LogSimilarButton
            domains={c.clinical_domains?.length ? c.clinical_domains : c.clinical_domain ? [c.clinical_domain] : []}
            tags={c.specialty_tags}
          />
          <Link
            href={`/cases/${c.id}/edit`}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[rgba(245,245,242,0.6)] border border-white/[0.08] rounded-lg hover:text-[#F5F5F2] hover:border-white/[0.15] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </Link>
          <Link
            href={`/cases/${c.id}/history`}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[rgba(245,245,242,0.6)] border border-white/[0.08] rounded-lg hover:text-[#F5F5F2] hover:border-white/[0.15] transition-colors"
          >
            History
          </Link>
          <DuplicateCaseButton caseId={c.id} />
          <PinCaseButton caseId={c.id} initialPinned={c.pinned ?? false} />
          <DeleteCaseButton id={c.id} />
        </div>
      </div>

      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 space-y-6">
        {/* Title + date */}
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F2] tracking-tight mb-1">{c.title}</h1>
          <p className="text-sm text-[rgba(245,245,242,0.4)] font-mono">{formatDate(c.date)}</p>
        </div>

        {/* Specialty tags */}
        {c.specialty_tags?.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-2">Application tags</p>
            <div className="flex flex-wrap gap-1.5">
              {c.specialty_tags.map((tag: string) => (
                <span key={tag} className="px-2.5 py-1 rounded-lg text-xs bg-[#1B6FD9]/10 text-[#1B6FD9] border border-[#1B6FD9]/20">
                  {getSpecialtyConfig(tag)?.name ?? tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {c.notes && (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-3">Notes</p>
            <p className="text-sm text-[rgba(245,245,242,0.75)] leading-relaxed whitespace-pre-wrap">{c.notes}</p>
          </div>
        )}

        {/* Evidence files */}
        {evidenceFiles && evidenceFiles.length > 0 && (
          <div className="border-t border-white/[0.06] pt-5">
            <EvidenceFiles initialFiles={evidenceFiles} canDelete={true} />
          </div>
        )}

        {/* Metadata */}
        <div className="border-t border-white/[0.06] pt-4 flex justify-between text-[10px] text-[rgba(245,245,242,0.25)] font-mono">
          <span>Added {formatDate(c.created_at)}</span>
          <span>Updated {formatDate(c.updated_at)}</span>
        </div>
      </div>
    </div>
  )
}
