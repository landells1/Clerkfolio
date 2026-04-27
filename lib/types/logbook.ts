export type LogbookRole = 'Surgeon' | 'First Assist' | 'Second Assist' | 'Scrubbed' | 'Observed'
export type LogbookSupervision = 'Independent' | 'Supervised' | 'Assisted' | 'Directed' | 'Observed'

export type LogbookEntry = {
  id: string
  user_id: string
  date: string
  procedure_name: string
  surgical_specialty: string
  role: LogbookRole
  supervision: LogbookSupervision | null
  supervisor_name: string | null
  learning_points: string | null
  specialty_tags: string[]
  pinned: boolean
  deleted_at: string | null
  created_at: string
}

export const LOGBOOK_ROLES: { value: LogbookRole; label: string; colour: string }[] = [
  { value: 'Surgeon',       label: 'Surgeon',    colour: 'bg-[#1B6FD9]/15 text-[#1B6FD9] border border-[#1B6FD9]/25' },
  { value: 'First Assist',  label: '1st Assist', colour: 'bg-purple-500/15 text-purple-400 border border-purple-500/25' },
  { value: 'Second Assist', label: '2nd Assist', colour: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25' },
  { value: 'Scrubbed',      label: 'Scrubbed',   colour: 'bg-teal-500/15 text-teal-400 border border-teal-500/25' },
  { value: 'Observed',      label: 'Observed',   colour: 'bg-white/[0.06] text-[rgba(245,245,242,0.45)] border border-white/[0.1]' },
]

export const LOGBOOK_SUPERVISION: { value: LogbookSupervision; label: string }[] = [
  { value: 'Independent', label: 'Independent' },
  { value: 'Supervised',  label: 'Supervised (available)' },
  { value: 'Assisted',    label: 'Assisted (when needed)' },
  { value: 'Directed',    label: 'Directed (throughout)' },
  { value: 'Observed',    label: 'Observed' },
]

export const SURGICAL_SPECIALTIES = [
  'General Surgery',
  'Trauma & Orthopaedics',
  'Urology',
  'Vascular Surgery',
  'Cardiothoracic Surgery',
  'Neurosurgery',
  'ENT / Head & Neck',
  'Ophthalmology',
  'Plastic Surgery',
  'Oral & Maxillofacial',
  'Paediatric Surgery',
  'Colorectal Surgery',
  'Hepatobiliary Surgery',
  'Upper GI Surgery',
  'Breast Surgery',
  'Endocrine Surgery',
  'Other',
]
