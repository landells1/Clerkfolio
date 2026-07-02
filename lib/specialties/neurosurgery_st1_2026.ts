import type { SpecialtyConfig } from './types'
import { UNIVERSAL_ESSENTIALS } from './shared'

// Neurosurgery ST1 2026 - national run-through programme.
// Selection re-verified 2026-07-02: MSRA use is confirmed on NHS England's official
// MSRA specialty list ("Neurosurgery ST1/ST2/ST3") and interviews (16-17 Mar 2026)
// on the NHS England specialty recruitment interview schedule. The previously-cited
// "MSRA 40% / interview 60%" split and the Yorkshire & Humber lead-office claim live
// only on yorksandhumberdeanery.nhs.uk, which is behind bot protection and could not
// be fetched - both removed as UNVERIFIABLE rather than asserted. Configured as
// evidence-based for users to upload supporting evidence against each domain.
export const NEUROSURGERY_ST1_2026: SpecialtyConfig = {
  key: 'neurosurgery_st1_2026',
  name: 'Neurosurgery ST1',
  cycleYear: 2026,
  totalMax: 0,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/neurosurgery-st1-2026',
  sourceLabel: 'NHS England - Neurosurgery ST1 2026 Person Specification',
  isOfficial: true,
  scoringType: 'evidence',
  isEvidenceOnly: true,
  selectionProcess: {
    family: 'msra_interview',
    stages: [
      { key: 'msra', label: 'MSRA', notes: 'No officially published MSRA/interview weighting could be verified for 2026' },
      { key: 'interview', label: 'Portfolio-based interview' },
    ],
  },
  domains: [
    ...UNIVERSAL_ESSENTIALS,
    {
      key: 'neurosurgery_experience_cap',
      label: 'Prior clinical experience ≤24 months WTE',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Total post-Foundation clinical experience (whole-time-equivalent, excluding Foundation modules) must not exceed 24 months by post start date. Direct-from-Foundation applicants meet this trivially; relevant mainly for IMGs, LAT/trust-grade, or returners.',
    },
    {
      key: 'neurosurgery_logbook',
      label: 'Validated surgical logbook',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Validated logbook documentation of surgical exposure (eLogbook consolidation report or equivalent). Listed as a specialty-specific essential in the 2026 person spec.',
    },
    {
      key: 'qualifications',
      label: 'Postgraduate & Intercalated Degrees',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'BSc/BA/BMedSci (intercalated, with classification), MSc/MA/MRes, MD, PhD/DPhil. Neuroscience-related degrees particularly valued.',
    },
    {
      key: 'publications',
      label: 'Publications',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'PubMed-indexed peer-reviewed publications; first/joint-first author original research carries the most weight. Neurosurgery-related publications particularly valued.',
    },
    {
      key: 'presentations',
      label: 'Presentations & Posters',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Oral and poster presentations at international, national, regional and local meetings (e.g. SBNS, Tessa Jowell, EANS).',
    },
    {
      key: 'quality_improvement',
      label: 'Quality Improvement / Audit',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Closed-loop QI/audit cycles with documented change and re-audit. Neurosurgery-themed projects particularly valued.',
    },
    {
      key: 'teaching',
      label: 'Teaching Experience',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Organised teaching programmes with feedback, regular teaching sessions, PG Cert in Medical Education or equivalent.',
    },
    {
      key: 'leadership_management',
      label: 'Leadership & Management',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Committee roles, society leadership, formal management training. NHS management understanding valued.',
    },
    {
      key: 'commitment_neurosurgery',
      label: 'Commitment to Neurosurgery',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Neurosurgery taster/elective, SBNS membership, basic surgical skills courses, neuro-related courses (e.g. ATLS, microsurgery), clinical exposure to neurosurgery / neurology / neuro-ICU. Realistic insight into the personal demands of the specialty.',
    },
  ],
}
