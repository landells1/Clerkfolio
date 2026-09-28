import type { Category } from '@/lib/types/portfolio'

// Most recent entries included in a CV (preview, PDF and DOCX alike), so the
// download never silently holds more or fewer than the preview shows.
export const CV_ENTRY_LIMIT = 120

// Section order per CV template - the single source for the /export/cv preview,
// the CV PDF and the CV DOCX, so the download matches what the preview shows.
export const CV_TEMPLATE_CATEGORY_ORDER = {
  clinical: ['procedure', 'audit_qip', 'teaching', 'reflection', 'leadership', 'conference', 'publication', 'prize', 'custom'],
  academic: ['publication', 'audit_qip', 'conference', 'teaching', 'prize', 'leadership', 'custom', 'procedure', 'reflection'],
  st_application: ['audit_qip', 'leadership', 'teaching', 'publication', 'procedure', 'conference', 'prize', 'reflection', 'custom'],
} as const satisfies Record<string, readonly Category[]>

export type CvTemplateKey = keyof typeof CV_TEMPLATE_CATEGORY_ORDER

export function cvCategoryOrder(template: string): Category[] {
  const key = (template in CV_TEMPLATE_CATEGORY_ORDER ? template : 'clinical') as CvTemplateKey
  return [...CV_TEMPLATE_CATEGORY_ORDER[key]]
}

/**
 * Renderer section order: the requested order first (unknown values dropped),
 * then any canonical category it left out, so no entries are ever lost.
 */
export function resolveSectionOrder<T extends string>(canonical: readonly T[], requested?: readonly string[] | null): T[] {
  if (!requested?.length) return [...canonical]
  const picked = requested.filter((c): c is T => (canonical as readonly string[]).includes(c))
  const unique = Array.from(new Set(picked))
  return [...unique, ...canonical.filter(c => !unique.includes(c))]
}
