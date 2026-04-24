import type { SpecialtyConfig } from './types'

// Histopathology ST1 2026 uses an official RCPath / NHS England self-assessment matrix.
// 10 scored domains, total 71 points, scored on Oriel with evidence verification.
export const HISTOPATHOLOGY_ST1_2026: SpecialtyConfig = {
  key: 'histopathology_st1_2026',
  name: 'Histopathology ST1',
  cycleYear: 2026,
  totalMax: 71,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/pathology/histopathology/histopathology-st1-training-self-assessment-scoring-guidance-for-applicants',
  sourceLabel: 'NHS England — Histopathology ST1 Self-Assessment Scoring Guidance',
  isOfficial: true,
  domains: [
    {
      key: 'undergraduate_degrees',
      label: 'Additional Undergraduate Degrees',
      maxPoints: 3,
      scoringRule: 'highest',
      bands: [
        { label: 'Intercalated honours degree with 1st class / distinction', points: 3 },
        { label: 'Intercalated honours degree (2:1 / merit)', points: 2 },
        { label: 'Intercalated degree (pass / 2:2)', points: 1 },
      ],
    },
    {
      key: 'postgraduate_qualifications',
      label: 'Postgraduate Qualifications',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'PhD/MD by research (completed)', points: 4 },
        { label: 'Masters (MSc/MA/MRes/MPhil, 8+ months)', points: 3 },
        { label: 'PG diploma / certificate', points: 1 },
      ],
      notes: 'Intercalated degrees go in the previous domain, not here.',
    },
    {
      key: 'presentations',
      label: 'Presentations & Posters',
      maxPoints: 8,
      scoringRule: 'highest',
      bands: [
        { label: 'Oral 1st/2nd author international', points: 8 },
        { label: 'Oral 1st/2nd author national', points: 6 },
        { label: 'Poster 1st author international', points: 5 },
        { label: 'Oral 1st author regional / Poster national', points: 3 },
        { label: 'Poster regional', points: 2 },
        { label: 'Oral or poster local', points: 1 },
      ],
    },
    {
      key: 'publications',
      label: 'Publications',
      maxPoints: 5,
      scoringRule: 'highest',
      bands: [
        { label: 'First / joint-first author peer-reviewed (PubMed-indexed)', points: 5 },
        { label: 'Co-author peer-reviewed (PubMed-indexed)', points: 3 },
        { label: 'Book chapter or case report / letter (peer-reviewed)', points: 2 },
        { label: 'Published abstract or non-peer-reviewed article', points: 1 },
      ],
    },
    {
      key: 'teaching_experience',
      label: 'Teaching Experience',
      maxPoints: 10,
      scoringRule: 'highest',
      bands: [
        { label: 'Organised and led structured teaching programme 3+ months with formal feedback to multiple learners', points: 10 },
        { label: 'Regular formal teaching 3+ months with documented feedback', points: 7 },
        { label: 'Multiple formal teaching sessions (3+) with feedback', points: 4 },
        { label: 'Occasional formal teaching', points: 2 },
        { label: 'Informal teaching only', points: 1 },
      ],
    },
    {
      key: 'teaching_training',
      label: 'Training in Teaching',
      maxPoints: 5,
      scoringRule: 'highest',
      bands: [
        { label: 'PG Certificate / Diploma / Masters in Medical Education (60+ credits)', points: 5 },
        { label: 'Shorter accredited teaching qualification (under 60 credits)', points: 3 },
        { label: 'Teaching training course (6+ synchronous hours)', points: 1 },
      ],
    },
    {
      key: 'quality_improvement',
      label: 'Quality Improvement / Audit',
      maxPoints: 10,
      scoringRule: 'highest',
      bands: [
        { label: 'Led complete QI/audit cycle with implementation, re-audit (closed loop), and presentation', points: 10 },
        { label: 'Led complete QI/audit cycle with re-audit', points: 7 },
        { label: 'All stages of a single cycle including implementation', points: 4 },
        { label: 'Participated in QI/audit with defined role (e.g. data collection + analysis)', points: 2 },
        { label: 'Minor participation only', points: 1 },
      ],
    },
    {
      key: 'leadership_management',
      label: 'Leadership & Management',
      maxPoints: 8,
      scoringRule: 'highest',
      bands: [
        { label: 'Significant formal leadership role (committee officer, chief/lead) with formal training and evidence of change', points: 8 },
        { label: 'Active committee / society role with formal leadership training', points: 5 },
        { label: 'Junior committee / society membership or completed leadership course', points: 3 },
        { label: 'Minor leadership activity (e.g. rota organiser, mess officer)', points: 1 },
      ],
    },
    {
      key: 'histopathology_commitment',
      label: 'Commitment to Histopathology',
      maxPoints: 10,
      scoringRule: 'highest',
      bands: [
        { label: 'FRCPath Part 1 pass', points: 10 },
        { label: 'FRCPath Part 1 attempt (no pass)', points: 5 },
        { label: 'Histopathology taster/elective PLUS attendance at national histopathology conference', points: 3 },
        { label: 'Histopathology taster week / elective / attachment (outside normal rotations)', points: 2 },
        { label: 'National histopathology conference attended, OR histopathology-specific online course', points: 1 },
      ],
    },
    {
      key: 'histopathology_activities',
      label: 'Histopathology-Specific Activities',
      maxPoints: 8,
      scoringRule: 'highest',
      bands: [
        { label: 'Histopathology-specific peer-reviewed publication AND audit/research project completed', points: 8 },
        { label: 'Histopathology-specific peer-reviewed publication OR major histopathology project completed', points: 5 },
        { label: 'Histopathology-specific audit, QI or research project (not yet published)', points: 3 },
        { label: 'Some histopathology-specific project work (e.g. case series, poster)', points: 1 },
      ],
      notes: 'Evidence verified by assessor panel — scores may be reduced where evidence is insufficient.',
    },
  ],
}
