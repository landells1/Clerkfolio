import type { SpecialtyConfig } from './types'
import { UNIVERSAL_ESSENTIALS } from './shared'

// Public Health ST1 2026 — selection is Stage 1 computer-based tests
// (Watson-Glaser critical reasoning + RANRA numerical + SJT) followed by Stage 2
// selection centre. No portfolio self-assessment at application stage.
// Note: PH accepts non-medical applicants too — UKMLA / GMC essentials apply only
// to the medical route.
export const PUBLIC_HEALTH_ST1_2026: SpecialtyConfig = {
  key: 'public_health_st1_2026',
  name: 'Public Health ST1',
  cycleYear: 2026,
  totalMax: 0,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/public-health-st1-2026',
  sourceLabel: 'NHS England — Public Health ST1 2026 Person Specification',
  isOfficial: true,
  scoringType: 'evidence',
  isEvidenceOnly: true,
  domains: [
    ...UNIVERSAL_ESSENTIALS,
    {
      key: 'qualifications',
      label: 'Postgraduate Degrees & Qualifications',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'PhD/MD, Masters (especially MPH or MSc in Public Health / Epidemiology), PG Diploma/Certificate.',
    },
    {
      key: 'publications',
      label: 'Publications',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Peer-reviewed publications, book chapters, case reports, editorials, abstracts — public health, epidemiology and policy work especially relevant.',
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
      label: 'Quality Improvement / Audit / Service Evaluation',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Complete QI/audit cycles, service evaluations, public health intervention evaluations.',
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
      key: 'commitment_public_health',
      label: 'Commitment to Public Health',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'MFPH Part A (DFPH), public health taster/attachment/internship, FPH membership, public health conferences attended, health policy/epidemiology/global health projects, health promotion or advocacy work.',
    },
  ],
}
