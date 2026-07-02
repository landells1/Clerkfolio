import type { SpecialtyConfig } from './types'
import { UNIVERSAL_ESSENTIALS } from './shared'

// ACCS Anaesthetics CT1 2026 - shares the Anaesthetics CT1 person specification.
// Selection is MSRA + interview (two 15-min stations); no per-band points published.
// ACCS variant rotates through Anaesthetics, EM, Acute Medicine and ICM in CT1–CT2.
// Verified 2026-07-02 from the official ANRO "CT1 Core Anaesthetics/ACCS Anaesthetics
// Applicant Guidance R1 Aug 2026" PDF: "Anaesthetics and ACCS (Anaesthetics)
// applicants are recruited in one process and therefore require only one application";
// "an applicant's MSRA score will contribute 15% towards their total selection score"
// (PD and CPS papers 7.5% each); interview = Clinical Judgement + General stations,
// 15 min each via Qpercom - the only other component, hence 85%.
// The previous "Advanced life support skills" domain claimed ALS was "listed as
// desirable in the 2026 person spec" - it is not (absent from both the fetched person
// spec and the ANRO guidance), so that unsourced domain was removed 2026-07-02.
export const ACCS_ANAES_2026: SpecialtyConfig = {
  key: 'accs_anaes_2026',
  name: 'ACCS (Anaesthetics) CT1',
  cycleYear: 2026,
  totalMax: 0,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/anaesthetics-and-acute-care-common-stem-accs-anaesthetics-ct1-2026',
  sourceLabel: 'NHS England - Anaesthetics / ACCS Anaesthetics CT1 2026 Person Specification',
  isOfficial: true,
  scoringType: 'evidence',
  isEvidenceOnly: true,
  selectionProcess: {
    family: 'msra_interview',
    stages: [
      { key: 'msra', label: 'MSRA', weightPct: 15, notes: 'Professional Dilemmas and Clinical Problem Solving papers weighted equally at 7.5% each; no MSRA cut-off, but interview invitations are ranked on it' },
      { key: 'interview', label: 'Interview: Clinical Judgement + General stations (15 min each)', weightPct: 85, notes: 'Two-station online format via Qpercom; single joint process with Core Anaesthetics CT1' },
    ],
    recruitmentOffice: {
      name: 'ANRO',
      url: 'https://anro.wm.hee.nhs.uk/ct1',
    },
  },
  domains: [
    ...UNIVERSAL_ESSENTIALS,
    {
      key: 'anaesthetics_experience_cap',
      label: 'Prior anaesthetics experience ≤24 months WTE',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Whole-time-equivalent experience in Anaesthetics (excluding Foundation modules) must not exceed 24 months by post start date. Direct-from-Foundation applicants meet this trivially; relevant mainly for IMGs, LAT/trust-grade, or returners.',
    },
    {
      key: 'qualifications',
      label: 'Postgraduate Degrees & Qualifications',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'PhD/MD, Masters, PG Diploma/Certificate, intercalated honours degrees with classification.',
    },
    {
      key: 'publications',
      label: 'Publications',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Peer-reviewed publications (PubMed-indexed), book chapters, case reports, editorials, abstracts.',
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
      notes: 'Formal teaching programmes, regular teaching sessions with feedback, teaching qualifications.',
    },
    {
      key: 'commitment_acute_care',
      label: 'Commitment to Acute Care / ACCS',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Demonstrable interest in the four ACCS pillars (Anaesthetics, EM, Acute Medicine, ICM): tasters, electives, ATLS/APLS, ALERT, RCoA / RCEM / FICM engagement, acute-care conferences.',
    },
    {
      key: 'commitment_anaesthetics',
      label: 'Commitment to Anaesthetics',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'desirable',
      isEvidenceOnly: true,
      notes: 'Primary FRCA progress, anaesthetics taster/elective, RCoA membership, anaesthetics or critical care conferences attended.',
    },
  ],
}
