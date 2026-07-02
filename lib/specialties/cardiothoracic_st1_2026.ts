import type { SpecialtyConfig } from './types'
import { UNIVERSAL_ESSENTIALS } from './shared'

// Cardiothoracic Surgery ST1 2026 - national run-through programme, nationally
// recruited by NHS England Wessex. Selection re-verified 2026-07-02 from the official
// 2026 applicant guide (wessex.hee.nhs.uk/wp-content/uploads/sites/6/2025/10/
// Applicant-Guide-2026-Cardiothoracic-ST1-National-Recruitment-FINAL.pdf): the MSRA
// is NOT used (also absent from NHS England's MSRA specialty list). Applications are
// longlisted by self-assessment score ("We will be processing applications by
// self-assessment score initially for 2026"); applicants above the cut-off (or within
// 6 points below it) upload evidence to a verification portal, assessors verify the
// scores, and the final shortlist is interviewed (2-3 Feb 2026). Wessex publishes the
// self-assessment criteria as a separate PDF; the numeric matrix is not yet modelled
// here, so the config remains evidence-based for uploads.
export const CARDIOTHORACIC_ST1_2026: SpecialtyConfig = {
  key: 'cardiothoracic_st1_2026',
  name: 'Cardiothoracic Surgery ST1',
  cycleYear: 2026,
  totalMax: 0,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/cardiothoracic-surgery-st1-2026',
  sourceLabel: 'NHS England - Cardiothoracic Surgery ST1 2026 Person Specification',
  isOfficial: true,
  scoringType: 'evidence',
  isEvidenceOnly: true,
  selectionProcess: {
    family: 'self_assessment_points',
    stages: [
      { key: 'self_assessment', label: 'Self-assessment at application', notes: 'Applications longlisted by self-assessment score; cut-off set by MDRS. No MSRA for Cardiothoracic ST1' },
      { key: 'evidence_verification', label: 'Evidence upload & verification', notes: 'Applicants above the cut-off (or within 6 points below it) upload evidence; assessors verify the self-assessment scores' },
      { key: 'interview', label: 'Interview' },
    ],
    recruitmentOffice: {
      name: 'NHS England Wessex (Cardiothoracic National Recruitment)',
      url: 'https://wessex.hee.nhs.uk/medical-dental-training-recruitment/core-and-specialty/cardiothoracic-surgery-st1-st4-national-recruitment/',
    },
  },
  domains: [
    ...UNIVERSAL_ESSENTIALS,
    {
      key: 'cardiothoracic_experience_cap',
      label: 'Prior cardiothoracic experience ≤18 months WTE',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Combined whole-time-equivalent experience in cardiac surgery, thoracic surgery, congenital cardiac surgery and cardiothoracic transplantation must not exceed 18 months by application closing date. Direct-from-Foundation applicants meet this trivially; relevant mainly for IMGs, LAT/trust-grade, or returners.',
    },
    {
      key: 'qualifications',
      label: 'Postgraduate & Intercalated Degrees',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'BSc/BA/BMedSci (intercalated, with classification), MSc/MA/MRes, MD, PhD/DPhil. Cardiac/cardiovascular research degrees particularly valued.',
    },
    {
      key: 'publications',
      label: 'Publications',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'PubMed-indexed first/joint-first author original research scores highest. Cardiothoracic-related publications particularly valued.',
    },
    {
      key: 'presentations',
      label: 'Presentations & Posters',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Oral and poster presentations at international, national, regional and local meetings (e.g. SCTS, EACTS, AATS).',
    },
    {
      key: 'quality_improvement',
      label: 'Quality Improvement / Audit',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Closed-loop QI/audit cycles with documented change and re-audit. Cardiothoracic-themed projects particularly valued.',
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
      notes: 'Committee roles, society leadership, NHS management training, healthcare leadership programmes.',
    },
    {
      key: 'commitment_cardiothoracic',
      label: 'Commitment to Cardiothoracic Surgery',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Cardiothoracic taster/elective, SCTS membership (including student/junior membership), basic surgical skills courses, cardiothoracic-specific courses, attendance at SCTS Annual Meeting or regional cardiothoracic meetings, surgical electives, validated logbook entries from cardiothoracic exposure.',
    },
  ],
}
