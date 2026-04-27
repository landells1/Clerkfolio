export type ScoringRule = 'highest' | 'cumulative_capped'

// How a specialty is scored at application stage:
//   'points'   — official points-based scoring (e.g. IMT 35-pt matrix)
//   'evidence' — official NHS person spec exists but no public per-band points;
//                users upload evidence against essential / desirable domains
export type ScoringType = 'points' | 'evidence'

// Training stage at which a programme is entered:
//   'entry'  — F2-direct entry (ST1 / CT1 run-through or core training)
//   'higher' — higher specialty entry post-IMT / post-CST / post-ACCS (ST3 / ST4)
export type TrainingLevel = 'entry' | 'higher'

// For evidence-based specialties, each domain is either:
//   'essential' — entry requirement / gate (binary; must be met to apply)
//   'desirable' — application/interview criterion (evidence accumulates)
export type CriteriaType = 'essential' | 'desirable'

export type ScoringBand = {
  label: string
  points: number
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
  trainingLevel?: TrainingLevel  // 'entry' (default; ST1/CT1) or 'higher' (ST3/ST4)
  bonusOptions?: BonusOption[]
  domains: SpecialtyDomain[]
}

export type SpecialtyApplication = {
  id: string
  user_id: string
  specialty_key: string
  cycle_year: number
  bonus_claimed: boolean
  created_at: string
}

export type SpecialtyEntryLink = {
  id: string
  application_id: string
  domain_key: string
  entry_id: string | null
  entry_type: 'portfolio' | 'case' | null
  band_label: string
  points_claimed: number
  is_checkbox: boolean
  created_at: string
}
