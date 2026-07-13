import type { Guide } from '../types'

// Facts verified against the cited official sources on 2026-07-13.
export const documentingTeachingPortfolio: Guide = {
  slug: 'documenting-teaching-portfolio',
  shortTitle: 'Documenting teaching',
  title: 'How to document teaching in your medical portfolio',
  metaTitle: 'Documenting teaching in a medical portfolio - Clerkfolio',
  metaDescription:
    'What counts as teaching evidence for UK doctors, what to record for every session, how the Developing the Clinical Teacher SLE works, and how teaching evidence keeps paying off across your career.',
  summary:
    'Teaching you deliver only counts if it is documented. This guide covers what counts as teaching, what to record for each session, the Developing the Clinical Teacher SLE, and how to collect feedback so a one-off session becomes durable portfolio evidence.',
  published: '2026-07-13',
  lastReviewed: '2026-07-13',
  blocks: [
    {
      kind: 'heading',
      id: 'why-it-matters',
      text: 'Why teaching evidence matters',
    },
    {
      kind: 'paragraph',
      text: 'Teaching is one of the few portfolio themes with value at every stage of a medical career. In the Foundation Programme it is a named capability: FPC 10, "Teaching the teacher", under HLO 2 (a valuable member of the healthcare workforce). Beyond foundation, many specialty application self-assessment frameworks include domains for teaching experience and teaching qualifications, and consultant appraisal continues to ask about it. The same documented session can serve all of these - but only if it was documented.',
    },
    {
      kind: 'paragraph',
      text: 'The failure mode is almost never a shortage of teaching. Most junior doctors teach regularly: students on the ward, peers at induction, departmental presentations. The failure mode is that none of it is written down, so at ARCP or application time it cannot be evidenced and effectively did not happen.',
    },
    {
      kind: 'heading',
      id: 'what-counts',
      text: 'What counts as teaching',
    },
    {
      kind: 'paragraph',
      text: 'Teaching evidence is broader than formal lectures. Depending on what a given framework asks for, all of the following are documentable teaching activity:',
    },
    {
      kind: 'bullets',
      items: [
        'Bedside and ward-based teaching of medical students or more junior colleagues.',
        'Small-group tutorials, case presentations and journal clubs you led.',
        'Departmental or regional teaching sessions and lectures.',
        'Simulation teaching, skills sessions and OSCE examining or marking.',
        'Designing teaching materials: e-learning modules, question banks, teaching programmes you organised.',
        'Mentoring and near-peer schemes with a defined teaching role.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'Distinguish delivering teaching from attending it. Attendance at mandatory teaching is its own (often required) evidence stream; what frameworks score as "teaching" is teaching you delivered or organised.',
    },
    {
      kind: 'heading',
      id: 'dct-sle',
      text: 'The Developing the Clinical Teacher SLE',
    },
    {
      kind: 'paragraph',
      text: 'For foundation doctors, the e-portfolios (Horus in England, Turas in Scotland, Wales and Northern Ireland) include a dedicated SLE form for teaching: Developing the Clinical Teacher (DCT). An observer - typically a senior colleague present at your session - completes structured feedback on your teaching, and the form becomes portfolio evidence you can map to FPC 10.',
    },
    {
      kind: 'official',
      title: 'Official position',
      items: [
        'FPC 10 "Teaching the teacher" is one of the 13 Foundation Professional Capabilities every foundation doctor must evidence for ARCP.',
        'Developing the Clinical Teacher is one of the SLE types provided in the foundation e-portfolios for recording observed teaching.',
        'SLEs are formative: they record feedback for development, and foundation doctors choose which to include as evidence of progress against the curriculum.',
      ],
    },
    {
      kind: 'tip',
      title: 'Clerkfolio suggestion: book the observer before the session',
      text: 'A DCT needs someone senior watching you teach, and finding an observer retrospectively is impossible. When a teaching slot is confirmed, ask a registrar or consultant to sit in and complete the form the same day, while their impressions are fresh. One well-observed session with structured feedback is stronger evidence than several undocumented ones.',
    },
    {
      kind: 'heading',
      id: 'what-to-record',
      text: 'What to record for every session',
    },
    {
      kind: 'paragraph',
      text: 'Whatever the setting, a teaching entry is reusable years later if it captures the facts a future form will ask for:',
    },
    {
      kind: 'numbered',
      items: [
        'Date, title and format of the session (bedside, tutorial, lecture, simulation, e-learning).',
        'Audience and numbers: who you taught, how many, and at what level.',
        'Your role: sole teacher, co-teacher, organiser, examiner.',
        'Preparation you did and materials you produced - attach the slides or handout.',
        'Feedback collected, and one line on what you would change next time.',
        'Whether the session was part of a series or programme, and whether you organised that programme.',
      ],
    },
    {
      kind: 'heading',
      id: 'feedback',
      text: 'Collecting feedback that strengthens the evidence',
    },
    {
      kind: 'paragraph',
      text: 'Structured feedback turns "I taught" into evidence of quality. A short standard form (paper or online) with a handful of rating questions and a free-text box, used consistently across your sessions, lets you honestly summarise results later. Keep the raw forms or export; summarise counts and themes in the entry itself. Never invent or embellish feedback figures - an honest "12 of 14 attendees returned forms" is exactly what assessors expect to see.',
    },
    {
      kind: 'tip',
      title: 'Clerkfolio suggestion: one entry per session, tagged as teaching',
      text: 'Log each session as its own entry with the details above, attach the materials and feedback summary, and tag it as teaching. A dated series of individual sessions shows sustained commitment far better than one retrospective "I did lots of teaching" entry, and in Clerkfolio the same entries can then be linked to ARCP capabilities or a specialty application\'s teaching domain without re-writing anything - the entry outlives the rotation it happened in.',
    },
  ],
  sources: [
    {
      label: 'UK Foundation Programme Curriculum (FPC 10, Teaching the teacher)',
      url: 'https://foundationprogramme.nhs.uk/curriculum/uk-fp-curriculum/',
      jurisdiction: 'UKFPO - UK-wide',
    },
    {
      label: 'Supervised Learning Events, UK Foundation Programme',
      url: 'https://foundationprogramme.nhs.uk/curriculum/supervised-learning-events/',
      jurisdiction: 'UKFPO - UK-wide',
    },
    {
      label: 'Horus ePortfolio forms and functionality',
      url: 'https://supporthorus.hee.nhs.uk/faqs/forms-and-functionality/',
      jurisdiction: 'NHS England - England',
    },
  ],
  related: [
    'arcp-preparation',
    'foundation-arcp-evidence-requirements',
    'documenting-audit-qip',
    'common-medical-portfolio-mistakes',
  ],
}
