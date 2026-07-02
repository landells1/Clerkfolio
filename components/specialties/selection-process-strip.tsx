import { getSelectionFamilyLabel, getPreInterviewGateMeta, getPortfolioTimingNote } from '@/lib/specialties'
import type { SelectionProcess, SelectionStage } from '@/lib/specialties'

type Props = {
  process: SelectionProcess | undefined
  variant: 'compact' | 'full'
}

function stageText(stage: SelectionStage): string {
  if (stage.weightPct !== undefined) return `${stage.label} ${stage.weightPct}%`
  if (stage.weightLabel) return stage.weightLabel
  return stage.label
}

export function SelectionProcessStrip({ process, variant }: Props) {
  if (!process) return null

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5 mb-2">
        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[var(--text-secondary)] text-[10px] font-medium">
          {getSelectionFamilyLabel(process.family)}
        </span>
        {process.stages.length > 0 && (
          <span className="text-[10px] text-[var(--text-muted)] truncate">
            {process.stages.map(stageText).join(' → ')}
          </span>
        )}
      </div>
    )
  }

  const preInterview = process.preInterview
  const gateMeta = preInterview ? getPreInterviewGateMeta(preInterview.gate) : null
  const timingNote = preInterview ? getPortfolioTimingNote(preInterview) : null
  const noInterview = preInterview?.gate === 'msra_is_selection'

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-canvas)] p-4 mb-4">
      <p className="text-[10px] font-semibold text-[var(--text-emphasis)] uppercase tracking-wide mb-2">
        Selection process
      </p>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[var(--text-secondary)] text-xs font-medium border border-white/[0.08]">
          {getSelectionFamilyLabel(process.family)}
        </span>
        {process.cycleSpecific && (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
            ⚠️ This cycle only - may change
          </span>
        )}
      </div>

      {preInterview && gateMeta && (
        <div className="mb-3 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
          <p className="text-[10px] font-semibold text-[var(--text-emphasis)] uppercase tracking-wide mb-1">
            {noInterview ? 'Getting an offer' : 'Getting an interview'}
          </p>
          <p className="text-xs font-medium text-[var(--text-primary)]">{gateMeta.label}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{gateMeta.description}</p>
          {preInterview.cutoffNotes && (
            <p className="text-[10px] text-[var(--text-secondary)] mt-1.5">{preInterview.cutoffNotes}</p>
          )}
          {timingNote && (
            <p className="text-[10px] text-[var(--text-muted)] mt-1.5 italic">{timingNote}</p>
          )}
        </div>
      )}

      {process.stages.length > 0 && (
        <div className="mb-3">
          {preInterview && (
            <p className="text-[10px] font-semibold text-[var(--text-emphasis)] uppercase tracking-wide mb-1.5">
              {noInterview ? 'Final score' : 'At interview and final score'}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {process.stages.map((stage, i) => (
              <div key={stage.key} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="text-[var(--text-muted)] text-xs" aria-hidden>&rarr;</span>
                )}
                <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    {stage.label}
                    {stage.weightPct !== undefined && (
                      <span className="text-[var(--text-muted)] font-normal"> &middot; {stage.weightPct}%</span>
                    )}
                  </p>
                  {(stage.weightLabel || stage.notes) && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {stage.weightLabel ?? stage.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {process.recruitmentOffice && (
        <a
          href={process.recruitmentOffice.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors w-fit"
        >
          Scored by: {process.recruitmentOffice.urlLabel ?? process.recruitmentOffice.name}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      )}
    </div>
  )
}
