'use client'

import type { Dispatch, SetStateAction } from 'react'
import { CAREER_STAGE_OPTIONS as CAREER_STAGES } from '@/lib/constants/career-stages'
import type { ProfileState } from './profile-state'

// Career stage select (confirmed via the page's ConfirmModal) plus the
// graduation-date field for medical students.
export function CareerStageSection({
  profile,
  setProfile,
  pendingStage,
  setPendingStage,
  isMedStudent,
  onSave,
}: {
  profile: ProfileState
  setProfile: Dispatch<SetStateAction<ProfileState>>
  pendingStage: string | null
  setPendingStage: (stage: string | null) => void
  isMedStudent: boolean | undefined
  onSave: () => void
}) {
  return (
    <section className="bg-[var(--bg-surface)] border border-accent/14 rounded-2xl p-6 mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Career stage</h2>
          <p className="text-sm text-[var(--text-muted)]">This controls which features are shown in your sidebar. Moving out of medical school changes Student accounts to Foundation accounts.</p>
        </div>
        <select
          value={pendingStage ?? profile.career_stage}
          onChange={e => {
            const nextStage = e.target.value
            setPendingStage(nextStage && nextStage !== profile.career_stage ? nextStage : null)
          }}
          className="min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">Select career stage</option>
          {CAREER_STAGES.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
        </select>
      </div>
      {isMedStudent && (
        <label className="mt-5 block max-w-xs mx-auto text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
          Expected graduation date
          <input
            type="date"
            value={profile.student_graduation_date}
            onChange={e => setProfile(p => ({ ...p, student_graduation_date: e.target.value }))}
            onBlur={() => onSave()}
            className="mt-1.5 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] normal-case tracking-normal outline-none focus:border-[var(--accent)]"
          />
        </label>
      )}
    </section>
  )
}
