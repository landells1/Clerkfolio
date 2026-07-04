// Single source of truth for human-readable labels of every enum value used
// across portfolio entries. Always render via these maps; never display raw
// slug values to users.

import type { PortfolioEntry } from './portfolio'

export const titleCase = (s: string) =>
  s.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export const AUDIT_TYPE_LABELS: Record<string, string> = {
  audit: 'Audit',
  qip: 'QIP',
}

export const AUDIT_CYCLE_STAGE_LABELS: Record<string, string> = {
  '1st_cycle': 'Round 1 (baseline)',
  're_audit': 'Round 2 (re-audit)',
  'completed_loop': 'Closed loop',
}

export const TEACHING_TYPE_LABELS: Record<string, string> = {
  taught_session: 'Taught session',
  grand_round: 'Grand round',
  poster: 'Poster',
  oral: 'Oral presentation',
}

export const TEACHING_AUDIENCE_LABELS: Record<string, string> = {
  students: 'Students',
  peers: 'Peers',
  consultants: 'Consultants',
  public: 'Public',
}

export const LEVEL_LABELS: Record<string, string> = {
  local: 'Local',
  regional: 'Regional',
  national: 'National',
  international: 'International',
}

export const CONF_TYPE_LABELS: Record<string, string> = {
  conference: 'Conference',
  course: 'Course',
}

export const CONF_ATTENDANCE_LABELS: Record<string, string> = {
  attendee: 'Attendee',
  presenter: 'Presenter',
  organiser: 'Organiser',
}

export const PUB_TYPE_LABELS: Record<string, string> = {
  original_research: 'Original research',
  case_report: 'Case report',
  review: 'Review',
  letter: 'Letter',
  book_chapter: 'Book chapter',
}

export const PUB_STATUS_LABELS: Record<string, string> = {
  in_progress: 'In progress',
  submitted: 'Submitted',
  published: 'Published',
}

export const PROC_SUPERVISION_LABELS: Record<string, string> = {
  supervised: 'Supervised',
  unsupervised: 'Unsupervised',
}

export const REFL_TYPE_LABELS: Record<string, string> = {
  cbd: 'CBD (Case-Based Discussion)',
  dop: 'DOP (Directly Observed Procedure)',
  mini_cex: 'Mini-CEX',
  reflection: 'Personal reflection',
}

export const REFL_TYPE_SHORT_LABELS: Record<string, string> = {
  cbd: 'CBD',
  dop: 'DOP',
  mini_cex: 'Mini-CEX',
  reflection: 'Personal reflection',
}

export const REFL_FRAMEWORK_LABELS: Record<string, string> = {
  none: 'No framework',
  gibbs: "Gibbs' Cycle",
  rolfe: 'Rolfe',
  driscoll: 'Driscoll',
}

// Competency themes: stored values can be either preset display names
// (e.g. "Leadership") or custom slugs (e.g. "gbr_safe_working"). Use this
// helper everywhere a stored value is rendered to the user.
import { COMPETENCY_THEMES } from '@/lib/constants/competency-themes'
const PRESET_THEMES = new Set<string>(COMPETENCY_THEMES)

export function formatCompetencyTheme(value: string): string {
  if (PRESET_THEMES.has(value)) return value
  return titleCase(value)
}

// One canonical helper to build a human-readable subtitle for an entry,
// shared across cards / activity feeds / search / export selectors so we
// stop hand-rolling string mangling in three places.
export function entrySubtitle(entry: Partial<PortfolioEntry>): string {
  const bits: string[] = []
  switch (entry.category) {
    case 'audit_qip':
      if (entry.audit_type) bits.push(AUDIT_TYPE_LABELS[entry.audit_type] ?? entry.audit_type.toUpperCase())
      if (entry.audit_cycle_stage) bits.push(AUDIT_CYCLE_STAGE_LABELS[entry.audit_cycle_stage] ?? titleCase(entry.audit_cycle_stage))
      if (entry.audit_trust) bits.push(entry.audit_trust)
      break
    case 'teaching':
      if (entry.teaching_type) bits.push(TEACHING_TYPE_LABELS[entry.teaching_type] ?? titleCase(entry.teaching_type))
      if (entry.teaching_audience) bits.push(TEACHING_AUDIENCE_LABELS[entry.teaching_audience] ?? titleCase(entry.teaching_audience))
      break
    case 'conference':
      if (entry.conf_type) bits.push(CONF_TYPE_LABELS[entry.conf_type] ?? titleCase(entry.conf_type))
      if (entry.conf_event_name) bits.push(entry.conf_event_name)
      if (entry.conf_level) bits.push(LEVEL_LABELS[entry.conf_level] ?? titleCase(entry.conf_level))
      break
    case 'publication':
      if (entry.pub_type) bits.push(PUB_TYPE_LABELS[entry.pub_type] ?? titleCase(entry.pub_type))
      if (entry.pub_status) bits.push(PUB_STATUS_LABELS[entry.pub_status] ?? titleCase(entry.pub_status))
      if (entry.pub_journal) bits.push(entry.pub_journal)
      break
    case 'leadership':
      if (entry.leader_role) bits.push(entry.leader_role)
      if (entry.leader_organisation) bits.push(entry.leader_organisation)
      break
    case 'prize':
      if (entry.prize_body) bits.push(entry.prize_body)
      if (entry.prize_level) bits.push(LEVEL_LABELS[entry.prize_level] ?? titleCase(entry.prize_level))
      break
    case 'procedure':
      if (entry.proc_name) bits.push(entry.proc_name)
      if (entry.proc_supervision) bits.push(PROC_SUPERVISION_LABELS[entry.proc_supervision] ?? titleCase(entry.proc_supervision))
      break
    case 'reflection':
      if (entry.refl_type) bits.push(REFL_TYPE_SHORT_LABELS[entry.refl_type] ?? entry.refl_type.toUpperCase())
      if (entry.refl_clinical_context) bits.push(entry.refl_clinical_context)
      break
  }
  return bits.filter(Boolean).join(' · ')
}
