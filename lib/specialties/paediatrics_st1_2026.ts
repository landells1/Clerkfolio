import type { SpecialtyConfig } from './types'

// Evidence-only config — Paediatrics ST1 2026 application is scored by RCPCH assessors against
// 5 official domains. Per-band point breakdown is in non-public PDF guidance, so this config
// presents the official domain structure for evidence upload only.
export const PAEDIATRICS_ST1_2026: SpecialtyConfig = {
  key: 'paediatrics_st1_2026',
  name: 'Paediatrics ST1',
  cycleYear: 2026,
  totalMax: 0,
  source: 'https://www.rcpch.ac.uk/education-careers/apply-paediatrics/ST1',
  sourceLabel: 'RCPCH — Apply for Paediatrics ST1',
  isOfficial: false,
  isEvidenceOnly: true,
  domains: [
    {
      key: 'clinical_capabilities',
      label: 'Transferable Clinical Capabilities',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      isEvidenceOnly: true,
      notes: 'Clinical experience, paediatric exposure, transferable skills (communication, decision-making, working with children/families). Scored by 2 RCPCH assessors on written application answer.',
    },
    {
      key: 'personal_achievements',
      label: 'Personal Achievements & Reflection',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      isEvidenceOnly: true,
      notes: 'Leadership, volunteering, non-clinical achievements, reflective insight. Scored by 2 RCPCH assessors on written application answer.',
    },
    {
      key: 'quality_improvement',
      label: 'Quality Improvement / Audit',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      isEvidenceOnly: true,
      notes: 'Complete QI/audit cycles, defined role, demonstrated change, re-audit.',
    },
    {
      key: 'academic_achievements',
      label: 'Academic Achievements',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      isEvidenceOnly: true,
      notes: 'Postgraduate degrees, publications, presentations, intercalated degrees with merit/distinction.',
    },
    {
      key: 'teaching',
      label: 'Teaching Experience',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      isEvidenceOnly: true,
      notes: 'Formal teaching programmes, regular teaching with feedback, PG Cert in Medical Education.',
    },
  ],
}
