import type { TemplateFieldDefaults } from '@/lib/types/templates'

// Field-default shaping for CASE templates.
//
// Capturing a personal template from an existing case deliberately keeps
// structure only (clinical areas) and NEVER the notes free text - clinical
// narrative must not be baked into a reusable template.
export function buildCaseTemplateFieldDefaults(c: {
  clinical_domains?: string[] | null
  clinical_domain?: string | null
}): TemplateFieldDefaults {
  const domains = c.clinical_domains?.length
    ? c.clinical_domains
    : c.clinical_domain
      ? [c.clinical_domain]
      : []
  const d: TemplateFieldDefaults = {}
  if (domains.length > 0) d.clinical_domains = domains
  return d
}

export function clinicalDomainsFromDefaults(d: TemplateFieldDefaults): string[] {
  const raw = d.clinical_domains
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string')
}

// The scaffold text to place into the notes box, or null when there is
// nothing to apply. Never overwrites notes the user has already typed.
export function notesScaffoldFromDefaults(d: TemplateFieldDefaults, currentNotes: string): string | null {
  const scaffold = d.notes
  if (typeof scaffold !== 'string' || !scaffold.trim()) return null
  if (currentNotes.trim()) return null
  return scaffold
}
