import type { Guide } from '../types'

// Supporting guide, specialty-applications cluster. Facts mirror
// lib/specialties/cst_2026.ts and were re-verified against the NHS England
// core surgery pages on 2026-07-13.
export const cstPortfolioGuide: Guide = {
  slug: 'cst-portfolio-guide',
  shortTitle: 'CST portfolio station',
  title: 'CST applications: how the portfolio station is graded and what to upload',
  metaTitle: 'CST portfolio guide (2026): A to E grading, index page, evidence - Clerkfolio',
  metaDescription:
    'The Core Surgical Training portfolio explained: MSRA shortlisting, the 10/45/45 selection weighting, the A to E evidence grades, the mandatory index page, and what counts as operative experience. Verified against NHS England guidance.',
  summary:
    'Core Surgical Training does not score a self-assessment. You are shortlisted on the MSRA, and your portfolio is graded by assessors at interview - 45% of the final score - against published A to E indicators, with a mandatory index page. This guide explains the 2026 process and the evidence each domain expects.',
  cluster: 'specialty-applications',
  published: '2026-07-13',
  lastReviewed: '2026-07-13',
  blocks: [
    {
      kind: 'heading',
      id: 'how-cst-selection-works',
      text: 'How CST selection works',
    },
    {
      kind: 'paragraph',
      text: 'CST selection has a different shape from self-assessment specialties like IMT. Every longlisted applicant sits the Multi-Specialty Recruitment Assessment (MSRA), and that exam alone forms the basis of the shortlisting score - your portfolio does not influence whether you are interviewed. The portfolio then does its work at the interview itself, as a separately graded station.',
    },
    {
      kind: 'official',
      title: 'The 2026 selection weighting',
      items: [
        'Shortlisting: the MSRA forms the basis of the shortlisting score.',
        'Final selection score: MSRA 10%, portfolio station score 45%, and management and clinical station score 45%.',
        'Portfolio station: assessors have a 15 minute window to review the uploaded evidence, then the candidate joins and is asked questions about two of their achievements, chosen by the assessors at the time of evidence review.',
        'Evidence is graded against published A to E indicators for each domain, where A is the highest level and E reflects minimal or no evidence.',
        'An index page for the uploaded evidence is mandatory - candidates who fail to include the index sheet score 0 for their portfolio evidence.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'Two consequences follow. First, MSRA preparation and portfolio preparation are both load-bearing, on different timelines: the MSRA decides whether you are in the room, the portfolio then carries almost half the final score. Second, presentation matters unusually much - assessors grade what they can find and verify in a 15 minute review, and the index page rule makes disorganised evidence literally worthless.',
    },
    {
      kind: 'heading',
      id: 'the-domains',
      text: 'What the portfolio domains expect',
    },
    {
      kind: 'paragraph',
      text: 'The portfolio guidance for candidates (cited below) publishes the domains and the A to E indicator wording for each. For the 2026 cycle the graded domains cover surgical experience, quality improvement or clinical audit, presentations and publications, and teaching experience. The evidence rules are specific and worth reading in their exact current wording:',
    },
    {
      kind: 'official',
      title: 'Evidence rules from the 2026 portfolio guidance',
      items: [
        'Operative experience is evidenced with a verified eLogbook consolidation report signed by a consultant, and for 2026 ITU placements do not count as surgical specialty experience for the operative domain.',
        'Surgical electives (4 or more weeks) and tasters (minimum 5 days) count, evidenced with a supervisor letter on official letterhead - for 2026, Foundation programme placements are excluded from this domain, so only electives and tasters outside training count.',
        'Quality improvement or audit should be surgically themed, with closed-loop work preferred - protocol, data, change implementation, re-audit and departmental presentation.',
        'Presentations count from peer-reviewed medical meetings only (pay-to-present events are excluded); publications should be PubMed-catalogued, with in-press work accepted alongside its acceptance letter.',
        'Teaching experience expects organised, formal teaching with a full evidence pack - programme outline, timetable, sign-off letters, feedback forms and attendance logs.',
        'Eligibility: whole-time-equivalent experience in surgical specialties (excluding Foundation placements) must not exceed 18 months by the post start date.',
      ],
    },
    {
      kind: 'heading',
      id: 'preparing-the-upload',
      text: 'Preparing the upload',
    },
    {
      kind: 'paragraph',
      text: 'Because assessors review for 15 minutes and then question you on two achievements they choose, the winning upload is small, indexed and verifiable: one document per claim, each showing the specific fact the indicator asks for (your author position, the number of cases, the signed letterhead), ordered to match the index page. Anything an assessor cannot verify in the time available is effectively not there.',
    },
    {
      kind: 'guideList',
      items: [
        { slug: 'documenting-audit-qip', text: 'Building the closed-loop audit evidence the QI domain prefers' },
        { slug: 'documenting-teaching-portfolio', text: 'Assembling the teaching evidence pack - feedback, timetables and sign-off' },
        { slug: 'specialty-training-applications', text: 'How the CST route compares with self-assessment specialties' },
      ],
    },
    {
      kind: 'tip',
      title: 'Clerkfolio suggestion: build the index page from your log, not your memory',
      text: 'Keep every surgical logbook consolidation, elective letter, audit report and teaching feedback form attached to a dated entry as you earn it. When the application window opens, assembling the upload becomes a filtering exercise: pick the strongest item per domain, export, and write the index from what is in front of you. Clerkfolio stores the evidence files against each entry and tracks the published CST framework, so you can see which domains are thin while there is still time to act.',
    },
  ],
  sources: [
    {
      label: 'Core surgical training portfolio guidance for candidates, NHS England medical hub',
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/surgery/core-surgery/core-surgical-training-portfolio-guidance-for-candidates',
      jurisdiction: 'NHS England - UK-wide recruitment',
    },
    {
      label: 'Applying for core surgical training, NHS England medical hub',
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/surgery/core-surgery/overview-of-core-surgery-training/applying-for-core-training',
      jurisdiction: 'NHS England - UK-wide recruitment',
    },
  ],
  related: [
    'specialty-training-applications',
    'imt-portfolio-guide',
    'documenting-audit-qip',
    'documenting-teaching-portfolio',
  ],
}
