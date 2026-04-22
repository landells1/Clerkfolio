import Link from 'next/link'
import { type Case } from '@/lib/types/cases'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CaseCard({ c }: { c: Case }) {
  return (
    <Link
      href={`/cases/${c.id}`}
      className="block bg-[#141416] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] hover:bg-[#1B1B1E] transition-all group animate-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {c.clinical_domain && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                {c.clinical_domain}
              </span>
            )}
            {c.specialty_tags.slice(0, 2).map(tag => (
              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20">
                {tag}
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
          <p className="text-xs text-[rgba(245,245,242,0.35)] font-mono">{formatDate(c.date)}</p>
          <svg className="w-4 h-4 text-[rgba(245,245,242,0.2)] group-hover:text-[rgba(245,245,242,0.5)] transition-colors mt-1 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
