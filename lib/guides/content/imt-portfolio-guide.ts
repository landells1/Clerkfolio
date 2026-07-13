import type { Guide } from '../types'

// Supporting guide, specialty-applications cluster. The domain bands mirror
// lib/specialties/imt-2026.ts and were re-verified against the official IMT
// Recruitment application-scoring page on 2026-07-13.
export const imtPortfolioGuide: Guide = {
  slug: 'imt-portfolio-guide',
  shortTitle: 'IMT portfolio and self-assessment',
  title: 'IMT applications: how the 30-point self-assessment is scored',
  metaTitle: 'IMT portfolio guide (2026): self-assessment scoring explained - Clerkfolio',
  metaDescription:
    'The IMT application self-assessment explained: the 6 scored domains, the points bands for qualifications, presentations, publications, teaching and QI, and the 5-point IMT-only bonus. Verified against IMT Recruitment.',
  summary:
    'Internal Medicine Training scores applicants on a 30-point self-assessment across six achievement domains, plus a 5-point bonus for applying only to IMT. This guide walks through each domain\'s bands for the 2026 cycle, how "highest band counts" scoring works, and the evidence worth keeping for every claim.',
  cluster: 'specialty-applications',
  published: '2026-07-13',
  lastReviewed: '2026-07-13',
  blocks: [
    {
      kind: 'heading',
      id: 'how-imt-selection-works',
      text: 'How IMT selection works',
    },
    {
      kind: 'paragraph',
      text: 'IMT (and the joint IMT/ACCS-IM vacancy) uses a self-assessment scoring route: you declare your achievements against a published matrix when you apply, and the score ranks you. There is no mystery matrix - IMT Recruitment publishes the domains, the bands and the points for every cycle, so you can score yourself before you apply and see exactly where you stand.',
    },
    {
      kind: 'official',
      title: 'The 2026 self-assessment at a glance',
      items: [
        'A maximum of 30 points across 6 domains: postgraduate degrees and qualifications (4), presentations and posters (6), publications (8), teaching experience (5), training in teaching (3), and quality improvement (4).',
        'Applicants who apply only to the joint IMT/ACCS-IM vacancy in Round 1 of national recruitment are awarded 5 further points - a binary 5 or 0, lost if you hold live applications to other specialties.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'Each domain scores your single highest-qualifying achievement, not everything you have done - three local posters do not add up. That shapes strategy: the marginal point usually comes from reaching a higher band in a weak domain, not from stacking more of what you already have.',
    },
    {
      kind: 'heading',
      id: 'the-domains',
      text: 'The six domains and their top bands',
    },
    {
      kind: 'paragraph',
      text: 'The full band tables live on the IMT Recruitment scoring page cited below and are worth reading in their exact current wording before you claim anything. The shape of each domain for the 2026 cycle:',
    },
    {
      kind: 'official',
      title: 'Domain bands (2026 cycle, highest band counts)',
      items: [
        'Postgraduate degrees and qualifications (max 4): 4 points for a PhD or MD by research, 3 for a masters of 8 or more months, 1 for a postgraduate diploma or certificate. Intercalated degrees are excluded, and teaching qualifications belong in training in teaching instead.',
        'Presentations and posters (max 6): 6 points for a first or second author oral presentation at a national or international meeting, 4 for a national or international poster, 3 for a regional oral, 2 for a local oral or a regional or local poster.',
        'Publications (max 8): 8 points for first, joint-first or corresponding author original research (PubMed-cited or in press), 6 for co-authored original research, 5 for multiple other publications or a book chapter, 3 for a single other publication, 1 for published abstracts or non-peer-reviewed articles.',
        'Teaching experience (max 5): 5 points for organising a teaching programme with regular teaching over 3 or more months with formal feedback, 3 for regular teaching within a defined programme over 3 or more months, 1 for occasional teaching with formal feedback.',
        'Training in teaching (max 3): 3 points for a university-accredited higher teaching qualification of 60 or more credits, 1 for a teaching course with 6 or more synchronous hours.',
        'Quality improvement (max 4): 4 points for completing all stages of two full QI or audit cycles, 3 for some stages of two cycles or all of one complete cycle, 1 for some stages of a single cycle.',
      ],
    },
    {
      kind: 'heading',
      id: 'evidence',
      text: 'Evidencing what you claim',
    },
    {
      kind: 'paragraph',
      text: 'A self-assessment is a set of claims, and claims need evidence: certificates, programme letters, feedback summaries, acceptance emails, PubMed IDs, and audit reports with your role stated. Keep the evidence from the moment the work happens - the band definitions are specific (author position, months of duration, formal feedback, complete cycles), so the document you keep needs to show the specific fact the band asks for, not just that the work occurred.',
    },
    {
      kind: 'guideList',
      items: [
        { slug: 'documenting-audit-qip', text: 'What a complete audit or QI cycle looks like and how to write it up' },
        { slug: 'documenting-teaching-portfolio', text: 'Building the feedback trail that teaching bands require' },
        { slug: 'specialty-training-applications', text: 'How the IMT route compares with other specialties\' selection' },
      ],
    },
    {
      kind: 'tip',
      title: 'Clerkfolio suggestion: score yourself long before the application window',
      text: 'Map your existing achievements against the current bands early - ideally in F1, not the week applications open. The two domains applicants most often find thin (training in teaching, and the second complete QI cycle) are exactly the ones that take months to fix. Clerkfolio includes the published IMT framework so you can self-score your logged evidence against it and see your genuine gaps. Self-scoring is your own assessment against the published criteria - it is not a prediction of your application outcome.',
    },
  ],
  sources: [
    {
      label: 'IMT Recruitment - application scoring',
      url: 'https://www.imtrecruitment.org.uk/recruitment-process/applying/application-scoring',
      jurisdiction: 'IMT Recruitment - UK-wide',
    },
    {
      label: 'Medical specialty recruitment, NHS England medical hub',
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training',
      jurisdiction: 'NHS England - England (process applies to UK-wide recruitment)',
    },
  ],
  related: [
    'specialty-training-applications',
    'cst-portfolio-guide',
    'documenting-audit-qip',
    'documenting-teaching-portfolio',
  ],
}
