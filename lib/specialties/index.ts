import { IMT_2026 } from './imt-2026'
import { OPHTHALMOLOGY_ST1_2026 } from './ophthalmology-st1-2026'
import { ACCS_EM_2026 } from './accs_em_2026'
import { ACCS_AM_2026 } from './accs_am_2026'
import { ACCS_ANAES_2026 } from './accs_anaes_2026'
import { CST_2026 } from './cst_2026'
import { CORE_PSYCH_2026 } from './core_psych_2026'
import { GP_ST1_2026 } from './gp_st1_2026'
import { PAEDIATRICS_ST1_2026 } from './paediatrics_st1_2026'
import { RADIOLOGY_ST1_2026 } from './radiology_st1_2026'
import { ANAESTHETICS_CT1_2026 } from './anaesthetics_ct1_2026'
import { OG_ST1_2026 } from './og_st1_2026'
import { PUBLIC_HEALTH_ST1_2026 } from './public_health_st1_2026'
import { HISTOPATHOLOGY_ST1_2026 } from './histopathology_st1_2026'
import { NEUROSURGERY_ST1_2026 } from './neurosurgery_st1_2026'
import { CARDIOTHORACIC_ST1_2026 } from './cardiothoracic_st1_2026'
import { OMFS_ST1_2026 } from './omfs_st1_2026'
import { CHILD_ADOLESCENT_PSYCH_ST1_2026 } from './child_adolescent_psych_st1_2026'
import { CSRH_ST1_2026 } from './csrh_st1_2026'
import { PSYCH_LEARNING_DISABILITY_ST1_2026 } from './psych_learning_disability_st1_2026'
import { PH_GP_DUAL_ST1_2026 } from './ph_gp_dual_st1_2026'
import type { SpecialtyConfig, SpecialtyDomain, SpecialtyApplication, SpecialtyEntryLink, SelectionProcess, SelectionProcessFamily, PreInterview, PreInterviewGate } from './types'

export const SPECIALTY_CONFIGS: SpecialtyConfig[] = [
  IMT_2026,
  OPHTHALMOLOGY_ST1_2026,
  ACCS_EM_2026,
  ACCS_AM_2026,
  ACCS_ANAES_2026,
  CST_2026,
  CORE_PSYCH_2026,
  GP_ST1_2026,
  PAEDIATRICS_ST1_2026,
  RADIOLOGY_ST1_2026,
  ANAESTHETICS_CT1_2026,
  OG_ST1_2026,
  PUBLIC_HEALTH_ST1_2026,
  HISTOPATHOLOGY_ST1_2026,
  NEUROSURGERY_ST1_2026,
  CARDIOTHORACIC_ST1_2026,
  OMFS_ST1_2026,
  CHILD_ADOLESCENT_PSYCH_ST1_2026,
  CSRH_ST1_2026,
  PSYCH_LEARNING_DISABILITY_ST1_2026,
  PH_GP_DUAL_ST1_2026,
]

export function getSpecialtyConfig(key: string): SpecialtyConfig | undefined {
  return SPECIALTY_CONFIGS.find(s => s.key === key)
}

