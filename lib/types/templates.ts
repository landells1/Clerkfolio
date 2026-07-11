import type { Category } from './portfolio'

export type TemplateEntryType = 'portfolio' | 'case'

// jsonb column. string[] carries a case template's clinical_domains.
export type TemplateFieldDefaults = Record<string, string | number | boolean | string[]>

type TemplateBase = {
  id: string
  user_id: string | null
  name: string
  description: string | null
  field_defaults: TemplateFieldDefaults
  guidance_prompts: Record<string, string>
  is_curated: boolean
  created_at: string
}

// Portfolio entry templates keep the portfolio Category. Case templates have
// no category concept, so they store the sentinel 'case' in the legacy
// NOT NULL category column (see supabase/migrations/2026_07_11_case_templates.sql).
export type PortfolioTemplate = TemplateBase & {
  entry_type: 'portfolio'
  category: Category
}

export type CaseTemplate = TemplateBase & {
  entry_type: 'case'
  category: 'case'
}

export type Template = PortfolioTemplate | CaseTemplate

export type NewTemplate = Omit<PortfolioTemplate, 'id' | 'user_id' | 'created_at' | 'is_curated'>
