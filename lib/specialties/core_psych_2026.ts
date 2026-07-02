import type { SpecialtyConfig } from './types'
import { UNIVERSAL_ESSENTIALS } from './shared'

// Core Psychiatry CT1 2026 - selection is MSRA only for the 2026 cycle, no
// interview stage. No portfolio scoring at application stage. Re-verified
// 2026-07-02 on the NHS England psychiatry Applying for Core Training page
// (Round 1, August 2026 intake): "there will be no face-to-face or online
// interviews for this round of recruitment. Offers will be based on MSRA scores
// only". The 186-per-paper appointability threshold lives on the separate
// psychiatry MSRA subpage (see sources). Cycle-specific fact; re-check every cycle.
export const CORE_PSYCH_2026: SpecialtyConfig = {
  key: 'core_psych_2026',
  name: 'Core Psychiatry CT1',
  cycleYear: 2026,
  totalMax: 0,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/core-psychiatry-training-ct1-2026',
  sourceLabel: 'NHS England - Core Psychiatry Training CT1 2026 Person Specification',
  isOfficial: true,
  scoringType: 'evidence',
  isEvidenceOnly: true,
  selectionProcess: {
    family: 'msra_only',
    stages: [
      { key: 'msra', label: 'MSRA' },
    ],
    preInterview: {
      gate: 'msra_is_selection',
      portfolioCountsPreInterview: false,
      cutoffNotes: 'No interview this cycle: offers are based on MSRA scores only. A raw score of at least 186 in each MSRA paper is required to be appointable; ties are broken by weighting the Professional Dilemmas paper more heavily.',
    },
    cycleSpecific: true,
  },
  sources: [
    {
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/psychiatry/core-psychiatry-training/overview-of-core-psychiatry-training/applying-for-core-training',
      claim: 'Quote: "There is a single application process for CT1 Core Psychiatry, ST1 Child and Adolescent Psychiatry and ST1 Psychiatry of Learning Disability... there will be no face-to-face or online interviews for this round of recruitment. Offers will be based on MSRA scores only." (Round 1, August 2026 intake.)',
      lastVerified: '2026-07-02',
    },
    {
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/psychiatry/core-psychiatry-training/overview-of-core-psychiatry-training/msra',
      claim: 'A raw score of at least 186 in each of the two MSRA papers is required to be considered appointable; tied scores weight the Professional Dilemmas paper more heavily than Clinical Problem Solving.',
      lastVerified: '2026-07-02',
    },
    {
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/core-psychiatry-training-ct1-2026',
      claim: 'Entry requirements (essentials), including the driving licence / alternative transport requirement.',
      lastVerified: '2026-07-02',
    },
  ],
  domains: [
    ...UNIVERSAL_ESSENTIALS,
    {
      key: 'psych_driving_licence',
      label: 'Valid driving licence (or alternative transport)',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Current and in-date valid driving licence, or undertaking to provide alternative means of transport (community psychiatry placements often require travel between sites).',
    },
    {
      key: 'qualifications',
      label: 'Postgraduate Degrees & Qualifications',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'PhD/MD, Masters (especially in psychiatry, psychology, neuroscience), PG Diploma/Certificate.',
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
      key: 'commitment_psychiatry',
      label: 'Commitment to Psychiatry',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Psychiatry taster/elective, RCPsych membership, RCPsych Foundation Fellowship / Psych Star, psychiatry conferences attended, mental health volunteering, MRCPsych Paper A.',
    },
  ],
}
