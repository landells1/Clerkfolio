import type { Guide } from '../types'

// Facts verified against the cited official sources on 2026-07-13.
export const documentingAuditQip: Guide = {
  slug: 'documenting-audit-qip',
  shortTitle: 'Documenting an audit or QIP',
  title: 'How to document an audit or quality improvement project',
  metaTitle: 'Documenting audits and QIPs in a medical portfolio - Clerkfolio',
  metaDescription:
    'Audit vs QIP, the stages of the audit cycle, what to document at each stage, and how UK doctors turn quality improvement work into strong ARCP and specialty application evidence.',
  summary:
    'Quality improvement is a named foundation capability and a staple of specialty application frameworks, but a project only becomes portfolio evidence if each stage is written down. This guide covers audit vs QIP, the improvement cycle, and exactly what to document as you go.',
  cluster: 'arcp',
  published: '2026-07-13',
  lastReviewed: '2026-07-13',
  blocks: [
    {
      kind: 'heading',
      id: 'why-it-matters',
      text: 'Where quality improvement sits in your training',
    },
    {
      kind: 'paragraph',
      text: 'Quality improvement is a formal part of the foundation curriculum: FPC 9, "Quality improvement", under HLO 2. Foundation doctors are expected to engage with improving the quality of care and to evidence that engagement in the portfolio. Beyond foundation, audit and QIP experience appears in many specialty application self-assessment frameworks, where higher scores typically attach to completed cycles and to work you led rather than merely joined.',
    },
    {
      kind: 'heading',
      id: 'audit-vs-qip',
      text: 'Audit and QIP: the difference, briefly',
    },
    {
      kind: 'paragraph',
      text: 'The Healthcare Quality Improvement Partnership (HQIP), which publishes the national best-practice guidance for clinical audit, describes clinical audit as a quality improvement cycle: care is measured against agreed and proven standards, action is taken to bring practice in line with those standards, and the impact is measured again. A quality improvement project is the broader family of structured methods for improving care - an audit is one of them, alongside approaches like plan-do-study-act (PDSA) cycles.',
    },
    {
      kind: 'official',
      title: 'Official framing',
      items: [
        'Clinical audit measures existing practice against defined standards and takes action to close the gap (HQIP, Best Practice in Clinical Audit).',
        'The cycle is not complete until re-measurement shows the impact of the changes made - "closing the loop".',
        'FPC 9 (Quality improvement) is one of the 13 Foundation Professional Capabilities that foundation doctors evidence at ARCP.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'For portfolio purposes the practical distinction matters less than the documentation: both audits and QIPs are evidenced the same way, stage by stage, with your specific role stated at each stage.',
    },
    {
      kind: 'heading',
      id: 'the-cycle',
      text: 'The stages of the cycle, and what to document at each',
    },
    {
      kind: 'numbered',
      items: [
        'Choosing the topic and standard. Document why the topic matters locally, and the standard you are measuring against (a NICE guideline, a royal college standard, a trust policy) with its reference.',
        'Registration and governance. Most trusts require audits and QIPs to be registered with the clinical audit or governance team. Keep the registration confirmation - it is dated proof the project is real and yours.',
        'First data collection. Document the method (criteria, sample, dates), keep the anonymised data collection tool, and record your role in designing and running it.',
        'Analysis and presentation. Keep the results summary and any slides. If you presented at a departmental meeting, record the date and audience - presentation of results is often separately creditable.',
        'Implementing change. Document what was changed (a proforma, a poster, a teaching session, a guideline amendment) and your part in making it happen.',
        'Re-measurement (closing the loop). The second data collection against the same standard, showing whether practice improved. Document it exactly like the first round.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'If you inherit a project or hand one on - normal in training rotations - document the handover: which stages were yours, and who continued the work. An honestly described single stage of a genuine cycle is good evidence; a vaguely described "whole" project is weak evidence.',
    },
    {
      kind: 'heading',
      id: 'patient-data',
      text: 'A note on patient data',
    },
    {
      kind: 'paragraph',
      text: 'Audit data belongs to the trust and its governance framework. What goes in your portfolio is the project record: methods, anonymised and aggregated results, presentations and change documents. Never store patient-identifiable data in any personal portfolio system, and follow your trust\'s rules on where raw audit data lives.',
    },
    {
      kind: 'tip',
      title: 'Clerkfolio suggestion: one entry per project, updated at each stage',
      text: 'Create the portfolio entry when the project is registered, not when it is finished, and append to it at every stage - registration, first cycle, presentation, change, re-audit - with documents attached as you go. Projects that span rotations are exactly where records get lost; keeping the whole story in one dated entry means that when an application form later asks "describe your role in a completed audit cycle", the answer is already written. In Clerkfolio the same entry links to FPC 9 for ARCP and to the QI domain of a specialty application without duplication.',
    },
  ],
  sources: [
    {
      label: 'Best Practice in Clinical Audit, HQIP (2020)',
      url: 'https://www.hqip.org.uk/resource/best-practice-in-clinical-audit/',
      jurisdiction: 'HQIP - England and Wales (widely referenced UK-wide)',
    },
    {
      label: 'UK Foundation Programme Curriculum (FPC 9, Quality improvement)',
      url: 'https://foundationprogramme.nhs.uk/curriculum/uk-fp-curriculum/',
      jurisdiction: 'UKFPO - UK-wide',
    },
    {
      label: 'ARCP checklist, UK Foundation Programme',
      url: 'https://foundationprogramme.nhs.uk/curriculum/annual-review-of-competence-progression-arcp/arcp-checklist/',
      jurisdiction: 'UKFPO - UK-wide',
    },
  ],
  related: [
    'arcp-preparation',
    'foundation-arcp-evidence-requirements',
    'documenting-teaching-portfolio',
    'common-medical-portfolio-mistakes',
  ],
}
