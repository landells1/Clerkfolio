import type { Guide } from '../types'

// Pillar guide for the specialty-applications cluster. Facts verified against
// the cited official sources on 2026-07-13. Selection-family framing mirrors
// lib/specialties (selectionProcess taxonomy), which is re-verified each
// cycle per SPECIALTY-REFRESH.md.
export const specialtyTrainingApplications: Guide = {
  slug: 'specialty-training-applications',
  shortTitle: 'Specialty training applications',
  title: 'Specialty training applications: how UK selection works and what to evidence',
  metaTitle: 'Specialty training applications guide (UK) - Clerkfolio',
  metaDescription:
    'How UK specialty training selection works: Oriel, recruitment rounds, the MSRA, self-assessment scoring and portfolio stations - and the evidence worth collecting early. Verified against official recruitment sources.',
  summary:
    'Every UK specialty training application is decided by evidence: some specialties score a self-assessment, some grade a portfolio at interview, and some select on the MSRA. This guide explains the selection routes, what they have in common, and why the evidence you collect years earlier decides your options.',
  cluster: 'specialty-applications',
  isPillar: true,
  published: '2026-07-13',
  lastReviewed: '2026-07-13',
  blocks: [
    {
      kind: 'heading',
      id: 'how-recruitment-works',
      text: 'How specialty recruitment works',
    },
    {
      kind: 'paragraph',
      text: 'Recruitment into UK specialty training is run nationally. Applications are made through Oriel, the UK-wide portal for recruitment to postgraduate medical training, in recruitment rounds with published timelines. NHS England\'s medical hub publishes the process for each specialty - eligibility, person specifications, how applications are longlisted and shortlisted, and how interviews and offers work - and the equivalent guidance applies across Scotland, Wales and Northern Ireland, because recruitment to most specialties is UK-wide.',
    },
    {
      kind: 'paragraph',
      text: 'The stages are broadly the same everywhere: you apply in the published window, your eligibility is checked against the person specification (longlisting), applicants are ranked to decide who is interviewed or assessed (shortlisting), and a final selection score decides offers. What differs - a lot - is what evidence counts at each stage.',
    },
    {
      kind: 'heading',
      id: 'selection-routes',
      text: 'The three main selection routes',
    },
    {
      kind: 'paragraph',
      text: 'Specialties use different combinations of three ingredients: a scored self-assessment of your achievements, the Multi-Specialty Recruitment Assessment (MSRA), and an interview that can include a graded portfolio review. Two worked examples show how different the same "portfolio" can look at the point of selection:',
    },
    {
      kind: 'official',
      title: 'Two contrasting selection frameworks (2026 cycle)',
      items: [
        'Internal Medicine Training scores a self-assessment of 30 points across 6 achievement domains (postgraduate qualifications, presentations, publications, teaching experience, training in teaching, and quality improvement), with 5 further points for applying only to the joint IMT/ACCS-IM vacancy in Round 1.',
        'Core Surgical Training shortlists on the MSRA, then scores selection as MSRA 10%, portfolio station 45%, and management and clinical station 45% - the portfolio is not scored until the interview itself, where assessors grade uploaded evidence and question candidates on it.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'A third group of specialties selects primarily on the MSRA, with no portfolio scored at any stage - for the 2026 cycle that included GP, where the MSRA alone determined ranking. The route your target specialty uses changes what preparation looks like: a self-assessment rewards banked, documented achievements; a portfolio station rewards organised, indexed evidence you can discuss; an MSRA-first specialty rewards exam preparation, though your portfolio still matters for the career beyond the application.',
    },
    {
      kind: 'tip',
      title: 'Clerkfolio suggestion: find your specialty\'s route before you build anything',
      text: 'Check the current official scoring or portfolio guidance for the specialty you want - it is published for every specialty, every cycle, and it changes. Clerkfolio tracks the published selection frameworks for 21 entry-level specialties, shows which route each one uses, and lets you self-score your evidence against the current criteria. This is our practical suggestion, not an official requirement.',
    },
    {
      kind: 'heading',
      id: 'evidence-themes',
      text: 'The evidence themes that recur everywhere',
    },
    {
      kind: 'paragraph',
      text: 'Across specialties, the same achievement categories keep appearing in scoring frameworks and portfolio checklists: quality improvement and audit, teaching you have delivered (and training in how to teach), presentations and posters, publications, postgraduate qualifications, and leadership or management roles. The bands differ by specialty, but the underlying evidence is the same - and most frameworks do not require the work to have been done at any particular career stage, so achievements from medical school and foundation years usually still count.',
    },
    {
      kind: 'paragraph',
      text: 'That is why the applicants with options are usually the ones who documented as they went. An audit certificate, presentation acceptance email, teaching feedback form or PubMed ID is trivial to keep at the time and painful to reconstruct two years later. The supporting guides in this cluster cover the two worked examples in detail, and the evidence-type guides explain how to document the recurring themes properly:',
    },
    {
      kind: 'guideList',
      items: [
        { slug: 'imt-portfolio-guide', text: 'The IMT self-assessment domains and how the 30 points are scored' },
        { slug: 'cst-portfolio-guide', text: 'The CST portfolio station, the A to E grades and the mandatory index page' },
        { slug: 'medical-student-portfolio', text: 'What to start tracking at medical school so it counts later' },
        { slug: 'documenting-audit-qip', text: 'Running and writing up an audit or QIP that scores' },
        { slug: 'documenting-teaching-portfolio', text: 'Recording teaching you deliver so it counts' },
      ],
    },
    {
      kind: 'heading',
      id: 'when-to-start',
      text: 'When to start collecting',
    },
    {
      kind: 'paragraph',
      text: 'The honest answer is: before you know which specialty you want. Most doctors apply to specialty training in F2, which means the achievements being scored were mostly earned in medical school and F1 - before the application existed. Because the recurring themes are stable across specialties, early evidence is rarely wasted: a completed audit cycle or a term of organised teaching scores somewhere in almost every framework.',
    },
    {
      kind: 'tip',
      title: 'Clerkfolio suggestion: log the evidence once, map it many times',
      text: 'Keep one longitudinal record of everything you do - each entry with its date, your role, and the evidence file attached. When you pick a specialty, map the entries you already have against the current framework and you will see your genuine gaps immediately, while there is still time to close them. Clerkfolio is built for exactly this: one portfolio for your entire career, mapped to whichever application you are making now.',
    },
  ],
  sources: [
    {
      label: 'Medical specialty recruitment, NHS England medical hub',
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training',
      jurisdiction: 'NHS England - England (process applies to UK-wide recruitment)',
    },
    {
      label: 'Oriel - the UK-wide recruitment portal',
      url: 'https://www.oriel.nhs.uk/Web/',
      jurisdiction: 'Oriel - UK-wide',
    },
    {
      label: 'IMT Recruitment - application scoring',
      url: 'https://www.imtrecruitment.org.uk/recruitment-process/applying/application-scoring',
      jurisdiction: 'IMT Recruitment - UK-wide',
    },
    {
      label: 'Applying for core surgical training, NHS England medical hub',
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/surgery/core-surgery/overview-of-core-surgery-training/applying-for-core-training',
      jurisdiction: 'NHS England - UK-wide recruitment',
    },
    {
      label: 'General practice recruitment overview, NHS England medical hub',
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/general-practice-gp/how-to-apply-for-gp-specialty-training/gp-specialty-training-recruitment/general-practice-overview',
      jurisdiction: 'NHS England - UK-wide recruitment',
    },
  ],
  related: [
    'imt-portfolio-guide',
    'cst-portfolio-guide',
    'medical-student-portfolio',
    'documenting-audit-qip',
    'documenting-teaching-portfolio',
  ],
}
