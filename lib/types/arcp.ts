// The stored category column predates the curriculum re-seed and is limited to
// these four values; the UK Foundation Programme Curriculum 2021's three Higher
// Level Outcomes are stored in three of them (see
// supabase/migrations/2026_09_28_arcp_capabilities_fp2021_fpcs.sql). 'safety'
// is unused by the 13 FPCs.
export type ARCPCategory = 'clinical' | 'safety' | 'professional' | 'development'

export const ARCP_CATEGORY_LABELS: Record<ARCPCategory, string> = {
  clinical:     'HLO 1: An accountable, capable and compassionate doctor',
  safety:       'Patient safety',
  professional: 'HLO 2: A valuable member of the healthcare workforce',
  development:  'HLO 3: A professional, responsible for their own practice and portfolio development',
}

export type ARCPCapability = {
  id: string
  capability_key: string
  name: string
  description: string | null
  category: ARCPCategory
  sort_order: number
}

export type ARCPEntryLink = {
  id: string
  user_id: string
  capability_key: string
  entry_id: string
  entry_type: 'portfolio' | 'case'
  notes: string | null
  created_at: string
  // Display-only (never stored): the linked entry's / case's date, resolved
  // server-side for the rotation filter (lib/specialties/linked-entry-meta.ts).
  entry_title?: string | null
  entry_date?: string | null
}
