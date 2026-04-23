export type ScoringRule = 'highest' | 'cumulative_capped'

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
  isCheckbox?: boolean      // manual claim items, no portfolio entry needed
  isSelfAssessed?: boolean  // single dropdown, no evidence linking
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
