import type { Guide } from '../types'

// Facts verified against the cited official sources on 2026-07-13.
export const foundationArcpEvidenceRequirements: Guide = {
  slug: 'foundation-arcp-evidence-requirements',
  shortTitle: 'Foundation evidence requirements',
  title: 'Foundation Programme evidence requirements: what F1 and F2 doctors need for ARCP',
  metaTitle: 'F1 and F2 ARCP evidence requirements explained - Clerkfolio',
  metaDescription:
    'The evidence FY1 and FY2 doctors need for ARCP: supervisor reports, TAB, PSG, SLEs, the PSA, and how the 13 Foundation Professional Capabilities and 3 HLOs fit together in Horus and Turas.',
  summary:
    'The Foundation Programme publishes exactly what evidence an ARCP panel expects from F1 and F2 doctors. This guide walks through the national checklist item by item, explains the curriculum structure behind it (3 HLOs, 13 FPCs), and covers how evidence mapping works in Horus and Turas.',
  cluster: 'arcp',
  published: '2026-07-13',
  lastReviewed: '2026-07-13',
  blocks: [
    {
      kind: 'heading',
      id: 'curriculum-structure',
      text: 'The curriculum behind the checklist',
    },
    {
      kind: 'paragraph',
      text: 'Foundation training runs on the UK Foundation Programme Curriculum (the 2021 curriculum, refreshed in a 2026 revision). Everything the ARCP panel asks for exists to show you have met that curriculum, so it helps to know its shape before listing the paperwork.',
    },
    {
      kind: 'paragraph',
      text: 'The curriculum is organised into three Higher Level Outcomes (HLOs), each subdivided into Foundation Professional Capabilities (FPCs) - 13 in total:',
    },
    {
      kind: 'official',
      title: 'The 3 HLOs and 13 FPCs',
      items: [
        'HLO 1: An accountable, capable and compassionate doctor - FPC 1 Clinical assessment, FPC 2 Clinical prioritisation, FPC 3 Holistic planning, FPC 4 Communication and care, FPC 5 Continuity of care.',
        'HLO 2: A valuable member of the healthcare workforce - FPC 6 Sharing the vision, FPC 7 Fitness to practise, FPC 8 Upholding values, FPC 9 Quality improvement, FPC 10 Teaching the teacher.',
        'HLO 3: A professional, responsible for their own practice and portfolio development - FPC 11 Ethics and law, FPC 12 Continuing professional development, FPC 13 Understanding medicine.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'Your job across the year is to accumulate portfolio evidence that, mapped against those 13 capabilities, demonstrates the minimum expected performance for your year of training. The panel reads the mapping, not a pile of unsorted documents.',
    },
    {
      kind: 'heading',
      id: 'national-checklist',
      text: 'The national ARCP checklist, item by item',
    },
    {
      kind: 'paragraph',
      text: 'The UK Foundation Programme publishes an ARCP checklist that panels work from. The requirements below are national; your foundation school can add local requirements on top (approved by the UKFP Board), so treat this as the floor, not the whole picture.',
    },
    {
      kind: 'subheading',
      text: 'Registration and time in training',
    },
    {
      kind: 'official',
      title: 'Registration, duration and absence',
      items: [
        'F1: provisional registration and a licence to practise with the GMC. F2: full registration and a licence to practise.',
        '12 months of whole-time-equivalent training per year of the programme.',
        'No more than 20 days of absence (on days you would normally be at work) in each 12-month period - beyond that, your progression date is normally reviewed.',
      ],
    },
    {
      kind: 'subheading',
      text: 'Supervisor reports',
    },
    {
      kind: 'official',
      title: 'Supervision evidence',
      items: [
        'An educational supervisor (ES) end-of-year report - the single most important summary document the panel reads.',
        'ES end-of-placement reports for every placement except the last of the year (the end-of-year report covers that one).',
        'Clinical supervisor (CS) reports for all placements.',
        'At least one CS report per training year must make use of Placement Supervision Group (PSG) feedback - the structured feedback collected from the senior team you worked with.',
      ],
    },
    {
      kind: 'subheading',
      text: 'Feedback and observed practice',
    },
    {
      kind: 'official',
      title: 'TAB, PSG and SLEs',
      items: [
        'At least one Team Assessment of Behaviour (TAB) per training year - multi-source feedback from a spread of colleagues.',
        'At least one Placement Supervision Group report per training year.',
        'Supervised Learning Events (SLEs) showing direct observation of a sufficient variety of clinical encounters across the curriculum, including physical health, mental health and social health presentations.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'The national checklist deliberately asks for a "sufficient variety" of SLEs rather than one fixed number for everything; foundation schools often publish their own expected counts per placement. The SLE forms available in the e-portfolios include the mini-clinical evaluation exercise (mini-CEX), case-based discussion (CBD), direct observation of procedural skills (DOPS) and developing the clinical teacher (DCT), plus the F1 core procedures list.',
    },
    {
      kind: 'subheading',
      text: 'Exams, engagement and everything else',
    },
    {
      kind: 'official',
      title: 'Remaining national items',
      items: [
        'F1: successful completion of the Prescribing Safety Assessment (PSA), within the two years before the programme or during it.',
        'Evidence of engagement with the programme: personal learning log, reflective entries and ongoing portfolio development.',
        'Completion of any additional requirements set by NHS England, NES, HEIW or NIMDTA for your school - commonly things like mandatory teaching attendance or life-support certification; the specifics are local, so check your foundation school\'s guidance.',
      ],
    },
    {
      kind: 'heading',
      id: 'eportfolio-mapping',
      text: 'How evidence mapping works in Horus and Turas',
    },
    {
      kind: 'paragraph',
      text: 'Foundation doctors in England use the Horus ePortfolio (an NHS England product); Scotland, Wales and Northern Ireland use the Turas Training Portfolio (NHS Education for Scotland). Both hold the same nationally agreed core content and both work by mapping: you link a portfolio item (an SLE, a reflection, a certificate) to the capabilities it evidences.',
    },
    {
      kind: 'official',
      title: 'Mapping limits under the 2021 curriculum',
      items: [
        'A portfolio item can be mapped to a maximum of 3 FPCs.',
        'A maximum of 10 portfolio items can be mapped to each FPC.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'The 10-item cap is a quality signal, not a target: the system is telling you that panels want a curated, representative set per capability rather than everything you can find. The 3-FPC cap means you cannot stretch one strong piece of evidence across the whole curriculum - variety is unavoidable by design.',
    },
    {
      kind: 'tip',
      title: 'Clerkfolio suggestion: log evidence the week it happens',
      text: 'Most missing ARCP evidence was real work that never got written down: the teaching session with no record, the audit presentation with no slides saved, the feedback conversation with no note. A short entry made the same week - what happened, when, your role, any document attached - preserves the details you will not remember in month ten. Clerkfolio\'s categories mirror the kinds of evidence foundation portfolios need (teaching, QIP, procedures, reflections), and its ARCP view lets you link each entry to foundation capabilities so you can see per-capability coverage at a glance. It complements Horus and Turas; official sign-off always happens in your deanery\'s system.',
    },
  ],
  sources: [
    {
      label: 'ARCP checklist, UK Foundation Programme',
      url: 'https://foundationprogramme.nhs.uk/curriculum/annual-review-of-competence-progression-arcp/arcp-checklist/',
      jurisdiction: 'UKFPO - UK-wide',
    },
    {
      label: 'UK Foundation Programme Curriculum (2021, 2026 revision)',
      url: 'https://foundationprogramme.nhs.uk/curriculum/uk-fp-curriculum/',
      jurisdiction: 'UKFPO - UK-wide',
    },
    {
      label: 'e-portfolio, UK Foundation Programme',
      url: 'https://foundationprogramme.nhs.uk/curriculum/e-portfolio/',
      jurisdiction: 'UKFPO - UK-wide',
    },
    {
      label: 'Supervised Learning Events, UK Foundation Programme',
      url: 'https://foundationprogramme.nhs.uk/curriculum/supervised-learning-events/',
      jurisdiction: 'UKFPO - UK-wide',
    },
    {
      label: 'The curriculum in Horus, Horus ePortfolio support',
      url: 'https://supporthorus.hee.nhs.uk/faqs/the-curriculum/',
      jurisdiction: 'NHS England - England',
    },
    {
      label: 'F1 and F2 ARCP requirements, Scotland Deanery',
      url: 'https://www.scotlanddeanery.nhs.scot/trainee-information/scottish-foundation-school/current-foundation-doctors/f1-arcp-requirements-what-you-need-to-provide/',
      jurisdiction: 'NES - Scotland',
    },
  ],
  related: [
    'arcp-preparation',
    'documenting-teaching-portfolio',
    'documenting-audit-qip',
    'reflective-practice-portfolio',
  ],
}
