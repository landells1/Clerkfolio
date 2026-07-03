import type { SpecialtyConfig } from './types'
import { UNIVERSAL_ESSENTIALS } from './shared'

// O&G ST1 2026 - selection is MSRA + interview. No portfolio scoring at application.
// Re-verified 2026-07-02: the only NHS page publishing a marks split (MSRA 50 +
// interview 100 of 150, top-75 MSRA bypass) is titled "Scoring overview (August 2023
// intake)" - stale, so no weights are asserted for 2026. The CURRENT NHS O&G ST1
// interviews page describes a two-station online interview (~30 min): Station 1 =
// clinical prioritisation (6 min) + an ethical and governance question (4 min);
// Station 2 = structured interview (10 min). An MSRA bypass mechanism still exists
// for top scorers but the threshold/count is not published. The ethics & governance
// element is NOT new for 2026 - it already existed in the 2023-intake scoring overview.
export const OG_ST1_2026: SpecialtyConfig = {
  key: 'og_st1_2026',
  name: 'Obstetrics & Gynaecology ST1',
  cycleYear: 2026,
  totalMax: 0,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/obstetrics-and-gynaecology-st1-2026',
  sourceLabel: 'NHS England - Obstetrics & Gynaecology ST1 2026 Person Specification',
  isOfficial: true,
  scoringType: 'evidence',
  isEvidenceOnly: true,
  selectionProcess: {
    family: 'msra_interview',
    stages: [
      { key: 'msra', label: 'MSRA', notes: 'Shortlists for interview; a bypass exists for top MSRA scorers (threshold not published). No published 2026 weighting' },
      { key: 'interview', label: 'Structured interview (two online stations, ~30 min)', notes: 'Clinical prioritisation + an ethical and governance question, then structured interview questions' },
    ],
    preInterview: {
      gate: 'msra_rank',
      portfolioCountsPreInterview: false,
      cutoffNotes: 'The MSRA shortlists for interview, and a bypass exists for top MSRA scorers (threshold and count not published). The only page publishing an MSRA/interview weighting is the stale August 2023 intake scoring overview, so no 2026 weighting is asserted.',
    },
  },
  sources: [
    {
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/obstetrics-and-gynaecology/st1-obstetrics-and-gynaecology/overview-of-st1-obstetrics-and-gynaecology/interviews',
      claim: 'Current interview format: two online stations (~30 min total) - Station 1 clinical prioritisation (6 min) plus an ethical and governance question (4 min), Station 2 structured interview (10 min).',
      lastVerified: '2026-07-02',
    },
    {
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/obstetrics-and-gynaecology/st1-obstetrics-and-gynaecology/scoring-overview',
      claim: 'KNOWN-STALE reference: this scoring overview is titled for the August 2023 intake (MSRA 50 + interview 100 of 150, top-75 MSRA bypass). Not asserted for 2026; kept here so the annual refresh checks whether it has been updated.',
      lastVerified: '2026-07-02',
    },
    {
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/obstetrics-and-gynaecology-st1-2026',
      claim: 'Entry requirements (essentials), including the 24-month O&G experience cap.',
      lastVerified: '2026-07-02',
    },
  ],
  domains: [
    ...UNIVERSAL_ESSENTIALS,
    {
      key: 'og_experience_cap',
      label: 'Prior O&G experience ≤24 months WTE',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Whole-time-equivalent experience in Obstetrics & Gynaecology must not exceed 24 months (excluding Foundation modules) by post start date. Direct-from-Foundation applicants meet this trivially; relevant mainly for IMGs, LAT/trust-grade, or returners.',
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
      key: 'commitment_og',
      label: 'Commitment to Obstetrics & Gynaecology',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Demonstrable interest in O&G as practised in the UK. MRCOG Part 1, O&G taster/elective, BPSiOG / ultrasound / ALSO / MOET / PROMPT obstetric emergency courses, RCOG membership, O&G conferences attended.',
    },
  ],
}
