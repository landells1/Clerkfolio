import type { Guide } from '../types'

// Facts verified against the cited official sources on 2026-07-13.
export const commonMedicalPortfolioMistakes: Guide = {
  slug: 'common-medical-portfolio-mistakes',
  shortTitle: 'Common portfolio mistakes',
  title: 'Common medical portfolio mistakes (and the habits that prevent them)',
  metaTitle: 'Common medical portfolio mistakes UK doctors make - Clerkfolio',
  metaDescription:
    'The recurring portfolio problems that cause avoidable ARCP outcome 5s and weak application evidence: late evidence collection, unread checklists, identifiable data, unmapped entries and lost records.',
  summary:
    'Most portfolio problems are process problems, and the same handful recur every year. This guide lists the common mistakes foundation doctors and early-career doctors make with portfolio evidence, and the specific habit that prevents each one.',
  published: '2026-07-13',
  lastReviewed: '2026-07-13',
  blocks: [
    {
      kind: 'paragraph',
      text: 'None of these mistakes is about ability. They are administrative failure modes - and because the ARCP is a review of documented evidence, administrative failures have real consequences, most visibly the outcome 5 ("incomplete evidence presented"). Each section below names the mistake and the habit that prevents it.',
    },
    {
      kind: 'heading',
      id: 'leaving-it-late',
      text: '1. Leaving evidence collection until the weeks before the deadline',
    },
    {
      kind: 'paragraph',
      text: 'Several checklist items cannot be produced quickly, because they depend on other people: a Team Assessment of Behaviour needs multiple colleagues to respond, Placement Supervision Group feedback runs on the placement\'s timetable, and supervisor reports need meetings that consultants\' diaries fill weeks ahead. A portfolio sprint in the final month can produce reflections and uploads, but not these.',
    },
    {
      kind: 'tip',
      title: 'Preventive habit',
      text: 'At the start of the year, diarise the items that depend on other people - TAB round, PSG windows, supervisor meetings - against your school\'s published deadlines, and trigger each at the start of its window rather than the end.',
    },
    {
      kind: 'heading',
      id: 'not-reading-requirements',
      text: '2. Not reading the actual requirements',
    },
    {
      kind: 'paragraph',
      text: 'The national ARCP checklist is published, short, and specific - and foundation schools add local requirements on top (the checklist explicitly provides for requirements set by NHS England, NES, HEIW or NIMDTA). Doctors who work from word-of-mouth versions of the requirements discover the gaps at panel time. Word of mouth is how "I did loads of SLEs" coexists with a missing PSA result or an absent end-of-placement report.',
    },
    {
      kind: 'tip',
      title: 'Preventive habit',
      text: 'Read the national checklist and your own foundation school\'s ARCP guidance once at the start of the year, and again at mid-year. Ten minutes each time; it is the single highest-yield portfolio activity that exists.',
    },
    {
      kind: 'heading',
      id: 'identifiable-data',
      text: '3. Patient-identifiable information in reflections and uploads',
    },
    {
      kind: 'paragraph',
      text: 'The joint GMC, AoMRC, COPMeD and MSC reflective practitioner guidance is unambiguous: reflections should be anonymised and should record learning, not identifiable case detail. The subtler version of this mistake is the attachment - a presentation slide with a patient list in a screenshot, an audit spreadsheet with hospital numbers. Identifiable data in a portfolio is a professionalism problem in itself, whatever the quality of the underlying work.',
    },
    {
      kind: 'tip',
      title: 'Preventive habit',
      text: 'Anonymise at the moment of writing, not in a later cleanup pass, and check attachments page by page before uploading anything. Treat every portfolio system - official or personal - as if a stranger will read it.',
    },
    {
      kind: 'heading',
      id: 'unmapped-evidence',
      text: '4. Collecting evidence without mapping it to capabilities',
    },
    {
      kind: 'paragraph',
      text: 'The panel assesses capabilities, not volume. Under the 2021 foundation curriculum an e-portfolio item maps to a maximum of 3 FPCs and each FPC accepts a maximum of 10 items - the system is built for curated, mapped evidence. Sixty unmapped uploads evidence nothing in particular, and the panel will not do the mapping for you. The same applies later: specialty application self-assessments score against defined domains, not general industriousness.',
    },
    {
      kind: 'tip',
      title: 'Preventive habit',
      text: 'Map each item to its capabilities when you log it, while you still remember why it mattered, and check per-capability coverage at mid-year. Thin capabilities get the next placement\'s attention; well-covered ones do not need a twentieth SLE.',
    },
    {
      kind: 'heading',
      id: 'losing-evidence',
      text: '5. Losing evidence between systems, trusts and stages',
    },
    {
      kind: 'paragraph',
      text: 'Training portfolios are tied to a stage and an employer\'s ecosystem: access and habits change when you move from medical school to foundation, between nations (Horus in England, Turas in Scotland, Wales and Northern Ireland), and again into specialty training\'s college-specific systems. Certificates, feedback summaries, audit write-ups and teaching records scattered across old accounts, hospital desktops and email attachments have a way of being unavailable exactly when an application form asks for them.',
    },
    {
      kind: 'tip',
      title: 'Preventive habit',
      text: 'Keep one longitudinal record of your evidence that you control, alongside whatever official system your current stage requires. This is the problem Clerkfolio is built for: a portfolio that belongs to you rather than to your trust or deanery, so a teaching record from F1 is still attached, dated and findable when an ST application asks for it years later.',
    },
    {
      kind: 'heading',
      id: 'quantity-over-quality',
      text: '6. Prioritising volume over completed stories',
    },
    {
      kind: 'paragraph',
      text: 'A pattern visible across every evidence type: five started audits beat by one closed loop; a dozen teaching sessions with no feedback beat by three with structured feedback and a DCT; ten one-line reflections beat by four with a genuine learning point. Assessment frameworks - ARCP and applications alike - consistently reward completion, defined roles and demonstrated learning over raw counts.',
    },
    {
      kind: 'tip',
      title: 'Preventive habit',
      text: 'Before starting a new evidence-generating project, ask whether finishing an existing one would be worth more. It usually is: close the audit loop, collect the teaching feedback, write the follow-up reflection.',
    },
  ],
  sources: [
    {
      label: 'ARCP checklist, UK Foundation Programme',
      url: 'https://foundationprogramme.nhs.uk/curriculum/annual-review-of-competence-progression-arcp/arcp-checklist/',
      jurisdiction: 'UKFPO - UK-wide',
    },
    {
      label: 'ARCP outcomes, UK Foundation Programme',
      url: 'https://foundationprogramme.nhs.uk/curriculum/annual-review-of-competence-progression-arcp/arcp-outcomes/',
      jurisdiction: 'UKFPO - UK-wide',
    },
    {
      label: 'The reflective practitioner - guidance for doctors and medical students (GMC, AoMRC, COPMeD, MSC)',
      url: 'https://www.gmc-uk.org/education/standards-guidance-and-curricula/guidance/reflective-practice/the-reflective-practitioner---guidance-for-doctors-and-medical-students',
      jurisdiction: 'GMC and partners - UK-wide',
    },
    {
      label: 'The curriculum in Horus, Horus ePortfolio support',
      url: 'https://supporthorus.hee.nhs.uk/faqs/the-curriculum/',
      jurisdiction: 'NHS England - England',
    },
  ],
  related: [
    'arcp-preparation',
    'foundation-arcp-evidence-requirements',
    'documenting-teaching-portfolio',
    'documenting-audit-qip',
    'reflective-practice-portfolio',
  ],
}
