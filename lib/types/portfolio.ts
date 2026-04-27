export type Category =
  | 'audit_qip'
  | 'teaching'
  | 'conference'
  | 'publication'
  | 'leadership'
  | 'prize'
  | 'procedure'
  | 'reflection'
  | 'custom'

export const CATEGORIES: { value: Category; label: string; short: string }[] = [
  { value: 'audit_qip',   label: 'Audit & QIP',               short: 'Audit' },
  { value: 'teaching',    label: 'Teaching & Presentations',   short: 'Teaching' },
  { value: 'conference',  label: 'Conferences & Courses',      short: 'Conference' },
  { value: 'publication', label: 'Publications & Research',    short: 'Publication' },
  { value: 'leadership',  label: 'Leadership & Societies',     short: 'Leadership' },
  { value: 'prize',       label: 'Prizes & Awards',            short: 'Prize' },
  { value: 'procedure',   label: 'Procedures & Clinical Skills', short: 'Procedure' },
  { value: 'reflection',  label: 'Reflections & CBDs/DOPs',   short: 'Reflection' },
  { value: 'custom',      label: 'Custom',                     short: 'Custom' },
]

type ColourSet = { badge: string; dot: string; bg: string; text: string; bar: string }

export const CATEGORY_COLOURS: Record<Category, ColourSet> = {
  audit_qip:   { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20',   dot: 'bg-blue-400',   bg: 'bg-blue-500/15',   text: 'text-blue-400',   bar: 'bg-blue-400' },
  teaching:    { badge: 'bg-purple-500/15 text-purple-400 border-purple-500/20', dot: 'bg-purple-400', bg: 'bg-purple-500/15', text: 'text-purple-400', bar: 'bg-purple-400' },
  conference:  { badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20', dot: 'bg-yellow-400', bg: 'bg-yellow-500/15', text: 'text-yellow-400', bar: 'bg-yellow-400' },
  publication: { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/20', dot: 'bg-orange-400', bg: 'bg-orange-500/15', text: 'text-orange-400', bar: 'bg-orange-400' },
  leadership:  { badge: 'bg-pink-500/15 text-pink-400 border-pink-500/20',   dot: 'bg-pink-400',   bg: 'bg-pink-500/15',   text: 'text-pink-400',   bar: 'bg-pink-400' },
  prize:       { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20', dot: 'bg-amber-400',  bg: 'bg-amber-500/15',  text: 'text-amber-400',  bar: 'bg-amber-400' },
  procedure:   { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20',   dot: 'bg-blue-400',   bg: 'bg-blue-500/15',   text: 'text-blue-400',   bar: 'bg-blue-400' },
  reflection:  { badge: 'bg-green-500/15 text-green-400 border-green-500/20', dot: 'bg-green-400',  bg: 'bg-green-500/15',  text: 'text-green-400',  bar: 'bg-green-400' },
  custom:      { badge: 'bg-[rgba(245,245,242,0.08)] text-[rgba(245,245,242,0.55)] border-white/[0.08]', dot: 'bg-[rgba(245,245,242,0.4)]', bg: 'bg-[rgba(245,245,242,0.08)]', text: 'text-[rgba(245,245,242,0.55)]', bar: 'bg-[rgba(245,245,242,0.4)]' },
}

export type PortfolioEntry = {
  id: string
  user_id: string
  category: Category
  title: string
  date: string
  specialty_tags: string[]
  notes: string | null
  pinned: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string

  // Audit & QIP
  audit_type?: string | null
  audit_role?: string | null
  audit_cycle_stage?: string | null
  audit_trust?: string | null
  audit_outcome?: string | null
  audit_presented?: boolean | null

  // Teaching & Presentations
  teaching_type?: string | null
  teaching_audience?: string | null
  teaching_setting?: string | null
  teaching_event?: string | null
  teaching_invited?: boolean | null

  // Conferences & Courses
  conf_type?: string | null
  conf_event_name?: string | null
  conf_attendance?: string | null
  conf_level?: string | null
  conf_cpd_hours?: number | null
  conf_certificate?: boolean | null

  // Publications & Research
  pub_type?: string | null
  pub_journal?: string | null
  pub_authors?: string | null
  pub_status?: string | null
  pub_doi?: string | null

  // Leadership & Societies
  leader_role?: string | null
  leader_organisation?: string | null
  leader_start_date?: string | null
  leader_end_date?: string | null
  leader_ongoing?: boolean | null

  // Prizes & Awards
  prize_body?: string | null
  prize_level?: string | null
  prize_description?: string | null

  // Procedures & Clinical Skills
  proc_name?: string | null
  proc_setting?: string | null
  proc_supervision?: string | null
  proc_count?: number | null

  // Reflections & CBDs/DOPs
  refl_type?: string | null
  refl_clinical_context?: string | null
  refl_supervisor?: string | null
  refl_free_text?: string | null

  // Custom
  custom_free_text?: string | null

  // Interview themes
  interview_themes?: string[]
}

export type NewPortfolioEntry = Omit<PortfolioEntry, 'id' | 'user_id' | 'pinned' | 'deleted_at' | 'created_at' | 'updated_at'>
