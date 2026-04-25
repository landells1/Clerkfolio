import type { SpecialtyConfig } from './types'

export const IMT_2026: SpecialtyConfig = {
  key: 'imt_2026',
  name: 'IMT',
  cycleYear: 2026,
  totalMax: 35,
  source: 'https://www.imtrecruitment.org.uk/recruitment-process/applying/application-scoring',
  sourceLabel: 'IMT Recruitment — Application Scoring',
  isOfficial: true,
  scoringType: 'points',
  bonusOptions: [
    {
      key: 'imt_only',
      label: 'Applying only to IMT/ACCS-IM in Round 1 (5 pts)',
      points: 5,
    },
  ],
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
      notes: 'Intercalated degrees excluded. Teaching qualifications belong in Training in Teaching.',
    },
    {
      key: 'presentations',
      label: 'Presentations & Posters',
      maxPoints: 6,
      scoringRule: 'highest',
      bands: [
        { label: 'Oral 1st/2nd author national/international', points: 6 },
        { label: 'Poster 1st/2nd author national/international', points: 4 },
        { label: 'Oral 1st/2nd author regional', points: 3 },
        { label: 'Oral or poster 1st/2nd author local', points: 2 },
      ],
    },
    {
      key: 'publications',
      label: 'Publications',
      maxPoints: 8,
      scoringRule: 'highest',
      bands: [
        { label: 'First/joint-first/corresponding author original research (PubMed/in press)', points: 8 },
        { label: 'Co-author original research (PubMed/in press)', points: 6 },
        { label: 'Multiple other publications (editorials/reviews/case reports/letters, 2+)', points: 5 },
        { label: 'Book chapter author', points: 5 },
        { label: 'Single other publication (editorial/review/abstract/case report/letter)', points: 3 },
        { label: 'Published abstracts or non-peer-reviewed articles', points: 1 },
      ],
      notes: 'Claim your single highest-scoring achievement. Same work can count across domains.',
    },
    {
      key: 'teaching_experience',
      label: 'Teaching Experience',
      maxPoints: 5,
      scoringRule: 'highest',
      bands: [
        { label: 'Organised teaching programme with regular teaching 3+ months with formal feedback', points: 5 },
        { label: 'Regular teaching in defined programme 3+ months with formal feedback', points: 3 },
        { label: 'Occasional teaching with formal feedback (min. 3 sessions, under 3 months)', points: 1 },
      ],
    },
    {
      key: 'training_in_teaching',
      label: 'Training in Teaching',
      maxPoints: 3,
      scoringRule: 'highest',
      bands: [
        { label: 'Higher qualification in teaching (PG Cert/Diploma, university accredited, 60+ credits)', points: 3 },
        { label: 'Teaching training course (6+ synchronous hours)', points: 1 },
      ],
      notes: 'Teaching-focused postgraduate qualifications go here, not in Qualifications section.',
    },
    {
      key: 'quality_improvement',
      label: 'Quality Improvement',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'All stages of 2 complete QI/audit cycles', points: 4 },
        { label: 'Some stages of 2 cycles OR all stages of 1 complete cycle', points: 3 },
        { label: 'Some stages of a single cycle', points: 1 },
      ],
    },
  ],
}
