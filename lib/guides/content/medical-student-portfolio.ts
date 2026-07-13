import type { Guide } from '../types'

// Supporting guide, specialty-applications cluster. Targets the
// medical-student portfolio query family. Facts verified against the cited
// official sources on 2026-07-13; specialty-band examples mirror
// lib/specialties/imt-2026.ts (re-verified same day).
export const medicalStudentPortfolio: Guide = {
  slug: 'medical-student-portfolio',
  shortTitle: 'Medical student portfolios',
  title: 'Medical student portfolios: what to track from year one (UK)',
  metaTitle: 'Medical student portfolio guide (UK): what to track and why - Clerkfolio',
  metaDescription:
    'What a UK medical student portfolio is for, what is worth tracking from year one - prizes, audits, teaching, presentations, publications - and how the same evidence scores in specialty applications years later.',
  summary:
    'Medical schools set their own portfolio requirements, but the record that matters longest is the one you keep for yourself. This guide covers what is genuinely worth tracking as a UK medical student, what evidence to keep for each achievement, and how the same items score in specialty applications years later.',
  cluster: 'specialty-applications',
  published: '2026-07-13',
  lastReviewed: '2026-07-13',
  blocks: [
    {
      kind: 'heading',
      id: 'two-portfolios',
      text: 'You are really keeping two portfolios',
    },
    {
      kind: 'paragraph',
      text: 'At medical school, "portfolio" usually means whatever your school requires: most UK schools run their own portfolio or ePortfolio process for recording clinical experience, reflection and professional development, aligned to the outcomes the GMC sets for every UK graduate. That portfolio belongs to the degree - it evidences that you meet the outcomes, and its structure, platform and requirements are your school\'s to define. Do what your school asks; that is not optional.',
    },
    {
      kind: 'paragraph',
      text: 'The second portfolio is the one nobody makes you keep: your own longitudinal record of achievements and their evidence. It matters because your school\'s system does not follow you out - when you graduate, you move to a foundation e-portfolio (Horus in England, Turas in Scotland, Wales and Northern Ireland), and later to whatever your specialty uses. The achievements themselves, though, keep counting for years, and the person responsible for being able to prove them is you.',
    },
    {
      kind: 'heading',
      id: 'what-counts-later',
      text: 'What you do now scores later',
    },
    {
      kind: 'paragraph',
      text: 'Specialty training applications - typically made in F2, two to three years after your first real achievements - score published domains like publications, presentations, teaching and quality improvement. Most frameworks do not require the work to have been done after graduation, so medical school achievements routinely score. Taking the IMT 2026 self-assessment as a concrete example: a first-author PubMed publication scores 8 points whenever it was published, a national poster 4 points, and a complete audit cycle contributes to the quality improvement domain - while the same framework explicitly excludes intercalated degrees from its qualifications domain, which shows why reading the exact current wording matters before assuming anything counts.',
    },
    {
      kind: 'guideList',
      items: [
        { slug: 'specialty-training-applications', text: 'How UK specialty selection works and where portfolio evidence fits' },
        { slug: 'imt-portfolio-guide', text: 'The IMT self-assessment bands, domain by domain' },
        { slug: 'cst-portfolio-guide', text: 'What Core Surgical Training expects a portfolio to prove' },
      ],
    },
    {
      kind: 'heading',
      id: 'what-to-track',
      text: 'What is worth tracking from year one',
    },
    {
      kind: 'paragraph',
      text: 'You cannot know in first year which specialty you will want, and you do not need to. The recurring evidence themes are stable across specialties, so a simple rule works: if it took effort and produced something checkable, log it with its evidence the week it happens.',
    },
    {
      kind: 'bullets',
      items: [
        'Prizes, awards and distinctions - keep the certificate or the letter, with the date and the awarding body.',
        'Publications - keep the PubMed ID or DOI and the acceptance email; note your author position, because score bands distinguish first author from co-author.',
        'Presentations and posters - keep the programme page or acceptance email showing the meeting name and level (local, regional, national), plus the poster or slides.',
        'Teaching you deliver - keep the session dates, the audience, and formal feedback forms; score bands reward organised, repeated teaching with feedback over one-off sessions.',
        'Audit and quality improvement - record your specific role and each stage you were part of, and keep the report or presentation; complete cycles are worth far more than participation.',
        'Leadership and roles - society committee positions, event organisation, representative roles, with dates and something that corroborates them.',
        'Courses and certificates - life support courses, teaching courses, conference attendance, with the certificate and expiry date where relevant.',
        'Clinical experience worth remembering - electives, tasters and standout placements, with any supervisor letters; surgical applicants in particular later need letters on official letterhead.',
      ],
    },
    {
      kind: 'tip',
      title: 'Clerkfolio suggestion: the evidence file is the entry',
      text: 'The habit that separates a useful record from a nostalgic one is attaching the proof at the time: certificate, feedback form, acceptance email, letter. Two years later the achievement is only as claimable as its document. Whatever tool you use - a folder system, a spreadsheet, or Clerkfolio, which is free for students - the test is the same: could you produce the evidence for any line of your CV within a minute?',
    },
    {
      kind: 'heading',
      id: 'into-foundation',
      text: 'Carrying it into foundation training',
    },
    {
      kind: 'paragraph',
      text: 'When you start F1, your foundation e-portfolio starts empty and your school portfolio stays behind. The doctors who find ARCP and specialty applications calm rather than frantic are usually the ones whose own record crossed the gap with them: the med-school audit becomes the first half of a closed loop, the teaching feedback becomes the base of a teaching portfolio, and the conference poster is already filed with its acceptance email. The foundation guides in this series cover what the ARCP panel will expect once you are there.',
    },
    {
      kind: 'guideList',
      items: [
        { slug: 'arcp-preparation', text: 'How the ARCP works and what the panel reviews' },
        { slug: 'common-medical-portfolio-mistakes', text: 'The documentation habits that cause last-minute panic' },
      ],
    },
  ],
  sources: [
    {
      label: 'Outcomes for graduates, General Medical Council',
      url: 'https://www.gmc-uk.org/education/standards-guidance-and-curricula/standards-and-outcomes/outcomes-for-graduates',
      jurisdiction: 'GMC - UK-wide',
    },
    {
      label: 'IMT Recruitment - application scoring',
      url: 'https://www.imtrecruitment.org.uk/recruitment-process/applying/application-scoring',
      jurisdiction: 'IMT Recruitment - UK-wide',
    },
    {
      label: 'UK Foundation Programme Curriculum',
      url: 'https://foundationprogramme.nhs.uk/curriculum/uk-fp-curriculum/',
      jurisdiction: 'UKFPO - UK-wide',
    },
  ],
  related: [
    'specialty-training-applications',
    'imt-portfolio-guide',
    'arcp-preparation',
    'common-medical-portfolio-mistakes',
  ],
}
