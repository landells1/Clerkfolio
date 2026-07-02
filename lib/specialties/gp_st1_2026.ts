import type { SpecialtyConfig } from './types'
import { UNIVERSAL_ESSENTIALS } from './shared'

// GP ST1 2026 - selection is MSRA ONLY. Verified 2026-07-02 on the NHS England
// GPST overview page (medical.hee.nhs.uk/.../general-practice-gp/how-to-apply-for-
// gp-specialty-training/gp-specialty-training-recruitment/general-practice-overview):
// "A subsequent face-to-face or virtual assessment at a Selection Centre will not
// occur. Successful applicants will be considered for appointment across the whole
// of the UK, based on their performance in the MSRA" (Single Transferable Score).
// The old Stage 3 simulated selection centre no longer runs; marked cycleSpecific
// as this is exactly the kind of fact that can change between cycles.
// Note: gprecruitment.hee.nhs.uk now 301-redirects into medical.hee.nhs.uk, so the
// GP National Recruitment Office is no longer cited as a separate recruitment office.
export const GP_ST1_2026: SpecialtyConfig = {
  key: 'gp_st1_2026',
  name: 'General Practice ST1',
  cycleYear: 2026,
  totalMax: 0,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/general-practice-st1-2026',
  sourceLabel: 'NHS England - General Practice ST1 2026 Person Specification',
  isOfficial: true,
  scoringType: 'evidence',
  isEvidenceOnly: true,
  selectionProcess: {
    family: 'msra_only',
    stages: [
      { key: 'msra', label: 'MSRA', notes: 'No interview or selection centre; offers ranked on MSRA performance UK-wide via Single Transferable Score' },
    ],
    preInterview: {
      gate: 'msra_is_selection',
      portfolioCountsPreInterview: false,
      cutoffNotes: 'No interview or selection centre this cycle: offers are ranked UK-wide on MSRA performance alone via the Single Transferable Score.',
    },
    cycleSpecific: true,
  },
  sources: [
    {
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/general-practice-gp/how-to-apply-for-gp-specialty-training/gp-specialty-training-recruitment/general-practice-overview',
      claim: 'Quote: "A subsequent face-to-face or virtual assessment at a Selection Centre will not occur. Successful applicants will be considered for appointment across the whole of the UK, based on their performance in the MSRA." The old Stage 3 selection centre no longer runs; gprecruitment.hee.nhs.uk now redirects into medical.hee.nhs.uk.',
      lastVerified: '2026-07-02',
    },
    {
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/general-practice-st1-2026',
      claim: 'Entry requirements (essentials), including UK Performers List eligibility.',
      lastVerified: '2026-07-02',
    },
  ],
  domains: [
    ...UNIVERSAL_ESSENTIALS,
    {
      key: 'gp_performers_list',
      label: 'Eligible for UK Performers’ Lists',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Eligible for inclusion on the UK Performers’ Lists by post start date (required to deliver NHS GP services).',
    },
    {
      key: 'qualifications',
      label: 'Postgraduate Degrees & Qualifications',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'PhD/MD, Masters, PG Diploma/Certificate.',
    },
    {
      key: 'publications',
      label: 'Publications',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Peer-reviewed publications, book chapters, case reports, editorials, abstracts.',
    },
    {
      key: 'presentations',
      label: 'Presentations & Posters',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Oral and poster presentations at international, national, regional and local meetings.',
    },
    {
      key: 'quality_improvement',
      label: 'Quality Improvement / Audit',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Complete QI/audit cycles with documented change and re-audit; partial cycles with defined role.',
    },
    {
      key: 'teaching',
      label: 'Teaching Experience',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Formal teaching programmes, regular teaching sessions, teaching qualifications.',
    },
    {
      key: 'commitment_gp',
      label: 'Commitment to General Practice',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'GP taster/placement, RCGP Associate-in-Training, GP-related courses, attendance at RCGP / primary care conferences, community/public health work, GP-relevant audits.',
    },
  ],
}
