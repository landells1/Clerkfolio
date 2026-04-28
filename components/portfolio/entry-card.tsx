import Link from 'next/link'
import { type PortfolioEntry, CATEGORIES, CATEGORY_COLOURS } from '@/lib/types/portfolio'
import { relativeDate } from '@/lib/utils/dates'
import { getSpecialtyConfig } from '@/lib/specialties'
import { calculateCompleteness, missingCompletenessFields } from '@/lib/utils/completeness'

function formatTag(tag: string): string {
  const config = getSpecialtyConfig(tag)
  return config ? config.name : tag
}

function entrySubtitle(entry: PortfolioEntry): string | null {
  switch (entry.category) {
    case 'audit_qip': return [entry.audit_type?.toUpperCase(), entry.audit_trust].filter(Boolean).join(' - ')
    case 'teaching': return [entry.teaching_type?.replace('_', ' '), entry.teaching_setting].filter(Boolean).join(' - ')
    case 'conference': return [entry.conf_event_name, entry.conf_attendance].filter(Boolean).join(' - ')
    case 'publication': return [entry.pub_type?.replace('_', ' '), entry.pub_status].filter(Boolean).join(' - ')
    case 'leadership': return [entry.leader_role, entry.leader_organisation].filter(Boolean).join(' - ')
    case 'prize': return [entry.prize_body, entry.prize_level].filter(Boolean).join(' - ')
    case 'procedure': return [entry.proc_name, entry.proc_supervision].filter(Boolean).join(' - ')
    case 'reflection': return entry.refl_type?.replace('_', '-').toUpperCase() ?? null
    default: return null
  }
}

export default function EntryCard({ entry }: { entry: PortfolioEntry & { has_evidence?: boolean } }) {
  const catMeta = CATEGORIES.find(c => c.value === entry.category)
  const colours = CATEGORY_COLOURS[entry.category]
  const subtitle = entrySubtitle(entry)
  const completeness = calculateCompleteness(entry, 'portfolio')
  const missing = missingCompletenessFields(entry, 'portfolio')

  return (
    <Link
      href={`/portfolio/${entry.id}`}
      className="block bg-[#141416] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] hover:bg-[#1B1B1E] transition-all group animate-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {entry.pinned && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-[rgba(245,245,242,0.3)] shrink-0" aria-label="Pinned">
                <path d="M12 2a1 1 0 0 1 .707.293l9 9a1 1 0 0 1-1.414 1.414L19 11.414V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7.586l-1.293 1.293a1 1 0 0 1-1.414-1.414l9-9A1 1 0 0 1 12 2z" />
              </svg>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${colours.badge}`}>
              {catMeta?.short}
            </span>
            {entry.specialty_tags.slice(0, 2).map(tag => (
              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#1B6FD9]/10 text-[#1B6FD9] border border-[#1B6FD9]/20">
                {formatTag(tag)}
              </span>
            ))}
            {entry.specialty_tags.length > 2 && (
              <span className="text-[10px] text-[rgba(245,245,242,0.35)]">+{entry.specialty_tags.length - 2}</span>
            )}
          </div>
          <h3 className="text-sm font-medium text-[#F5F5F2] truncate group-hover:text-white transition-colors">{entry.title}</h3>
          {subtitle && <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5 truncate capitalize">{subtitle}</p>}
        </div>
        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
          <p className="text-xs text-[rgba(245,245,242,0.35)] font-mono" title={entry.date}>{relativeDate(entry.date)}</p>
          <div className="flex items-center gap-1.5">
            <span
              title={missing.length === 0 ? 'Complete' : `Missing: ${missing.join(', ')}`}
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${completeness === 'green' ? 'bg-emerald-400' : completeness === 'amber' ? 'bg-amber-400' : 'bg-red-400'}`}
            />
            <svg className="w-4 h-4 text-[rgba(245,245,242,0.2)] group-hover:text-[rgba(245,245,242,0.5)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
}
