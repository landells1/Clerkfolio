// Validation for the free-typed numeric fields on the portfolio entry form.
// The form sets `noValidate` so we can surface these as inline messages in the
// error banner instead of the easy-to-miss native HTML5 validation bubble
// (QOL-009). Kept pure so it can be unit-tested without the React form.

export const PROC_COUNT_MAX = 9999
export const CPD_HOURS_MAX = 999

/**
 * Validate the optional numeric fields for a portfolio entry.
 * Returns a human-readable error message, or `null` when the values are valid.
 * Empty/whitespace values are treated as "not provided" (the fields are optional).
 */
export function validateEntryNumericFields(
  category: string,
  procCount: string,
  confCpdHours: string,
): string | null {
  if (category === 'procedure' && procCount.trim()) {
    const n = Number(procCount)
    if (!Number.isInteger(n) || n < 1 || n > PROC_COUNT_MAX) {
      return 'Number performed must be a whole number between 1 and 9,999.'
    }
  }
  if (category === 'conference' && confCpdHours.trim()) {
    const n = Number(confCpdHours)
    if (Number.isNaN(n) || n < 0 || n > CPD_HOURS_MAX) {
      return 'CPD hours must be a number between 0 and 999.'
    }
  }
  return null
}
