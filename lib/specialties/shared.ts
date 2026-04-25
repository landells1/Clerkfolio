import type { SpecialtyDomain } from './types'

// Universal NHS England entry requirements that appear across every 2026 ST1/CT1
// person specification. Spread these into evidence-based configs as essentials.
// Specialty-specific essentials (e.g. ALS for Anaesthetics) should be added on top.
export const UNIVERSAL_ESSENTIALS: SpecialtyDomain[] = [
  {
    key: 'gmc_registration',
    label: 'Full GMC registration with licence to practise',
    maxPoints: 0,
    scoringRule: 'highest',
    bands: [],
    criteriaType: 'essential',
    notes: 'Held or eligible for full UK General Medical Council registration with a current licence to practise by intended post start date.',
  },
  {
    key: 'foundation_competence',
    label: 'Foundation Programme competence (or equivalent)',
    maxPoints: 0,
    scoringRule: 'highest',
    bands: [],
    criteriaType: 'essential',
    notes: 'UK FP completion certificate, or evidence of equivalent competence (CREST / Certificate of Equivalence) by post start date.',
  },
  {
    key: 'ukmla',
    label: 'UKMLA passed (where applicable)',
    maxPoints: 0,
    scoringRule: 'highest',
    bands: [],
    criteriaType: 'essential',
    notes: 'UK Medical Licensing Assessment passed, where required for the cohort and route of entry.',
  },
  {
    key: 'english_language',
    label: 'English language proficiency',
    maxPoints: 0,
    scoringRule: 'highest',
    bands: [],
    criteriaType: 'essential',
    notes: 'IELTS Academic 7.5 overall (no sub-section below 7.0), OET grade B in all sections, or other GMC-accepted evidence.',
  },
  {
    key: 'health_immunisation',
    label: 'Health & immunisation status complete',
    maxPoints: 0,
    scoringRule: 'highest',
    bands: [],
    criteriaType: 'essential',
    notes: 'Occupational health clearance and immunisation status (including EPP requirements where relevant) complete by start date.',
  },
  {
    key: 'right_to_work',
    label: 'Right to work in the UK',
    maxPoints: 0,
    scoringRule: 'highest',
    bands: [],
    criteriaType: 'essential',
    notes: 'Eligible to live and work in the UK for the full duration of training (settled status, visa, or equivalent).',
  },
]
