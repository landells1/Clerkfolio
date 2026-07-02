import type { SpecialtyConfig } from './types'
import { UNIVERSAL_ESSENTIALS } from './shared'

// Paediatrics ST1 2026 - RCPCH application is scored against 5 official domains.
// Verified 2026-07-02 against the RCPCH ST1 page and the RCPCH 2026-27 shortlisting
// scoring guidance PDF (rcpch.ac.uk/sites/default/files/2025-10/st1_scoring_guidance_
// glossary_for_shortlisting_2026-27_v.4_jac_271025.pdf): each application is scored by
// two assessors, 30 marks per assessor (Transferable clinical capabilities /8, Personal
// achievements & reflection /8, QIP-Audit /5, Academic achievements /3+1, Teaching /5;
// answers max 50 words per section). Shortlisting scores are not carried into the
// interview (two 20-min virtual stations via Qpercom). Per-band descriptors exist but
// this config presents the official domain structure for evidence upload only.
export const PAEDIATRICS_ST1_2026: SpecialtyConfig = {
  key: 'paediatrics_st1_2026',
  name: 'Paediatrics ST1',
  cycleYear: 2026,
  totalMax: 0,
  source: 'https://www.rcpch.ac.uk/education-careers/apply-paediatrics/ST1',
  sourceLabel: 'RCPCH - Apply for Paediatrics ST1',
  isOfficial: true,
  scoringType: 'evidence',
  isEvidenceOnly: true,
  selectionProcess: {
    family: 'assessor_scored_written',
    stages: [
      { key: 'written_application', label: 'Written application', weightLabel: 'Scored by 2 independent assessors, up to 60 marks (30 each)', notes: 'Five 50-word sections: clinical capabilities /8, personal achievements /8, QI-audit /5, academic /3(+1), teaching /5. Shortlisting scores are not carried over to interview' },
      { key: 'interview', label: 'Interview (two 20-min virtual stations)', notes: 'Multi-scenario format via the Qpercom platform' },
    ],
    preInterview: {
      gate: 'assessor_scored_written',
      portfolioCountsPreInterview: true,
      cutoffNotes: 'Each written application is scored by two independent RCPCH assessors (30 marks each, 60 total) across five 50-word sections. Shortlisting scores are not carried into the interview.',
    },
    recruitmentOffice: {
      name: 'RCPCH',
      url: 'https://www.rcpch.ac.uk/education-careers/apply-paediatrics/ST1',
    },
  },
  sources: [
    {
      url: 'https://www.rcpch.ac.uk/education-careers/apply-paediatrics/ST1',
      claim: 'RCPCH runs ST1 recruitment; the application is scored against 5 official domains, then interviews run as two 20-minute virtual stations via Qpercom.',
      lastVerified: '2026-07-02',
    },
    {
      url: 'https://www.rcpch.ac.uk/sites/default/files/2025-10/st1_scoring_guidance_glossary_for_shortlisting_2026-27_v.4_jac_271025.pdf',
      claim: 'Shortlisting scoring for 2026-27: two assessors at 30 marks each (Transferable clinical capabilities /8, Personal achievements & reflection /8, QIP-Audit /5, Academic achievements /3+1, Teaching /5; answers max 50 words per section); shortlisting scores are not carried into the interview.',
      lastVerified: '2026-07-02',
    },
  ],
  domains: [
    ...UNIVERSAL_ESSENTIALS,
    {
      key: 'paeds_experience_cap',
      label: 'Prior paediatrics experience ≤24 months WTE',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Whole-time-equivalent experience in Paediatrics (excluding Foundation posts) must not exceed 24 months at point of application. Direct-from-Foundation applicants meet this trivially; relevant mainly for IMGs, LAT/trust-grade, or returners.',
    },
    {
      key: 'paeds_safeguarding',
      label: 'Awareness of Paediatric safeguarding',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Awareness of safeguarding principles, recognition of risk, and knowledge of escalation routes (Level 1/2 safeguarding training expected).',
    },
    {
      key: 'clinical_capabilities',
      label: 'Transferable Clinical Capabilities',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Clinical experience, paediatric exposure, transferable skills (communication, decision-making, working with children/families). Scored by 2 RCPCH assessors on written application answer.',
    },
    {
      key: 'personal_achievements',
      label: 'Personal Achievements & Reflection',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Leadership, volunteering, non-clinical achievements, reflective insight. Scored by 2 RCPCH assessors on written application answer.',
    },
    {
      key: 'quality_improvement',
      label: 'Quality Improvement / Audit',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Complete QI/audit cycles, defined role, demonstrated change, re-audit.',
    },
    {
      key: 'academic_achievements',
      label: 'Academic Achievements',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Postgraduate degrees, publications, presentations, intercalated degrees with merit/distinction.',
    },
    {
      key: 'teaching',
      label: 'Teaching Experience',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Formal teaching programmes, regular teaching with feedback, PG Cert in Medical Education.',
    },
  ],
}
