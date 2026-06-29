import Link from 'next/link'
import { type PortfolioEntry, CATEGORIES, CATEGORY_COLOURS } from '@/lib/types/portfolio'
import { entrySubtitle } from '@/lib/types/portfolio-labels'
import { relativeDate } from '@/lib/utils/dates'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { IMPORTANCE_LABELS } from '@/lib/types/importance'

function formatTag(tag: string): string {
  return formatSpecialtyLabel(tag)
}

export default function EntryCard({ entry }: { entry: PortfolioEntry & { has_evidence?: boolean } }) {
  const catMeta = CATEGORIES.find(c => c.value === entry.category)
  const colours = CATEGORY_COLOURS[entry.category]
  const subtitle = entrySubtitle(entry) || null
  const importance = entry.importance ?? null

  return (
    <Link
      href={`/portfolio/${entry.id}`}
      className="block bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] hover:bg-[var(--bg-raised)] transition-all group animate-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {entry.pinned && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--text-secondary)] shrink-0" aria-label="Pinned">
                <path d="M12 2a1 1 0 0 1 .707.293l9 9a1 1 0 0 1-1.414 1.414L19 11.414V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7.586l-1.293 1.293a1 1 0 0 1-1.414-1.414l9-9A1 1 0 0 1 12 2z" />
              </svg>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${colours.badge}`}>
              {catMeta?.short}
            </span>
            {entry.specialty_tags.slice(0, 2).map(tag => (
              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#1B6FD9]/10 text-[var(--accent-text)] border border-[#1B6FD9]/20">
                {formatTag(tag)}
              </span>
            ))}
            {entry.specialty_tags.length > 2 && (
              <span className="text-[10px] text-[var(--text-secondary)]">+{entry.specialty_tags.length - 2}</span>
            )}
            {importance && (
              <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium border ${
                importance === 'high'
                  ? 'bg-amber-400/10 text-amber-300 border-amber-400/20'
                  : 'bg-[var(--bg-overlay-soft)] text-[var(--text-secondary)] border-white/[0.08]'
              }`}>
                {IMPORTANCE_LABELS[importance]}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-white transition-colors">{entry.title}</h3>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
          <p className="text-xs text-[var(--text-secondary)] font-mono" title={entry.date}>{relativeDate(entry.date)}</p>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--text-secondary)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
}
