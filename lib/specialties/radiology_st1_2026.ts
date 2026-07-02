import type { SpecialtyConfig } from './types'
import { UNIVERSAL_ESSENTIALS } from './shared'

export const RADIOLOGY_ST1_2026: SpecialtyConfig = {
  key: 'radiology_st1_2026',
  name: 'Clinical Radiology ST1',
  cycleYear: 2026,
  totalMax: 24,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/clinical-radiology/core-clinical-radiology/clinical-radiology-st1-portfolio-review-guidance',
  sourceLabel: 'NHS England - Clinical Radiology ST1 Portfolio Review Guidance',
  isOfficial: true,
  scoringType: 'points',
  // Selection pipeline verified 2026-07-02 on the NHS England Core Clinical Radiology
  // 2026 pages: MSRA (minimum 201 in each of the 2 components), then approximately
  // the top 850 invited to upload portfolio evidence and the top 700 invited to
  // interview (two Qpercom stations of up to 15 minutes). "A combination of your
  // MSRA, verified evidence score and total score at interview will be used to
  // determine your final total score and ranking" - NO percentage split is published
  // anywhere on the official pages, so none is asserted here.
  selectionProcess: {
    family: 'self_assessment_points',
    stages: [
      { key: 'msra', label: 'MSRA', notes: 'Minimum cut-off score in each component; ranks candidates for evidence upload and interview invitations' },
      { key: 'portfolio', label: 'Portfolio self-assessment & verified evidence', notes: '5 domains graded A-E; Commitment to Specialty double-weighted' },
      { key: 'interview', label: 'Interview (two stations, up to 15 min each)', notes: 'Final ranking combines MSRA, verified evidence score and interview; no published split' },
    ],
    preInterview: {
      gate: 'msra_rank',
      portfolioCountsPreInterview: false,
      cutoffNotes: 'Minimum MSRA cut-off of 201 in each of the 2 components. In 2025 approximately the top 850 applicants were longlisted and invited to upload evidence, and the top 700 ranked candidates invited to interview.',
    },
  },
  sources: [
    {
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/clinical-radiology/core-clinical-radiology/overview-of-core-training/applying-for-st1-training',
      claim: 'MSRA minimum cut-off is 201 on each of the 2 components; in 2025 approximately the top 850 applicants were longlisted and invited to upload evidence and the top 700 invited to interview. Final ranking combines MSRA, verified evidence score and interview score; no percentage split is published.',
      lastVerified: '2026-07-02',
    },
    {
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/clinical-radiology/core-clinical-radiology/clinical-radiology-st1-portfolio-review-guidance',
      claim: 'Portfolio review domains and A-E grade descriptors, with Commitment to Specialty double-weighted (max 8 points vs 4 for the other domains).',
      lastVerified: '2026-07-02',
    },
    {
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/clinical-radiology-st1-2026',
      claim: 'Entry requirements (essentials), including the 18-month experience cap and documented time observing in a radiology or nuclear medicine department.',
      lastVerified: '2026-07-02',
    },
  ],
  domains: [
    ...UNIVERSAL_ESSENTIALS,
    {
      key: 'radiology_experience_cap',
      label: 'Prior radiology experience ≤18 months WTE',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Whole-time-equivalent experience in Radiology must not exceed 18 months by post start date, with a maximum of 4 months counted at Foundation level. Direct-from-Foundation applicants meet this trivially; relevant mainly for IMGs, LAT/trust-grade, or returners.',
    },
    {
      key: 'radiology_observation',
      label: 'Time observing in a radiology / nuclear medicine department',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Documented time spent in a radiology or nuclear medicine department observing the work of a radiologist (taster, elective, or shadowing). Required as an essential criterion in the 2026 person spec.',
    },
    {
      key: 'commitment_radiology',
      label: 'Commitment to Radiology',
      maxPoints: 8,
      scoringRule: 'highest',
      bands: [
        { label: 'Grade A: Extensive commitment - taster/elective AND society membership AND conference attended AND radiology-specific audit or research or publication', points: 8 },
        { label: 'Grade B: Clear commitment - taster/elective PLUS at least one further activity (society, conference, online course)', points: 6 },
        { label: 'Grade C: Some commitment - attended radiology meeting/course OR completed recognised online radiology course (e.g. Radiology Masterclass) OR radiology taster', points: 4 },
        { label: 'Grade D: Limited - single activity showing specific interest in radiology', points: 2 },
        { label: 'Grade E: No evidence of commitment to radiology', points: 0 },
      ],
      notes: 'Double-weighted domain (max 8 pts vs 4 for others). Final ranking combines MSRA, verified evidence score and interview score; NHS England publishes no percentage split between them.',
    },
    {
      key: 'leadership_management',
      label: 'Leadership & Management',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'Grade A: Significant formal leadership role (committee officer, clinical fellow managing team, foundation rep) with evidence of change or impact', points: 4 },
        { label: 'Grade B: Active involvement in committee/society or completed accredited leadership/management training with evidence of application', points: 3 },
        { label: 'Grade C: Junior committee/society membership OR participated in a management initiative', points: 2 },
        { label: 'Grade D: Minor leadership activity (e.g. rota organiser, mess officer)', points: 1 },
        { label: 'Grade E: No evidence of leadership or management', points: 0 },
      ],
    },
    {
      key: 'teaching_training',
      label: 'Teaching & Training',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'Grade A: Organised and delivered structured teaching programme 3+ months with evidence (timetable, feedback forms, attendance logs)', points: 4 },
        { label: 'Grade B: Regular formal teaching (3+ sessions) with documented feedback evidence, or PG Certificate in Medical Education', points: 3 },
        { label: 'Grade C: Several formal teaching sessions with some documented feedback, or completed teacher training course', points: 2 },
        { label: 'Grade D: Single teaching session or attended a teacher training course only', points: 1 },
        { label: 'Grade E: No teaching experience', points: 0 },
      ],
    },
    {
      key: 'audit_qi',
      label: 'Audit & Quality Improvement',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'Grade A: Led complete QI/audit cycle with documented change and re-audit (closed loop) - all stages from protocol to re-audit', points: 4 },
        { label: 'Grade B: Completed all stages of a single audit or QI cycle including implementation', points: 3 },
        { label: 'Grade C: Participated with a clearly defined role (e.g. data collection, analysis and write-up)', points: 2 },
        { label: 'Grade D: Minor participation only', points: 1 },
        { label: 'Grade E: No involvement in audit or QI', points: 0 },
      ],
    },
    {
      key: 'academic_achievements',
      label: 'Academic Achievements',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'Grade A: PhD/MD by research OR first-author publication in PubMed-indexed journal OR national/international oral presentation (first author)', points: 4 },
        { label: 'Grade B: MSc/MA/MRes by research OR co-author publication in indexed journal OR first-author national/international poster presentation', points: 3 },
        { label: 'Grade C: Intercalated degree (merit/distinction) OR regional presentation OR PG Diploma OR published letter/case report in indexed journal', points: 2 },
        { label: 'Grade D: Intercalated degree (standard pass) OR local presentation OR abstract OR non-peer-reviewed publication', points: 1 },
        { label: 'Grade E: No academic achievements beyond primary medical degree', points: 0 },
      ],
    },
  ],
}
