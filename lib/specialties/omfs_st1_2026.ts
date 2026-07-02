import type { SpecialtyConfig } from './types'
import { UNIVERSAL_ESSENTIALS } from './shared'

// OMFS ST1 2026 - Oral and Maxillofacial Surgery. Requires dual qualification:
// a registerable medical degree AND "full General Dental Council registration or a
// fully UK registerable dental qualification at the advertised post start date"
// (2026 person spec, verified 2026-07-02).
// Selection re-verified 2026-07-02: OMFS ST1 does NOT use the MSRA - it is absent
// from NHS England's official list of MSRA-recruiting specialties. Selection is a
// portfolio-based interview (2 Feb 2026 per the NHS England specialty recruitment
// interview schedule), nationally coordinated by NHS England South West (Severn);
// the Severn self-assessment/evidence detail pages are currently unreachable
// (broken redirects severndeanery.nhs.uk -> southwest.pgmdeducation.nhs.uk), so no
// self-assessment mechanics are asserted here. Evidence-based config.
export const OMFS_ST1_2026: SpecialtyConfig = {
  key: 'omfs_st1_2026',
  name: 'OMFS ST1',
  cycleYear: 2026,
  totalMax: 0,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/oral-and-maxillofacial-surgery-st1-2026',
  sourceLabel: 'NHS England - Oral and Maxillofacial Surgery ST1 2026 Person Specification',
  isOfficial: true,
  scoringType: 'evidence',
  isEvidenceOnly: true,
  selectionProcess: {
    family: 'portfolio_graded_interview',
    stages: [
      { key: 'interview', label: 'Portfolio-based interview', notes: 'No MSRA for OMFS ST1; portfolio evidence assessed as part of the national interview process' },
    ],
  },
  domains: [
    ...UNIVERSAL_ESSENTIALS,
    {
      key: 'omfs_dental_qualification',
      label: 'Registerable dental qualification & GDC registration',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Hold full General Dental Council registration, or a fully UK-registerable dental qualification (BDS or equivalent), by post start date - required on top of the medical degree and GMC registration.',
    },
    {
      key: 'qualifications',
      label: 'Postgraduate Degrees & Qualifications',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'BA or MSc qualification (intercalated BSc explicitly excluded by 2026 person spec). MFDS / MJDF / MRCS membership, MRD examinations, postgraduate dental/medical research degrees.',
    },
    {
      key: 'publications',
      label: 'Publications',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'PubMed-indexed peer-reviewed publications, book chapters, case reports, editorials, abstracts. OMFS-related publications particularly valued.',
    },
    {
      key: 'presentations',
      label: 'Presentations & Posters',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Oral and poster presentations at international, national, regional and local meetings (e.g. BAOMS, EACMFS, IAOMS).',
    },
    {
      key: 'quality_improvement',
      label: 'Quality Improvement / Audit',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Closed-loop QI/audit cycles with documented change and re-audit. OMFS or dental-themed projects particularly valued.',
    },
    {
      key: 'teaching',
      label: 'Teaching Experience',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Organised teaching programmes with feedback, regular teaching to medical / dental students, PG Cert in Medical Education or equivalent.',
    },
    {
      key: 'omfs_clinical_experience',
      label: 'OMFS Clinical Experience',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Documented evidence of clinical experience working full-time or part-time in OMFS (DCT/DF posts, OMFS SHO, trust-grade OMFS, dental hospital placements).',
    },
    {
      key: 'commitment_omfs',
      label: 'Commitment to OMFS',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'OMFS taster/elective, BAOMS membership (including student/junior), basic surgical skills courses, OMFS-specific courses (e.g. AO CMF, head-and-neck anatomy), portfolio of OMFS-relevant learning and CPD.',
    },
  ],
}
