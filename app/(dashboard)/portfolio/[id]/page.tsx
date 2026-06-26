import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, CATEGORY_COLOURS } from '@/lib/types/portfolio'
import {
  AUDIT_TYPE_LABELS, AUDIT_CYCLE_STAGE_LABELS,
  TEACHING_TYPE_LABELS, TEACHING_AUDIENCE_LABELS,
  CONF_TYPE_LABELS, CONF_ATTENDANCE_LABELS, LEVEL_LABELS,
  PUB_TYPE_LABELS, PUB_STATUS_LABELS,
  PROC_SUPERVISION_LABELS,
  REFL_TYPE_LABELS, REFL_FRAMEWORK_LABELS,
  formatCompetencyTheme,
  titleCase,
} from '@/lib/types/portfolio-labels'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { IMPORTANCE_LABELS, isImportance } from '@/lib/types/importance'
import DeleteEntryButton from '@/components/portfolio/delete-entry-button'
import LogSimilarButton from '@/components/portfolio/log-similar-button'
import DuplicateEntryButton from '@/components/portfolio/duplicate-entry-button'
import PinButton from '@/components/ui/pin-button'
import SaveTemplateButton from '@/components/portfolio/save-template-button'
import EvidenceFiles from '@/components/shared/evidence-files'
import MarkdownRenderer from '@/components/ui/markdown-renderer'

function formatTag(tag: string): string {
  return formatSpecialtyLabel(tag)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function DetailRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wider">{label}</span>
      <span className="text-sm text-[rgba(245,245,242,0.8)]">{display}</span>
    </div>
  )
}

