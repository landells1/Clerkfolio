export type ARCPCategory = 'clinical' | 'safety' | 'professional' | 'development'

export const ARCP_CATEGORY_LABELS: Record<ARCPCategory, string> = {
  clinical:     'Clinical Skills',
  safety:       'Patient Safety',
  professional: 'Professional Skills',
  development:  'Professional Development',
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
  entry_type: 'portfolio'
  notes: string | null
  created_at: string
}
