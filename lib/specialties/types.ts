export type ScoringRule = 'highest' | 'cumulative_capped'

// How a specialty is scored at application stage:
//   'points'   - official points-based scoring (e.g. IMT 35-pt matrix)
//   'evidence' - official NHS person spec exists but no public per-band points;
//                users upload evidence against essential / desirable domains
export type ScoringType = 'points' | 'evidence'

// For evidence-based specialties, each domain is either:
//   'essential' - entry requirement / gate (binary; must be met to apply)
//   'desirable' - application/interview criterion (evidence accumulates)
export type CriteriaType = 'essential' | 'desirable'

export type ScoringBand = {
  label: string
  points: number
}

// The selection-process family a specialty's shortlisting mechanism belongs to.
// Orthogonal to ScoringType: describes HOW candidates are shortlisted/scored by
// the recruiting body, not whether Clerkfolio can present a self-score matrix.
export type SelectionProcessFamily =
  | 'self_assessment_points'       // candidate self-scores against a published matrix
  | 'assessor_scored_written'      // written application scored by external assessors, no self-score
  | 'portfolio_graded_interview'   // portfolio graded A-E at interview, no pre-interview self-score
  | 'msra_interview'               // MSRA shortlists, then a structured interview scores
  | 'msra_only'                    // MSRA only, no interview, for the current cycle
  | 'multi_stage_selection_centre' // cognitive/situational tests plus a selection-centre stage

// Which pre-interview gate stands between an eligible application and an
// interview invitation (or, for msra_is_selection, an offer). This is the
// "getting in the door" taxonomy - orthogonal to SelectionProcessFamily, which
// describes the overall mechanism; the gate isolates the shortlisting step so
// the UI can say honestly whether portfolio work moves the needle before
// interview. One update recipe per gate group at annual refresh (see
// SPECIALTY-REFRESH.md).
export type PreInterviewGate =
  | 'self_assessment_rank'     // Group A: your self-assessment score ranks you for interview
  | 'assessor_scored_written'  // Group B: assessors score written answers to shortlist
  | 'msra_rank'                // Group C: MSRA ranks candidates to interview
  | 'msra_is_selection'        // Group D: MSRA is the entire selection, no interview this cycle
  | 'cognitive_tests'          // Group E: specialty-specific tests gate a selection centre
  | 'none_all_eligible'        // Group F: no gate, every eligible applicant is interviewed

// The pre-interview ("getting an interview") half of a selection process.
export type PreInterview = {
  gate: PreInterviewGate
  // True when portfolio/application content affects whether you reach
  // interview (groups A and B); false when shortlisting ignores it entirely
  // (MSRA-gated / test-gated / no-gate specialties).
  portfolioCountsPreInterview: boolean
  // Officially published cut-off/threshold mechanics only - never fabricate.
  cutoffNotes?: string
}

// One verifiable citation backing a config's facts. Replaces prose comments as
// the machine-readable provenance record; lastVerified drives the staleness
// check in SPECIALTY-REFRESH.md.
export type SourceCitation = {
  url: string
  claim: string
  lastVerified: string  // ISO date e.g. "2026-07-02"
}

// One stage in a specialty's selection pipeline, in chronological order.
export type SelectionStage = {
  key: string
  label: string
  weightPct?: number    // omit when no published split exists - do not fabricate
  weightLabel?: string  // free-text fallback, e.g. "Portfolio ~45% of final score"
  notes?: string
}

// The body that actually runs recruitment/scoring for a specialty, when distinct
// from the generic NHS England / HEE person-specification cited in `source`.
export type RecruitmentOffice = {
  name: string   // e.g. "RCPCH", "ANRO", "GP National Recruitment Office", "IMT Recruitment"
  url: string
  urlLabel?: string
}

// Full selection-process descriptor for a specialty. Optional on SpecialtyConfig;
// absence means "not yet documented", not "no process exists" - UI must render
// nothing when undefined, never a fabricated claim.
export type SelectionProcess = {
  family: SelectionProcessFamily
  stages: SelectionStage[]   // empty array allowed if not yet modeled
  preInterview?: PreInterview // the shortlisting gate; absence means "not yet documented"
  recruitmentOffice?: RecruitmentOffice
  cycleSpecific?: boolean    // true when the family/weights are a cycle snapshot that may change next cycle
}

export type SpecialtyDomain = {
  key: string
  label: string
  maxPoints: number
  scoringRule: ScoringRule
  bands: ScoringBand[]
  isCheckbox?: boolean       // manual claim items, no portfolio entry needed
  isSelfAssessed?: boolean   // single dropdown, no evidence linking
  isEvidenceOnly?: boolean   // no points-based scoring; users upload evidence to the domain only
  criteriaType?: CriteriaType // for evidence-based specialties: essential vs desirable
  notes?: string
}

export type BonusOption = {
  key: string
  label: string
  points: number
}

export type ApplicationWindow = {
  opensDate: string   // ISO date e.g. "2026-10-01" - verify at NHS England recruitment pages
  closesDate: string  // ISO date e.g. "2026-11-14"
  source: string      // URL to the NHS England / ORIEL source page
}

export type SpecialtyConfig = {
  key: string
  name: string
  cycleYear: number
  totalMax: number
  source: string
  sourceLabel: string
  isOfficial: boolean
  scoringType?: ScoringType  // 'points' (default) or 'evidence'; UI uses this to pick layout
  isEvidenceOnly?: boolean   // deprecated alias; equivalent to scoringType === 'evidence'
  bonusOptions?: BonusOption[]
  domains: SpecialtyDomain[]
  applicationWindow?: ApplicationWindow  // auto-populated deadlines; must be verified before use
  supersededBy?: string                  // specialty_key of the next-cycle config e.g. 'imt_2027'
  selectionProcess?: SelectionProcess     // how candidates are actually shortlisted/scored
  sources?: SourceCitation[]              // official citations backing this config's facts
}

export type SpecialtyApplication = {
  id: string
  user_id: string
  specialty_key: string
  cycle_year: number
  bonus_claimed: boolean
  created_at: string
  is_active: boolean       // false = archived (moved to new cycle)
  archived_at: string | null
  is_target?: boolean      // true = the specialty user is currently applying to (Application Mode banner key)
}

export type SpecialtyEntryLink = {
  id: string
  application_id: string
  domain_key: string
  entry_id: string | null
  entry_type: 'portfolio' | null
  band_label: string
  points_claimed: number
  is_checkbox: boolean
  created_at: string
}