export default async function EntryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ upload?: string; uploaded?: string }>
}) {
  const { id } = await params
  const { upload, uploaded } = await searchParams
  const uploadedCount = uploaded ? Number(uploaded) : 0
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: entry }, { data: evidenceFiles, error: evidenceError }] = await Promise.all([
    supabase
      .from('portfolio_entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('evidence_files')
      .select('*')
      .eq('entry_id', id)
      .eq('entry_type', 'portfolio')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true }),
  ])

  if (!entry) notFound()

  const importance = entry.importance
  const catMeta = CATEGORIES.find(c => c.value === entry.category)
  const colours = CATEGORY_COLOURS[entry.category as keyof typeof CATEGORY_COLOURS]

  return (
    <div className="p-8 max-w-2xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/portfolio" className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${colours.badge}`}>
            {catMeta?.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LogSimilarButton category={entry.category} tags={entry.specialty_tags} />
          <Link
            href={`/portfolio/${entry.id}/edit`}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[rgba(245,245,242,0.6)] border border-white/[0.08] rounded-lg hover:text-[#F5F5F2] hover:border-white/[0.15] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </Link>
          <SaveTemplateButton entry={entry} />
          <DuplicateEntryButton entryId={entry.id} />
          <PinButton table="portfolio_entries" id={entry.id} initialPinned={entry.pinned ?? false} noun="entry" />
          <DeleteEntryButton id={entry.id} />
        </div>
      </div>

      {upload === 'failed' && (
        <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
          This entry was saved, but one or more evidence files could not be uploaded. Use Edit to retry the upload.
        </div>
      )}

      {uploadedCount > 0 && (
        <div role="status" className="mb-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {uploadedCount} evidence file{uploadedCount === 1 ? '' : 's'} uploaded successfully — listed below.
        </div>
      )}

      {/* Main card */}
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 space-y-6">
        {/* Title + date */}
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F2] tracking-tight mb-1">{entry.title}</h1>
          <p className="text-sm text-[rgba(245,245,242,0.4)] font-mono">{formatDate(entry.date)}</p>
        </div>

        {/* Linked specialties */}
        {entry.specialty_tags?.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wider mb-2">Linked specialties</p>
            <div className="flex flex-wrap gap-1.5">
              {entry.specialty_tags.map((tag: string) => (
                <span key={tag} className="px-2.5 py-1 rounded-lg text-xs bg-[#1B6FD9]/10 text-[#1B6FD9] border border-[#1B6FD9]/20">
                  {formatTag(tag)}
                </span>
              ))}
            </div>
          </div>
        )}

        {isImportance(importance) && (
          <div>
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wider mb-2">Importance</p>
            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs bg-[rgba(245,245,242,0.06)] text-[rgba(245,245,242,0.8)] border border-white/[0.08]">
              {IMPORTANCE_LABELS[importance]}
            </span>
          </div>
        )}

        {(entry.interview_themes ?? []).length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wider mb-2">Competency themes</p>
            <div className="flex flex-wrap gap-1.5">
              {(entry.interview_themes as string[]).map(theme => (
                <span key={theme} className="px-2.5 py-1 rounded-lg text-xs bg-violet-500/10 text-violet-300 border border-violet-400/20">
                  {formatCompetencyTheme(theme)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Category-specific fields */}
        <div className="border-t border-white/[0.06] pt-5">
          <p className="text-[10px] font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wider mb-4">Details</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {entry.category === 'audit_qip' && <>
              <DetailRow label="Type" value={entry.audit_type ? AUDIT_TYPE_LABELS[entry.audit_type] ?? entry.audit_type : null} />
              <DetailRow label="Role" value={entry.audit_role} />
              <DetailRow label="Trust / hospital" value={entry.audit_trust} />
              <DetailRow label="Cycle stage" value={entry.audit_cycle_stage ? AUDIT_CYCLE_STAGE_LABELS[entry.audit_cycle_stage] ?? titleCase(entry.audit_cycle_stage) : null} />
              <DetailRow label="Presented" value={entry.audit_presented} />
            </>}
            {entry.category === 'teaching' && <>
              <DetailRow label="Type" value={entry.teaching_type ? TEACHING_TYPE_LABELS[entry.teaching_type] ?? titleCase(entry.teaching_type) : null} />
              <DetailRow label="Audience" value={entry.teaching_audience ? TEACHING_AUDIENCE_LABELS[entry.teaching_audience] ?? entry.teaching_audience : null} />
              <DetailRow label="Setting" value={entry.teaching_setting ? LEVEL_LABELS[entry.teaching_setting] ?? entry.teaching_setting : null} />
              <DetailRow label="Event" value={entry.teaching_event} />
              <DetailRow label="Invited" value={entry.teaching_invited} />
            </>}
            {entry.category === 'conference' && <>
              <DetailRow label="Type" value={entry.conf_type ? CONF_TYPE_LABELS[entry.conf_type] ?? entry.conf_type : null} />
              <DetailRow label="Event" value={entry.conf_event_name} />
              <DetailRow label="Attendance" value={entry.conf_attendance ? CONF_ATTENDANCE_LABELS[entry.conf_attendance] ?? entry.conf_attendance : null} />
              <DetailRow label="Level" value={entry.conf_level ? LEVEL_LABELS[entry.conf_level] ?? entry.conf_level : null} />
              <DetailRow label="CPD hours" value={entry.conf_cpd_hours} />
              <DetailRow label="Certificate" value={entry.conf_certificate} />
            </>}
            {entry.category === 'publication' && <>
              <DetailRow label="Type" value={entry.pub_type ? PUB_TYPE_LABELS[entry.pub_type] ?? titleCase(entry.pub_type) : null} />
              <DetailRow label="Status" value={entry.pub_status ? PUB_STATUS_LABELS[entry.pub_status] ?? entry.pub_status : null} />
              <DetailRow label="Journal" value={entry.pub_journal} />
              <DetailRow label="Authors" value={entry.pub_authors} />
              <DetailRow label="DOI / link" value={entry.pub_doi} />
            </>}
            {entry.category === 'leadership' && <>
              <DetailRow label="Role" value={entry.leader_role} />
              <DetailRow label="Organisation" value={entry.leader_organisation} />
              <DetailRow label="Start date" value={entry.leader_start_date ? formatDate(entry.leader_start_date) : null} />
              <DetailRow label="End date" value={entry.leader_ongoing ? 'Ongoing' : (entry.leader_end_date ? formatDate(entry.leader_end_date) : null)} />
            </>}
            {entry.category === 'prize' && <>
              <DetailRow label="Awarding body" value={entry.prize_body} />
              <DetailRow label="Level" value={entry.prize_level ? LEVEL_LABELS[entry.prize_level] ?? entry.prize_level : null} />
            </>}
            {entry.category === 'procedure' && <>
              <DetailRow label="Procedure" value={entry.proc_name} />
              <DetailRow label="Setting" value={entry.proc_setting} />
              <DetailRow label="Supervision" value={entry.proc_supervision ? PROC_SUPERVISION_LABELS[entry.proc_supervision] ?? entry.proc_supervision : null} />
              <DetailRow label="Count" value={entry.proc_count} />
            </>}
            {entry.category === 'reflection' && <>
              <DetailRow label="Type" value={entry.refl_type ? REFL_TYPE_LABELS[entry.refl_type] ?? entry.refl_type.toUpperCase() : null} />
              <DetailRow label="Framework" value={entry.refl_framework ? REFL_FRAMEWORK_LABELS[entry.refl_framework] ?? entry.refl_framework : null} />
              <DetailRow label="Supervisor" value={entry.refl_supervisor} />
              <DetailRow label="Clinical context" value={entry.refl_clinical_context} />
            </>}
          </div>
        </div>

        {/* Long-form text fields */}
        {entry.category === 'audit_qip' && entry.audit_outcome && (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wider mb-2">Outcome</p>
            <MarkdownRenderer value={entry.audit_outcome} />
          </div>
        )}
        {entry.category === 'prize' && entry.prize_description && (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wider mb-2">Description</p>
            <MarkdownRenderer value={entry.prize_description} />
          </div>
        )}
        {entry.category === 'reflection' && entry.refl_free_text && (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wider mb-2">Reflection</p>
            <MarkdownRenderer value={entry.refl_free_text} />
          </div>
        )}
        {entry.category === 'custom' && entry.custom_free_text && (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wider mb-2">Description</p>
            <MarkdownRenderer value={entry.custom_free_text} />
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wider mb-2">Notes</p>
            <MarkdownRenderer value={entry.notes} />
          </div>
        )}

        {/* Evidence files */}
        {evidenceError ? (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-xs text-red-400">Could not load attachments. Try refreshing the page.</p>
          </div>
        ) : evidenceFiles && evidenceFiles.length > 0 ? (
          <div className="border-t border-white/[0.06] pt-5">
            <EvidenceFiles initialFiles={evidenceFiles} canDelete={true} />
          </div>
        ) : null}

        {/* Metadata */}
        <div className="border-t border-white/[0.06] pt-4 flex justify-between text-[10px] text-[rgba(245,245,242,0.55)] font-mono">
          <span>Added {formatDate(entry.created_at)}</span>
          <span>Updated {formatDate(entry.updated_at)}</span>
        </div>
      </div>
    </div>
  )
}
