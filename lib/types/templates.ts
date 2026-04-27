import type { Category } from './portfolio'

export type Template = {
  id: string
  user_id: string | null
  category: Category
  name: string
  description: string | null
  field_defaults: Record<string, string | number | boolean>
  guidance_prompts: Record<string, string>
  is_curated: boolean
  created_at: string
}

export type NewTemplate = Omit<Template, 'id' | 'user_id' | 'created_at' | 'is_curated'>
