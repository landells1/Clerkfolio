import Link from 'next/link'
import { type Case } from '@/lib/types/cases'
import { relativeDate } from '@/lib/utils/dates'
import { getSpecialtyConfig } from '@/lib/specialties'

export default function CaseCard({ c }: { c: Case }) {
  return (
    <Link
      href={`/cases/${c.id}`}
      className="block bg-[#141416] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] hover:bg-[#1B1B1E] transition-all group animate-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {c.pinned && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-[rgba(245,245,242,0.3)] shrink-0" aria-label="Pinned">
                <path d="M12 2a1 1 0 0 1 .707.293l9 9a1 1 0 0 1-1.414 1.414L19 11.414V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7.586l-1.293 1.293a1 1 0 0 1-1.414-1.414l9-9A1 1 0 0 1 12 2z" />
              </svg>
            )}
            {c.clinical_domain && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                {c.clinical_domain}
              </span>
            )}
            {c.specialty_tags.slice(0, 2).map(tag => (
              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#1B6FD9]/10 text-[#1B6FD9] border border-[#1B6FD9]/20">
                {getSpecialtyConfig(tag)?.name ?? tag}
              </span>
            ))}
            {c.specialty_tags.length > 2 && (
              <span className="text-[10px] text-[rgba(245,245,242,0.35)]">+{c.specialty_tags.length - 2}</span>
            )}
          </div>
          <h3 className="text-sm font-medium text-[#F5F5F2] truncate group-hover:text-white transition-colors">
            {c.title}
          </h3>
          {c.notes && (
            <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5 truncate">{c.notes}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-[rgba(245,245,242,0.35)] font-mono" title={c.date}>{relativeDate(c.date)}</p>
          <svg className="w-4 h-4 text-[rgba(245,245,242,0.2)] group-hover:text-[rgba(245,245,242,0.5)] transition-colors mt-1 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
