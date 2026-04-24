import type { SpecialtyConfig } from './types'

export const CORE_PSYCH_2026: SpecialtyConfig = {
  key: 'core_psych_2026',
  name: 'Core Psychiatry Training',
  cycleYear: 2026,
  totalMax: 28,
  source: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/psychiatry/core-psychiatry-training',
  sourceLabel: 'NHS England — Core Psychiatry Training Recruitment',
  isOfficial: false,
  domains: [
    {
      key: 'qualifications',
      label: 'Postgraduate Degrees & Qualifications',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'PhD/MD by research', points: 4 },
        { label: 'Masters (MSc/MA/MRes, 8+ months)', points: 3 },
        { label: 'PG diploma/certificate', points: 1 },
      ],
      notes: '⚠️ CT1 Core Psychiatry 2026 selection is MSRA-only — no portfolio scoring at application stage. This config is for portfolio-building reference only. Verify domains with official person spec.',
    },
    {
      key: 'publications',
      label: 'Publications',
      maxPoints: 6,
      scoringRule: 'highest',
      bands: [
        { label: 'First/joint-first author original research (PubMed-indexed or in press)', points: 6 },
        { label: 'Co-author original research (PubMed-indexed)', points: 4 },
        { label: 'Book chapter or multiple other publications (2+)', points: 4 },
        { label: 'Single publication (editorial/review/case report/letter)', points: 2 },
        { label: 'Published abstract or non-peer-reviewed article', points: 1 },
      ],
    },
    {
      key: 'presentations',
      label: 'Presentations & Posters',
      maxPoints: 5,
      scoringRule: 'highest',
      bands: [
        { label: 'Oral 1st/2nd author national/international', points: 5 },
        { label: 'Poster 1st/2nd author national/international', points: 4 },
        { label: 'Oral 1st/2nd author regional', points: 3 },
        { label: 'Oral or poster local', points: 2 },
      ],
    },
    {
      key: 'quality_improvement',
      label: 'Quality Improvement / Audit',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'All stages of 2 complete QI/audit cycles', points: 4 },
        { label: 'Some stages of 2 cycles OR all stages of 1 complete cycle', points: 3 },
        { label: 'Some stages of a single cycle', points: 1 },
      ],
    },
    {
      key: 'teaching',
      label: 'Teaching Experience',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'Organised teaching programme 3+ months with formal feedback', points: 4 },
        { label: 'Regular teaching in defined programme with formal feedback', points: 3 },
        { label: 'Occasional formal teaching (min. 3 sessions) with feedback', points: 1 },
      ],
    },
    {
      key: 'commitment_psych',
      label: 'Commitment to Psychiatry',
      maxPoints: 5,
      scoringRule: 'cumulative_capped',
      isCheckbox: true,
      bands: [
        { label: 'MRCPsych Paper A attempt or pass', points: 2 },
        { label: 'Psychiatry taster week or elective (outside normal rotations)', points: 1 },
        { label: 'Member of RCPsych or psychiatry society', points: 1 },
        { label: 'National psychiatry conference attended (1st)', points: 1 },
        { label: 'National psychiatry conference attended (2nd)', points: 1 },
        { label: 'Mental health volunteering or advocacy work', points: 1 },
        { label: 'Psychiatry-specific research project or audit', points: 1 },
      ],
      notes: 'Points capped at 5.',
    },
  ],
}
