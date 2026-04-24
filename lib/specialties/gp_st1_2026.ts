import type { SpecialtyConfig } from './types'

export const GP_ST1_2026: SpecialtyConfig = {
  key: 'gp_st1_2026',
  name: 'GP ST1',
  cycleYear: 2026,
  totalMax: 26,
  source: 'https://gprecruitment.hee.nhs.uk/',
  sourceLabel: 'NHS England — GP Recruitment',
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
      notes: '⚠️ GP ST1 2026 selection is MSRA-only — no portfolio scoring at application stage. This config is for portfolio-building reference only. Verify domains with official person spec.',
    },
    {
      key: 'publications',
      label: 'Research & Publications',
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
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'Oral 1st/2nd author national/international', points: 4 },
        { label: 'Poster 1st/2nd author national/international', points: 3 },
        { label: 'Oral or poster regional', points: 2 },
        { label: 'Oral or poster local', points: 1 },
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
      maxPoints: 3,
      scoringRule: 'highest',
      bands: [
        { label: 'Organised or led formal teaching programme 3+ months with feedback', points: 3 },
        { label: 'Regular formal teaching sessions with documented feedback', points: 2 },
        { label: 'Occasional formal teaching with some evidence', points: 1 },
      ],
    },
    {
      key: 'commitment_gp',
      label: 'Commitment to General Practice',
      maxPoints: 5,
      scoringRule: 'cumulative_capped',
      isCheckbox: true,
      bands: [
        { label: 'GP taster week or additional GP attachment (beyond standard rotations)', points: 1 },
        { label: 'Member of RCGP or GP student society', points: 1 },
        { label: 'National GP or primary care conference attended (1st)', points: 1 },
        { label: 'National GP or primary care conference attended (2nd)', points: 1 },
        { label: 'Primary care or community health project/audit', points: 1 },
        { label: 'Volunteering or social prescribing work relevant to primary care', points: 1 },
        { label: 'Mental health, substance misuse or public health initiative', points: 1 },
      ],
      notes: 'Points capped at 5.',
    },
  ],
}
