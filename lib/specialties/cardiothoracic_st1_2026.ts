import type { SpecialtyConfig } from './types'
import { UNIVERSAL_ESSENTIALS } from './shared'

// Cardiothoracic Surgery ST1 2026 - national run-through programme, nationally
// recruited by NHS England Wessex. No MSRA: applications are longlisted by
// self-assessment score against the official 59-point matrix below, transcribed
// domain-by-domain from the Wessex "ST1 CT Surgery 2026 Self Assessment Scores
// and Descriptors" PDF (see sources). Descriptors that score 0 in the official
// matrix (e.g. USMLE/ECFMG, departmental presentations) are recorded in domain
// notes rather than as 0-point bands.
export const CARDIOTHORACIC_ST1_2026: SpecialtyConfig = {
  key: 'cardiothoracic_st1_2026',
  name: 'Cardiothoracic Surgery ST1',
  cycleYear: 2026,
  totalMax: 59,
  source: 'https://wessex.hee.nhs.uk/wp-content/uploads/sites/6/2025/10/ST1-CT-Surgery-Self-Assessment-Criteria-2026.pdf',
  sourceLabel: 'NHS England Wessex - ST1 Cardiothoracic Surgery Self-Assessment Scores and Descriptors 2026',
  isOfficial: true,
  scoringType: 'points',
  selectionProcess: {
    family: 'self_assessment_points',
    stages: [
      { key: 'self_assessment', label: 'Self-assessment scoring', weightLabel: '59 points across 16 domains', notes: 'Applications longlisted by self-assessment score; cut-off set by MDRS. No MSRA for Cardiothoracic ST1' },
      { key: 'evidence_verification', label: 'Evidence upload & verification', notes: 'Applicants above the cut-off (or within 6 points below it) upload evidence; assessors verify the self-assessment scores' },
      { key: 'interview', label: 'Interview' },
    ],
    preInterview: {
      gate: 'self_assessment_rank',
      portfolioCountsPreInterview: true,
      cutoffNotes: 'Applications are longlisted by self-assessment score; the cut-off is set by MDRS, and applicants above it (or within 6 points below it) upload evidence for verification before the final shortlist is interviewed.',
    },
    recruitmentOffice: {
      name: 'NHS England Wessex (Cardiothoracic National Recruitment)',
      url: 'https://wessex.hee.nhs.uk/medical-dental-training-recruitment/core-and-specialty/cardiothoracic-surgery-st1-st4-national-recruitment/',
    },
  },
  sources: [
    {
      url: 'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/person-specifications/person-specifications-2026/cardiothoracic-surgery-st1-2026',
      claim: 'Entry requirements (essentials), including the 18-month whole-time-equivalent cap on prior cardiothoracic experience.',
      lastVerified: '2026-07-02',
    },
    {
      url: 'https://wessex.hee.nhs.uk/wp-content/uploads/sites/6/2025/10/Applicant-Guide-2026-Cardiothoracic-ST1-National-Recruitment-FINAL.pdf',
      claim: 'The MSRA is not used. Applications are processed by self-assessment score initially for 2026; applicants above the cut-off (or within 6 points below it) upload evidence to a verification portal, assessors verify the scores, and the final shortlist is interviewed.',
      lastVerified: '2026-07-02',
    },
    {
      url: 'https://wessex.hee.nhs.uk/wp-content/uploads/sites/6/2025/10/ST1-CT-Surgery-Self-Assessment-Criteria-2026.pdf',
      claim: 'The full 2026 self-assessment matrix: 16 scored domains across 5 sections, maximum score available 59, with per-band descriptors and evidence requirements.',
      lastVerified: '2026-07-02',
    },
  ],
  domains: [
    ...UNIVERSAL_ESSENTIALS,
    {
      key: 'cardiothoracic_experience_cap',
      label: 'Prior cardiothoracic experience ≤18 months WTE',
      maxPoints: 0,
      scoringRule: 'highest',
      bands: [],
      criteriaType: 'essential',
      notes: 'Combined whole-time-equivalent experience in cardiac surgery, thoracic surgery, congenital cardiac surgery and cardiothoracic transplantation must not exceed 18 months by application closing date. Direct-from-Foundation applicants meet this trivially; relevant mainly for IMGs, LAT/trust-grade, or returners.',
    },
    // ---- Section 1: Undergraduate Medical Career ----
    {
      key: 'academic_prizes_awards',
      label: 'Academic Prizes & Awards',
      maxPoints: 6,
      scoringRule: 'highest',
      bands: [
        { label: 'Graduated final year of medical school ranked 1st overall', points: 6 },
        { label: 'Graduated final year of medical school amongst top 10% overall', points: 4 },
        { label: 'Two or more 1st prizes awarded for academic performance', points: 2 },
        { label: 'One 1st prize for academic performance, or bursary/grant/fellowship for research or travel', points: 1 },
      ],
      notes: 'Top 10% / ranked 1st must cover the entire medical degree and be confirmed by a signed document from the medical school. Shortlisted/finalist without winning, certificates of merit or appreciation, and runner-up awards score 0.',
    },
    {
      key: 'undergraduate_electives',
      label: 'Undergraduate Clinical Electives & Attachments',
      maxPoints: 5,
      scoringRule: 'highest',
      bands: [
        { label: 'Two or more separate cardiothoracic electives/attachments in a non-home institution, at least 4 weeks each', points: 5 },
        { label: 'Two or more separate cardiothoracic electives/attachments in own institution, more than 2 weeks each', points: 3 },
        { label: 'One cardiothoracic elective/attachment in a non-home institution, at least 4 weeks', points: 2 },
        { label: 'One cardiothoracic elective/attachment in own institution over 2 weeks, or in a non-home institution of at least 2 weeks', points: 1 },
      ],
      notes: 'Home institution means any cardiothoracic centre attached/affiliated with your medical school. Own-institution electives or attachments of 2 weeks or less score 0.',
    },
    // ---- Section 2: Postgraduate qualifications ----
    {
      key: 'higher_degrees',
      label: 'Higher Degrees',
      maxPoints: 6,
      scoringRule: 'highest',
      bands: [
        { label: 'Doctorate (MD/PhD/DPhil) with original research directly related to cardiothoracic surgery', points: 6 },
        { label: 'Master degree (MS/MCh/MPhil) with original research directly related to cardiothoracic surgery', points: 4 },
        { label: 'Higher degree in a subject not directly related to cardiothoracic surgery (MSc/MS/MCh/MPhil/MD/DPhil/PhD, Master in Education, MBA)', points: 2 },
      ],
      notes: 'MD as primary medical qualification, or a higher degree registered but not yet awarded, scores 0. Generic topics (physiology, anatomy, surgery) do not count as directly related to cardiothoracic surgery.',
    },
    {
      key: 'postgraduate_exams',
      label: 'Postgraduate Qualifications (Membership Exams)',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'Full MRCS', points: 4 },
        { label: 'MRCS Part A', points: 2 },
        { label: 'MRCP', points: 1 },
      ],
      notes: 'USMLE and ECFMG score 0.',
    },
    {
      key: 'pg_cert_dip',
      label: 'PG Cert & PG Dip',
      maxPoints: 3,
      scoringRule: 'highest',
      bands: [
        { label: '3 or more PG Diplomas relevant to cardiothoracic research or service delivery', points: 3 },
        { label: '3 or more PG Certs, or 1-2 PG Diplomas, relevant to cardiothoracic research or service delivery', points: 2 },
        { label: '1-2 PG Certs relevant to cardiothoracic research or service delivery', points: 1 },
      ],
      notes: 'Awarded following part- or full-time supervised study. PG Cert / PG Dip in Education are included.',
    },
    // ---- Section 3: Professional Development ----
    {
      key: 'research',
      label: 'Research & Grants',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'Personal research grant(s) as principal holder totalling £20,000 or more (postgraduate)', points: 4 },
        { label: 'Personal research grant(s) as principal holder totalling £10,000 to £19,999 (postgraduate)', points: 3 },
        { label: 'Personal research grant(s) as principal holder totalling £2,000 to £9,999 (postgraduate)', points: 2 },
        { label: 'Substantive role in a completed research project, research grant as co-applicant, or personal grant under £2,000', points: 1 },
      ],
      notes: 'Postgraduate means after first university degree and medical school. Limited involvement (e.g. data collection only) scores 0. Grants need clear documentation naming you as primary holder.',
    },
    {
      key: 'quality_improvement',
      label: 'Quality Improvement / Audit',
      maxPoints: 3,
      scoringRule: 'highest',
      bands: [
        { label: 'Led and completed 3 or more different QI/audit cycles (audit AND re-audit), registered with audit department', points: 3 },
        { label: 'Led design/conduct/presentation of 4 or more completed projects, or led and completed 2 different full cycles', points: 2 },
        { label: 'Led design/conduct/presentation of 1-3 completed projects, or led and completed 1 full cycle', points: 1 },
      ],
      notes: 'Participation only (e.g. data collection, or an audit commenced but not completed) scores 0. A consultant-signed project document (title, aim, methods, stakeholder engagement, evaluation, reflection) must accompany the evidence.',
    },
    {
      key: 'postgraduate_awards',
      label: 'Postgraduate Awards & Prizes',
      maxPoints: 3,
      scoringRule: 'highest',
      bands: [
        { label: 'International award reflecting outstanding achievement in medicine or surgery', points: 3 },
        { label: 'National award reflecting outstanding achievement in medicine or surgery', points: 2 },
        { label: 'Local or regional peer-group award for achievement in medicine or surgery', points: 1 },
      ],
      notes: 'Bursaries, grants and fellowships for research or travel score 0 in this domain. Clear documentation from the awarding body is required.',
    },
    // ---- Section 4: Operative Skills ----
    {
      key: 'operative_incisions',
      label: 'Operative Skills: Incisions',
      maxPoints: 3,
      scoringRule: 'highest',
      bands: [
        { label: 'Opening of laparotomy/thoracotomy/sternotomy as primary surgeon: 11+ cases', points: 3 },
        { label: 'Opening of laparotomy/thoracotomy/sternotomy as primary surgeon: 6-10 cases', points: 2 },
        { label: 'Opening of laparotomy/thoracotomy/sternotomy as primary surgeon: 0-5 cases', points: 1 },
      ],
      notes: 'Evidence must be a consolidated logbook with a breakdown by incision type, signed off as accurate and dated by a consultant surgeon.',
    },
    {
      key: 'operative_closures',
      label: 'Operative Skills: Closures',
      maxPoints: 3,
      scoringRule: 'highest',
      bands: [
        { label: 'Closure of laparotomy/thoracotomy/sternotomy as primary surgeon: 11+ cases', points: 3 },
        { label: 'Closure of laparotomy/thoracotomy/sternotomy as primary surgeon: 6-10 cases', points: 2 },
        { label: 'Closure of laparotomy/thoracotomy/sternotomy as primary surgeon: 0-5 cases', points: 1 },
      ],
      notes: 'Evidence must be a consolidated logbook with a breakdown by closure type, signed off as accurate and dated by a consultant surgeon.',
    },
    {
      key: 'operative_whole_procedures',
      label: 'Operative Skills: Whole Procedures',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'Whole operative procedures as primary surgeon: 16+ cases', points: 4 },
        { label: 'Whole operative procedures as primary surgeon: 11-15 cases', points: 3 },
        { label: 'Whole operative procedures as primary surgeon: 6-10 cases', points: 2 },
        { label: 'Whole operative procedures as primary surgeon: 0-5 cases', points: 1 },
      ],
      notes: 'Examples: appendicectomy, varicose vein surgery, excision of subcutaneous cyst, saphenous vein harvesting, VATS pleural biopsy. Consolidated consultant-signed logbook with breakdown by procedure type required.',
    },
    // ---- Section 5: Supporting Activities ----
    {
      key: 'presentations',
      label: 'Presentations',
      maxPoints: 3,
      scoringRule: 'highest',
      bands: [
        { label: '3 or more distinct oral presentations as podium presenter at a national or international society', points: 3 },
        { label: '1-2 oral presentations as podium presenter at a national or international society', points: 2 },
        { label: 'Poster presentation(s) at national or international meetings', points: 1 },
      ],
      notes: 'Oral presentations must involve a major personal commitment. Departmental presentations score 0.',
    },
    {
      key: 'publications',
      label: 'Publications',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'First author of 4 peer-reviewed PubMed-listed publications (excluding case reports)', points: 4 },
        { label: 'First author of 3 peer-reviewed PubMed-listed publications (excluding case reports)', points: 3 },
        { label: 'Co-author of 5+ PubMed publications or book chapters, author/editor of a relevant textbook, or first author of 2 PubMed publications', points: 2 },
        { label: 'Co-author of 1-4 PubMed publications or book chapter(s), or first author of 1 PubMed publication (excluding case reports)', points: 1 },
      ],
      notes: 'Letters to the editor, abstracts, e-comments and pay-to-publish articles score 0. Joint first authorship counts only when clearly stated by the journal. A PubMed screenshot is required at evidence upload; publications not retrievable on PubMed do not score.',
    },
    {
      key: 'leadership_management',
      label: 'Organisational & Leadership Skills',
      maxPoints: 2,
      scoringRule: 'highest',
      bands: [
        { label: 'Overall Chair or Secretary of a national or international body or society', points: 2 },
        { label: 'Official role in local/regional committee work, project development or charity, or in a local/regional branch of a national body', points: 1 },
      ],
      notes: 'Roles must fall within 3 years of the application closing date. Rota master or similar roles score 0. Documentation from the body stating your role is required.',
    },
    {
      key: 'teaching',
      label: 'Teaching',
      maxPoints: 4,
      scoringRule: 'highest',
      bands: [
        { label: 'Formal teaching role of 12+ months at minimum 50% WTE (e.g. anatomy demonstrator)', points: 4 },
        { label: 'Formal teaching role of 6+ months at minimum 50% WTE (e.g. anatomy demonstrator)', points: 3 },
        { label: 'Faculty of a course with a published programme AND formal participant feedback', points: 2 },
        { label: 'Regular teaching of clinical professionals, at least monthly for 6+ months', points: 1 },
      ],
      notes: 'Ad hoc teaching (less than monthly) and talks to the public score 0. Formal roles need an HR-signed contract specifying hours per week; only roles completed by evidence upload count.',
    },
    {
      key: 'achievements_outside_medicine',
      label: 'Achievements Outside Medicine',
      maxPoints: 2,
      scoringRule: 'highest',
      bands: [
        { label: 'Recognised significant achievement outside medicine within the last 3 years (regional/national award or county/national team)', points: 2 },
        { label: 'Recognised significant achievement outside medicine at any time (regional/national award or county/national team)', points: 1 },
      ],
      notes: 'Only achievements requiring significant skill that led to a regional/national award or county/national team membership score. Charity, project, committee or organisational work belongs in the leadership domain, not here.',
    },
  ],
}
