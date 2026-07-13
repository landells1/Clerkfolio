import type { Guide } from '../types'

// Facts verified against the cited official sources on 2026-07-13.
export const reflectivePracticePortfolio: Guide = {
  slug: 'reflective-practice-portfolio',
  shortTitle: 'Reflective practice',
  title: 'Reflective practice: writing portfolio reflections that meet the official guidance',
  metaTitle: 'Reflective practice for UK doctors: portfolio reflections - Clerkfolio',
  metaDescription:
    'What the joint GMC, AoMRC, COPMeD and MSC reflective practitioner guidance actually asks for, how to anonymise reflections properly, and practical structures for writing reflections that are useful rather than performative.',
  summary:
    'Reflection is a required thread through foundation training and beyond, and it is governed by clear joint guidance from the GMC, AoMRC, COPMeD and the Medical Schools Council. This guide summarises what that guidance says, how to anonymise properly, and how to write reflections that are actually worth re-reading.',
  published: '2026-07-13',
  lastReviewed: '2026-07-13',
  blocks: [
    {
      kind: 'heading',
      id: 'why-reflect',
      text: 'Why reflection is required',
    },
    {
      kind: 'paragraph',
      text: 'Reflection is written into UK medical training at every level. The Foundation Programme ARCP checklist lists reflective entries among the evidence of engagement with the programme, and reflective practice continues through specialty training into consultant appraisal and revalidation. The definitive statement of what is expected is "The reflective practitioner", joint guidance published in 2018 by the Academy of Medical Royal Colleges (AoMRC), the Conference of Postgraduate Medical Deans (COPMeD), the General Medical Council (GMC) and the Medical Schools Council (MSC).',
    },
    {
      kind: 'official',
      title: 'Key points from the joint guidance',
      items: [
        'Reflection is personal: there is no single required format, and what matters is the learning and any resulting change in practice, not the volume of writing.',
        'Reflective notes should focus on the learning from an event rather than a full factual account of it - they should not duplicate the clinical record.',
        'Reflections should be anonymised: do not record information that identifies patients, colleagues or other individuals.',
        'The guidance notes that reflective notes are not legally privileged, and in rare circumstances a court can request them - anonymised, learning-focused notes are the protection the guidance recommends.',
        'Reflecting on positive experiences and everyday practice is as valuable as reflecting on things that went wrong.',
      ],
    },
    {
      kind: 'heading',
      id: 'anonymisation',
      text: 'Anonymising properly',
    },
    {
      kind: 'paragraph',
      text: 'Anonymisation means more than removing the name. A reflection is identifiable if the combination of details - ward, date, an unusual presentation, a colleague\'s role - would let a reader work out who was involved. Write the learning, not the case report: "a deteriorating patient whose escalation I delayed" carries the full reflective value of the identifiable version. This applies to every system your reflection touches, including personal portfolio tools; no portfolio, official or personal, should ever contain patient-identifiable information.',
    },
    {
      kind: 'heading',
      id: 'structures',
      text: 'Structures that make reflection easier',
    },
    {
      kind: 'paragraph',
      text: 'Because the official guidance mandates no fixed format, you can use whatever structure gets you from event to learning fastest. Widely used options include the three-question "What? So what? Now what?" model and longer cycles such as Gibbs\'. A minimal, serviceable structure is:',
    },
    {
      kind: 'numbered',
      items: [
        'What happened, in two or three anonymised sentences.',
        'What it meant: why the event stayed with you, what went well or badly, what you did not know or could not do at the time.',
        'What changes: the specific thing you will do differently, look up, practise or discuss with your supervisor.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'A reflection with a concrete "what changes" line is also self-updating evidence: at your next supervisor meeting or ARCP you can point to whether the change happened, which is precisely the engagement panels are asked to look for.',
    },
    {
      kind: 'tip',
      title: 'Clerkfolio suggestion: reflect little and often, close to the event',
      text: 'Three short reflections a month written within days of the events beat a batch written the week before a portfolio deadline, both as learning and as evidence of ongoing engagement. Keep each one small: an honest paragraph with a clear learning point is complete. In Clerkfolio, reflections are a first-class entry type with the anonymisation reminder built into the form, and they stay in your own portfolio for later use - a reflection written in F1 about handover safety is still quotable in a specialty interview years on.',
    },
  ],
  sources: [
    {
      label: 'The reflective practitioner - guidance for doctors and medical students (GMC, AoMRC, COPMeD, MSC)',
      url: 'https://www.gmc-uk.org/education/standards-guidance-and-curricula/guidance/reflective-practice/the-reflective-practitioner---guidance-for-doctors-and-medical-students',
      jurisdiction: 'GMC and partners - UK-wide',
    },
    {
      label: 'Reflective Practice Toolkit (AoMRC and COPMeD)',
      url: 'https://www.aomrc.org.uk/wp-content/uploads/2018/08/Reflective_Practice_Toolkit_AoMRC_CoPMED_0818.pdf',
      jurisdiction: 'AoMRC and COPMeD - UK-wide',
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
    'common-medical-portfolio-mistakes',
  ],
}
