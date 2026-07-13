// Single source of truth for career stages.
//
// Three divergent allowlists previously coexisted (onboarding API accepted
// legacy Y5/Y6, settings API rejected them, isMedStudentStage accepted them).
// Y5/Y6 pre-date the Y5_PLUS consolidation, no UI offers them, and no profile
// rows hold them (live DB verified 2026-06-10), so they are not valid values
// anywhere. Import from here instead of redeclaring stage lists.

export const CAREER_STAGES = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5_PLUS', 'FY1', 'FY2', 'F3', 'OUT_OF_TRAINING', 'POST_FY'] as const

export type CareerStage = (typeof CAREER_STAGES)[number]

export const CAREER_STAGE_SET: ReadonlySet<string> = new Set(CAREER_STAGES)

export const MEDICAL_STUDENT_STAGES = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5_PLUS'] as const

export const MEDICAL_STUDENT_STAGE_SET: ReadonlySet<string> = new Set(MEDICAL_STUDENT_STAGES)

export const CAREER_STAGE_LABELS: Record<CareerStage, string> = {
  Y1: 'Year 1 (Medical Student)',
  Y2: 'Year 2 (Medical Student)',
  Y3: 'Year 3 (Medical Student)',
  Y4: 'Year 4 (Medical Student)',
  Y5_PLUS: 'Year 5+ (Medical Student)',
  FY1: 'Foundation Year 1 (FY1)',
  FY2: 'Foundation Year 2 (FY2)',
  F3: 'F3 / FY3 year (post-foundation)',
  OUT_OF_TRAINING: 'Out of training (SAS / non-training / break)',
  POST_FY: 'Core/Specialty Training (CT/ST)',
}

export const CAREER_STAGE_OPTIONS = CAREER_STAGES.map(value => ({
  value,
  label: CAREER_STAGE_LABELS[value],
}))

export function isMedicalStudentStage(careerStage: string | null | undefined) {
  return MEDICAL_STUDENT_STAGE_SET.has(careerStage ?? '')
}

// Stages that see the (foundation-style) ARCP tracker: foundation doctors plus
// F3 / out-of-training doctors, who are between programmes and may still want to
// keep tracking foundation capabilities. Medical students and specialty
// trainees (POST_FY) are excluded. ARCP is a visibility-only feature over the
// user's own data with no entitlement value, so this gate is UI-only. Single
// source of truth — imported by the sidebar nav, the command palette, and the
// /arcp page so the three cannot drift.
export const ARCP_VISIBLE_STAGES = ['FY1', 'FY2', 'F3', 'OUT_OF_TRAINING'] as const

const ARCP_VISIBLE_STAGE_SET: ReadonlySet<string> = new Set(ARCP_VISIBLE_STAGES)

export function isArcpVisibleStage(careerStage: string | null | undefined) {
  return ARCP_VISIBLE_STAGE_SET.has(careerStage ?? '')
}

// Display label for a stored stage value; falls back to the raw value so an
// unexpected legacy row degrades visibly rather than rendering nothing.
export function careerStageLabel(careerStage: string) {
  return CAREER_STAGE_SET.has(careerStage)
    ? CAREER_STAGE_LABELS[careerStage as CareerStage]
    : careerStage
}
