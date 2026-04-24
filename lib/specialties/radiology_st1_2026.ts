import type { SpecialtyConfig } from './types'

export const RADIOLOGY_ST1_2026: SpecialtyConfig = {
  key: 'radiology_st1_2026',
  name: 'Clinical Radiology ST1',
  cycleYear: 2026,
  totalMax: 24,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/clinical-radiology/core-clinical-radiology/clinical-radiology-st1-portfolio-review-guidance',
  sourceLabel: 'NHS England — Clinical Radiology ST1 Portfolio Review Guidance',
  isOfficial: true,
  domains: [
    {
      key: 'commitment_radiology',
      label: 'Commitment to Radiology',
      maxPoints: 8,
      scoringRule: 'highest',
      bands: [
        { label: 'Grade A: Extensive commitment — taster/elective AND society membership AND conference attended AND radiology-specific audit or research or publication', points: 8 },
        { label: 'Grade B: Clear commitment — taster/elective PLUS at least one further activity (society, conference, online course)', points: 6 },
        { label: 'Grade C: Some commitment — attended radiology meeting/course OR completed recognised online radiology course (e.g. Radiology Masterclass) OR radiology taster', points: 4 },
        { label: 'Grade D: Limited — single activity showing specific interest in radiology', points: 2 },
        { label: 'Grade E: No evidence of commitment to radiology', points: 0 },
      ],
      notes: 'Double-weighted domain (max 8 pts vs 4 for others). Portfolio accounts for 30% of final ranking; interview 70%.',
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
        { label: 'Grade A: Led complete QI/audit cycle with documented change and re-audit (closed loop) — all stages from protocol to re-audit', points: 4 },
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
