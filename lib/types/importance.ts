// User-set importance rating (Batch 3 / F-016) — replaces the removed auto
// "completeness" signal. Coarse 3-level scale; null = "not set".

export type Importance = 'low' | 'medium' | 'high'

export const IMPORTANCE_VALUES: Importance[] = ['low', 'medium', 'high']

export const IMPORTANCE_OPTIONS: { value: Importance; label: string; short: string }[] = [
  { value: 'low', label: 'Low', short: 'Low' },
  { value: 'medium', label: 'Medium', short: 'Med' },
  { value: 'high', label: 'High', short: 'High' },
]

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

// Numeric rank for sorting (higher = more important). null sorts below 'low'.
export const IMPORTANCE_RANK: Record<Importance, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

export function isImportance(value: unknown): value is Importance {
  return value === 'low' || value === 'medium' || value === 'high'
}
