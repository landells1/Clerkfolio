import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, CATEGORY_COLOURS } from '@/lib/types/portfolio'
import DeleteEntryButton from '@/components/portfolio/delete-entry-button'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function DetailRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider">{label}</span>
      <span className="text-sm text-[rgba(245,245,242,0.8)] capitalize">{display.replace(/_/g, ' ')}</span>
    </div>
  )
}

export default async function EntryDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: entry } = await supabase
    .from('portfolio_entries')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .single()

  if (!entry) notFound()

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
          <DeleteEntryButton id={entry.id} />
        </div>
      </div>

      {/* Main card */}
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 space-y-6">
        {/* Title + date */}
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F2] tracking-tight mb-1">{entry.title}</h1>
          <p className="text-sm text-[rgba(245,245,242,0.4)] font-mono">{formatDate(entry.date)}</p>
        </div>

        {/* Specialty tags */}
        {entry.specialty_tags?.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-2">Specialty tags</p>
            <div className="flex flex-wrap gap-1.5">
              {entry.specialty_tags.map((tag: string) => (
                <span key={tag} className="px-2.5 py-1 rounded-lg text-xs bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Category-specific fields */}
        <div className="border-t border-white/[0.06] pt-5">
          <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-4">Details</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {entry.category === 'audit_qip' && <>
              <DetailRow label="Type" value={entry.audit_type} />
              <DetailRow label="Role" value={entry.audit_role} />
              <DetailRow label="Trust / hospital" value={entry.audit_trust} />
              <DetailRow label="Cycle stage" value={entry.audit_cycle_stage?.replace('_', ' ')} />
              <DetailRow label="Presented" value={entry.audit_presented} />
            </>}
            {entry.category === 'teaching' && <>
              <DetailRow label="Type" value={entry.teaching_type?.replace('_', ' ')} />
              <DetailRow label="Audience" value={entry.teaching_audience} />
              <DetailRow label="Setting" value={entry.teaching_setting} />
              <DetailRow label="Event" value={entry.teaching_event} />
              <DetailRow label="Invited" value={entry.teaching_invited} />
            </>}
            {entry.category === 'conference' && <>
              <DetailRow label="Type" value={entry.conf_type} />
              <DetailRow label="Event" value={entry.conf_event_name} />
              <DetailRow label="Attendance" value={entry.conf_attendance} />
              <DetailRow label="Level" value={entry.conf_level} />
              <DetailRow label="CPD hours" value={entry.conf_cpd_hours} />
              <DetailRow label="Certificate" value={entry.conf_certificate} />
            </>}
            {entry.category === 'publication' && <>
              <DetailRow label="Type" value={entry.pub_type?.replace('_', ' ')} />
              <DetailRow label="Status" value={entry.pub_status} />
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
              <DetailRow label="Level" value={entry.prize_level} />
            </>}
            {entry.category === 'procedure' && <>
              <DetailRow label="Procedure" value={entry.proc_name} />
              <DetailRow label="Setting" value={entry.proc_setting} />
              <DetailRow label="Supervision" value={entry.proc_supervision} />
              <DetailRow label="Count" value={entry.proc_count} />
            </>}
            {entry.category === 'reflection' && <>
              <DetailRow label="Type" value={entry.refl_type?.replace('_', '-').toUpperCase()} />
              <DetailRow label="Supervisor" value={entry.refl_supervisor} />
              <DetailRow label="Clinical context" value={entry.refl_clinical_context} />
            </>}
          </div>
        </div>

        {/* Long-form text fields */}
        {entry.category === 'audit_qip' && entry.audit_outcome && (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-2">Outcome</p>
            <p className="text-sm text-[rgba(245,245,242,0.7)] leading-relaxed whitespace-pre-wrap">{entry.audit_outcome}</p>
          </div>
        )}
        {entry.category === 'prize' && entry.prize_description && (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-[rgba(245,245,242,0.7)] leading-relaxed whitespace-pre-wrap">{entry.prize_description}</p>
          </div>
        )}
        {entry.category === 'reflection' && entry.refl_free_text && (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-2">Reflection</p>
            <p className="text-sm text-[rgba(245,245,242,0.7)] leading-relaxed whitespace-pre-wrap">{entry.refl_free_text}</p>
          </div>
        )}
        {entry.category === 'custom' && entry.custom_free_text && (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-[rgba(245,245,242,0.7)] leading-relaxed whitespace-pre-wrap">{entry.custom_free_text}</p>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-[rgba(245,245,242,0.7)] leading-relaxed whitespace-pre-wrap">{entry.notes}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="border-t border-white/[0.06] pt-4 flex justify-between text-[10px] text-[rgba(245,245,242,0.25)] font-mono">
          <span>Added {formatDate(entry.created_at)}</span>
          <span>Updated {formatDate(entry.updated_at)}</span>
        </div>
      </div>
    </div>
  )
}
