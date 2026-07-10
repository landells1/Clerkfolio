import { COMPETENCY_THEMES } from '@/lib/constants/competency-themes'

export type ThemeCoverageRow = {
  slug: string
  label: string
  count: number
  isCustom: boolean
}

type ThemedRecord = { interview_themes?: string[] | null }

export type CustomThemeRef = { slug: string; name: string }

/**
 * Tallies how many portfolio entries + cases carry each competency theme.
 * Presets always appear (even at 0 - the dashboard widget shows zero counts
 * plainly rather than hiding them) in their declared order; custom themes
 * are appended in the order supplied (callers pass them pre-sorted, e.g. by
 * name - see the picker's own `.order('name')`). Purely a descriptive tally,
 * no scoring or "recommended" ordering.
 */
export function buildThemeCoverage(
  entries: ThemedRecord[],
  cases: ThemedRecord[],
  customThemes: CustomThemeRef[] = []
): ThemeCoverageRow[] {
  const counts = new Map<string, number>()
  for (const record of [...entries, ...cases]) {
    for (const theme of record.interview_themes ?? []) {
      counts.set(theme, (counts.get(theme) ?? 0) + 1)
    }
  }

  const presetRows: ThemeCoverageRow[] = COMPETENCY_THEMES.map(theme => ({
    slug: theme,
    label: theme,
    count: counts.get(theme) ?? 0,
    isCustom: false,
  }))

  const customRows: ThemeCoverageRow[] = customThemes.map(theme => ({
    slug: theme.slug,
    label: theme.name,
    count: counts.get(theme.slug) ?? 0,
    isCustom: true,
  }))

  return [...presetRows, ...customRows]
}
