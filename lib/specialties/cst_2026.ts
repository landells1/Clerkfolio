import type { SpecialtyConfig } from './types'
import { UNIVERSAL_ESSENTIALS } from './shared'

// Core Surgical Training 2026 — for the 2026 cycle, NHS England transitioned from
// numerical self-assessment scoring to letter-grade (A–E) evidence assessment.
// No Oriel self-assessment; portfolio is uploaded and assessed at interview
// (45% of overall score). No per-band point values are officially published.
// Configured as evidence-based for the 2026 cycle.
export const CST_2026: SpecialtyConfig = {
  key: 'cst_2026',
  name: 'Core Surgical Training (CST)',
  cycleYear: 2026,
  totalMax: 0,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/surgery/core-surgery/core-surgical-training-portfolio-guidance-for-candidates',
  sourceLabel: 'NHS England — CST Portfolio Guidance for Candidates',
  isOfficial: true,
  scoringType: 'evidence',
  isEvidenceOnly: true,
  domains: [
    ...UNIVERSAL_ESSENTIALS,
    {
      key: 'cst_experience_cap',
      label: 'Prior surgical experience ≤18 months WTE',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Whole-time-equivalent experience in surgical specialties (excluding Foundation placements) must not exceed 18 months by post start date. Direct-from-Foundation applicants meet this trivially; relevant mainly for IMGs, LAT/trust-grade, or returners.',
    },
    {
      key: 'surgical_experience_operative',
      label: 'Surgical Experience — Operative (eLogbook)',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Verified eLogbook consolidation report, consultant-signed. 2026 rule: ITU placements do NOT count as surgical specialty for operative experience.',
    },
    {
      key: 'surgical_experience_elective',
      label: 'Surgical Experience — Elective / Taster',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Surgical elective (4+ weeks) or taster (min. 5 days) with supervisor letter on official letterhead. 2026 rule: Foundation placements EXCLUDED — only electives and tasters outside training count.',
    },
    {
      key: 'quality_improvement',
      label: 'Quality Improvement / Clinical Audit',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Surgically-themed QI/audit. Closed-loop preferred — protocol, data, run charts, change implementation, re-audit, presentation in department.',
    },
    {
      key: 'presentations_publications',
      label: 'Presentations & Publications',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Peer-reviewed medical meetings only — pay-to-present excluded. PubMed-catalogued publications; in-press accepted with acceptance letter.',
    },
    {
      key: 'teaching_experience',
      label: 'Teaching Experience',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Organised formal teaching with full evidence pack — programme outline, timetable, sign-off letters, feedback forms, attendance logs. Mandatory index page for all evidence — submissions without an index page score 0. Portfolio reviewed at interview (10-min review + 15-min discussion station).',
    },
  ],
}
