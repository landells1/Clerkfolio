import type { Guide } from '../types'

// Pillar guide for the ARCP cluster. Facts verified against the cited
// official sources on 2026-07-13.
export const arcpPreparation: Guide = {
  slug: 'arcp-preparation',
  shortTitle: 'ARCP preparation',
  title: 'ARCP preparation: how the Annual Review of Competence Progression works',
  metaTitle: 'ARCP preparation guide for UK foundation doctors - Clerkfolio',
  metaDescription:
    'What ARCP is, what the panel reviews, the outcome codes used in the Foundation Programme, and how to prepare your portfolio evidence through the year. Verified against UKFPO and Gold Guide sources.',
  summary:
    'The ARCP is the annual, evidence-based review that decides whether you progress through UK postgraduate training. This guide explains how the process works for foundation doctors, what the panel actually looks at, and how to have your portfolio ready well before the deadline.',
  cluster: 'arcp',
  isPillar: true,
  published: '2026-07-13',
  lastReviewed: '2026-07-13',
  blocks: [
    {
      kind: 'heading',
      id: 'what-is-arcp',
      text: 'What the ARCP is',
    },
    {
      kind: 'paragraph',
      text: 'The Annual Review of Competence Progression (ARCP) is the formal, summative review of a doctor in training. A panel reviews the evidence in your training portfolio for the year and makes a recommendation to the postgraduate dean about whether you can progress. For foundation doctors, the ARCP judges whether you have demonstrated the minimum expected performance across the 13 Foundation Professional Capabilities (FPCs) set out in the Foundation Programme curriculum.',
    },
    {
      kind: 'paragraph',
      text: 'The process is defined nationally. The Gold Guide (published by the Conference of Postgraduate Medical Deans, currently in its 10th edition, August 2024) sets the framework for ARCPs across UK postgraduate training, and the UK Foundation Programme publishes foundation-specific requirements, including an ARCP checklist of the evidence panels expect to see.',
    },
    {
      kind: 'paragraph',
      text: 'Two things follow from that. First, the ARCP is a review of evidence, not an interview or an exam: in most cases you do not attend, and the panel sees only what is in your portfolio by the deadline. Second, the requirements are published in advance, so there is no mystery about what is expected - the preparation problem is organisational, not academic.',
    },
    {
      kind: 'heading',
      id: 'what-the-panel-reviews',
      text: 'What the panel reviews',
    },
    {
      kind: 'paragraph',
      text: 'For foundation doctors, the panel works from your e-portfolio (Horus in England; the Turas Training Portfolio in Scotland, Wales and Northern Ireland). The headline items on the national ARCP checklist are:',
    },
    {
      kind: 'official',
      title: 'Evidence on the national ARCP checklist',
      items: [
        'GMC registration appropriate to your year: provisional registration with a licence to practise for F1, full registration for F2.',
        '12 months (whole-time equivalent) of training in the year, with no more than 20 days of absence (days you would normally be at work) in each 12-month period.',
        'An educational supervisor end-of-year report, plus educational supervisor end-of-placement reports for every placement except the last of the year.',
        'Clinical supervisor reports for all placements. At least one clinical supervisor report in each year of training must draw on Placement Supervision Group (PSG) feedback.',
        'At least one Team Assessment of Behaviour (TAB) in each year of training.',
        'Evidence in the e-portfolio that you have demonstrated the 13 Foundation Professional Capabilities, including direct observation of a sufficient variety of clinical encounters recorded as Supervised Learning Events (SLEs).',
        'Evidence of engagement with the programme, such as your personal learning log, reflection and portfolio development.',
        'For F1 doctors: successful completion of the Prescribing Safety Assessment (PSA), either within the two years before the programme or during it.',
        'Any additional requirements set by your statutory education body (NHS England, NES, HEIW or NIMDTA) and approved by the UKFP Board - these vary by foundation school, so always check your school\'s local guidance.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'The exact wording and any updates live on the UK Foundation Programme ARCP checklist page, cited below. Foundation schools publish local timelines and may specify how many SLEs they expect per placement, so read your own school\'s ARCP guidance alongside the national checklist.',
    },
    {
      kind: 'heading',
      id: 'arcp-outcomes',
      text: 'ARCP outcomes in the Foundation Programme',
    },
    {
      kind: 'paragraph',
      text: 'The panel records one of a fixed set of outcome codes. In the Foundation Programme the codes in use are:',
    },
    {
      kind: 'official',
      title: 'Foundation ARCP outcome codes',
      items: [
        'Outcome 1 - satisfactory completion of F1.',
        'Outcome 3 - inadequate progress; additional training time required.',
        'Outcome 4 - released from the training programme.',
        'Outcome 5 - incomplete evidence presented; additional training time may be required.',
        'Outcome 6 - recommendation for the award of the Foundation Programme Certificate of Completion (FPCC) at the end of F2.',
        'Outcome 8 - time out of the Foundation Programme.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'An outcome 5 is the one most often caused by portfolio administration rather than performance: it means the panel could not find the evidence it needed by the deadline. The panel sets a revised deadline, and once the missing documentation is received it reconsiders and can issue a different outcome. It is avoidable in the common case where the work was done but never documented, which is why steady evidence-keeping through the year matters.',
    },
    {
      kind: 'heading',
      id: 'timeline',
      text: 'How the year builds towards ARCP',
    },
    {
      kind: 'paragraph',
      text: 'ARCP preparation is spread across the whole training year rather than being a single event. In each placement you have an induction meeting with your supervisors, collect SLEs and other evidence as you work, and close the placement with end-of-placement reviews. TAB and PSG rounds run to local timetables, usually placed so that reports are ready before panels sit. Panels are typically scheduled in the final months of the training year, with a portfolio deadline a few weeks beforehand - your foundation school publishes the exact dates.',
    },
    {
      kind: 'tip',
      title: 'Clerkfolio suggestion: work backwards from the portfolio deadline',
      text: 'Take your school\'s published portfolio deadline and put three earlier dates in your diary: one to trigger your TAB round early in the relevant window (it needs multiple colleagues to respond, which takes time you do not control), one mid-year check that every capability has at least some linked evidence, and one final review a month before the deadline to close gaps while there is still time to act. This is our practical suggestion, not an official requirement.',
    },
    {
      kind: 'heading',
      id: 'preparing-evidence',
      text: 'Preparing your evidence',
    },
    {
      kind: 'paragraph',
      text: 'The panel\'s question is simple: does the portfolio show, capability by capability, that you met the curriculum? The strongest preparation is therefore mapping - knowing which of your entries evidences which capability, and where the thin spots are. The supporting guides in this cluster cover the main evidence types in detail:',
    },
    {
      kind: 'guideList',
      items: [
        { slug: 'foundation-arcp-evidence-requirements', text: 'The full F1 and F2 evidence requirements, HLOs and FPCs' },
        { slug: 'documenting-teaching-portfolio', text: 'Recording teaching you deliver so it counts' },
        { slug: 'documenting-audit-qip', text: 'Running and writing up an audit or quality improvement project' },
        { slug: 'reflective-practice-portfolio', text: 'Writing reflections that meet the official guidance' },
        { slug: 'common-medical-portfolio-mistakes', text: 'The habits that commonly cause last-minute problems' },
      ],
    },
    {
      kind: 'tip',
      title: 'Clerkfolio suggestion: keep a portfolio that outlives the training year',
      text: 'Horus and Turas are the systems of record for ARCP, and nothing replaces them for sign-off. Alongside them, many doctors keep their own longitudinal record, because training portfolios are tied to a stage and system while your evidence keeps being useful for years - specialty applications, interviews and appraisals all draw on the same audits, teaching and reflections. Clerkfolio is built for that career-long record: you log evidence once, map it to what you need now (including ARCP capabilities), and it stays yours when you change trust, deanery or nation.',
    },
  ],
  sources: [
    {
      label: 'ARCP checklist, UK Foundation Programme',
      url: 'https://foundationprogramme.nhs.uk/curriculum/annual-review-of-competence-progression-arcp/arcp-checklist/',
      jurisdiction: 'UKFPO - UK-wide',
    },
    {
      label: 'Annual Review of Competence Progression (ARCP), UK Foundation Programme',
      url: 'https://foundationprogramme.nhs.uk/curriculum/annual-review-of-competence-progression-arcp/',
      jurisdiction: 'UKFPO - UK-wide',
    },
    {
      label: 'Gold Guide, 10th edition (August 2024)',
      url: 'https://www.copmed.org.uk/publications/gold-guide',
      jurisdiction: 'COPMeD - UK-wide',
    },
    {
      label: 'UK Foundation Programme Curriculum',
      url: 'https://foundationprogramme.nhs.uk/curriculum/uk-fp-curriculum/',
      jurisdiction: 'UKFPO - UK-wide',
    },
  ],
  related: [
    'foundation-arcp-evidence-requirements',
    'documenting-teaching-portfolio',
    'documenting-audit-qip',
    'reflective-practice-portfolio',
    'common-medical-portfolio-mistakes',
  ],
}