export function formatSpecialtyLabel(key: string | null | undefined): string {
  if (!key) return 'Specialty'
  const config = getSpecialtyConfig(key)
  if (config) return config.name
  const acronyms = new Set(['accs', 'am', 'em', 'anaes', 'cst', 'csrh', 'gp', 'imt', 'omfs', 'og', 'ph', 'st1', 'st3', 'st4'])
  return key
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => acronyms.has(part.toLowerCase()) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function calculateDomainScore(domain: SpecialtyDomain, links: SpecialtyEntryLink[]): number {
  if (domain.isEvidenceOnly) return 0
  const domainLinks = links.filter(l => l.domain_key === domain.key)
  if (domainLinks.length === 0) return 0
  if (domain.isSelfAssessed || domain.isCheckbox) {
    const total = domainLinks.reduce((s, l) => s + l.points_claimed, 0)
    return Math.min(total, domain.maxPoints)
  }
  if (domain.scoringRule === 'highest') {
    return Math.min(Math.max(...domainLinks.map(l => l.points_claimed)), domain.maxPoints)
  }
  // cumulative_capped
  const total = domainLinks.reduce((s, l) => s + l.points_claimed, 0)
  return Math.min(total, domain.maxPoints)
}

// The official matrices state a domain maximum (e.g. IMT: "maximum of 30
// points across the domains") with any commitment bonus awarded ON TOP
// (IMT potential total 35), so `totalMax` deliberately excludes bonus points.
// Display sites must show the domains score against totalMax and surface the
// bonus separately - dividing calculateTotalScore by totalMax reads
// "35/30 pts (117%)" once a bonus is claimed.
export function calculateDomainsScore(config: SpecialtyConfig, links: SpecialtyEntryLink[]): number {
  if (isEvidenceBased(config)) return 0
  return config.domains.reduce((s, d) => s + calculateDomainScore(d, links), 0)
}

export function calculateBonusScore(config: SpecialtyConfig, application: SpecialtyApplication): number {
  if (isEvidenceBased(config)) return 0
  return application.bonus_claimed
    ? (config.bonusOptions?.reduce((s, b) => s + b.points, 0) ?? 0)
    : 0
}

export function calculateTotalScore(
  config: SpecialtyConfig,
  application: SpecialtyApplication,
  links: SpecialtyEntryLink[]
): number {
  return calculateDomainsScore(config, links) + calculateBonusScore(config, application)
}

// ---------- Evidence-based specialty helpers ----------

// Single source of truth: a config is evidence-based if scoringType is 'evidence'
// (or the legacy isEvidenceOnly flag is set).
export function isEvidenceBased(config: SpecialtyConfig): boolean {
  return config.scoringType === 'evidence' || !!config.isEvidenceOnly
}

export function getEssentialDomains(config: SpecialtyConfig): SpecialtyDomain[] {
  return config.domains.filter(d => d.criteriaType === 'essential')
}

export function getDesirableDomains(config: SpecialtyConfig): SpecialtyDomain[] {
  return config.domains.filter(d => d.criteriaType === 'desirable')
}

// Number of essential domains the user has marked as met (any link counts).
export function countEssentialsMet(config: SpecialtyConfig, links: SpecialtyEntryLink[]): number {
  return getEssentialDomains(config).filter(d =>
    links.some(l => l.domain_key === d.key)
  ).length
}

// Number of desirable domains with at least one piece of evidence linked.
export function countDesirablesEvidenced(config: SpecialtyConfig, links: SpecialtyEntryLink[]): number {
  return getDesirableDomains(config).filter(d =>
    links.some(l => l.domain_key === d.key)
  ).length
}

// Convenience: completeness summary for evidence-based specialties.
export function getEvidenceProgress(config: SpecialtyConfig, links: SpecialtyEntryLink[]) {
  const essentials = getEssentialDomains(config)
  const desirables = getDesirableDomains(config)
  return {
    essentialsTotal: essentials.length,
    essentialsMet: countEssentialsMet(config, links),
    desirablesTotal: desirables.length,
    desirablesEvidenced: countDesirablesEvidenced(config, links),
  }
}

// ---------- Selection-process helpers ----------

export function getSelectionProcess(config: SpecialtyConfig): SelectionProcess | undefined {
  return config.selectionProcess
}

const SELECTION_FAMILY_LABELS: Record<SelectionProcessFamily, string> = {
  self_assessment_points: 'Self-assessment points',
  assessor_scored_written: 'Assessor-scored written application',
  portfolio_graded_interview: 'Portfolio graded at interview',
  msra_interview: 'MSRA + interview',
  msra_only: 'MSRA only',
  multi_stage_selection_centre: 'Multi-stage tests + selection centre',
}

export function getSelectionFamilyLabel(family: SelectionProcessFamily): string {
  return SELECTION_FAMILY_LABELS[family]
}

// ---------- Pre-interview gate helpers ----------

export function getPreInterview(config: SpecialtyConfig): PreInterview | undefined {
  return config.selectionProcess?.preInterview
}

// Display order for the six gate groups: portfolio-counts-pre-interview groups
// first, then MSRA-gated, then the outliers.
export const PRE_INTERVIEW_GATE_ORDER: PreInterviewGate[] = [
  'self_assessment_rank',
  'assessor_scored_written',
  'msra_rank',
  'msra_is_selection',
  'cognitive_tests',
  'none_all_eligible',
]

const PRE_INTERVIEW_GATE_META: Record<PreInterviewGate, { label: string; description: string }> = {
  self_assessment_rank: {
    label: 'Your self-assessment score gets you the interview',
    description: 'You score yourself against a published points matrix; that score ranks applications for interview.',
  },
  assessor_scored_written: {
    label: 'Assessors score your written application',
    description: 'Independent assessors score your written answers; that score decides who is interviewed.',
  },
  msra_rank: {
    label: 'The MSRA gets you the interview',
    description: 'The MSRA exam ranks candidates for interview; portfolio evidence counts at the interview itself.',
  },
  msra_is_selection: {
    label: 'The MSRA is the whole selection this cycle',
    description: 'No interview this cycle; offers are ranked on MSRA scores alone.',
  },
  cognitive_tests: {
    label: 'Cognitive tests gate a selection centre',
    description: 'Specialty-specific reasoning and judgement tests decide who reaches the selection centre.',
  },
  none_all_eligible: {
    label: 'No shortlisting gate',
    description: 'Every eligible applicant is invited to interview.',
  },
}

export function getPreInterviewGateMeta(gate: PreInterviewGate): { label: string; description: string } {
  return PRE_INTERVIEW_GATE_META[gate]
}

// The subtle "portfolio does not move the shortlisting needle" note for gates
// where portfolioCountsPreInterview is false. Deliberately low-key (no banner):
// users broadly know this; the note just keeps the framing honest.
export function getPortfolioTimingNote(preInterview: PreInterview): string | null {
  if (preInterview.portfolioCountsPreInterview) return null
  switch (preInterview.gate) {
    case 'msra_is_selection':
      return 'Portfolio evidence does not affect selection this cycle, though it still strengthens interviews and future applications.'
    case 'none_all_eligible':
      return 'There is no shortlisting stage; portfolio evidence counts at the interview itself.'
    default:
      return 'Portfolio evidence does not affect shortlisting; it counts at the interview itself.'
  }
}

export * from './types'
