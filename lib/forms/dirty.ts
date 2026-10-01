// Unsaved-changes detection for the entry / case forms.
//
// The forms used to set a sticky "dirty" flag on the first keystroke, so
// typing a letter and deleting it again still triggered the browser's
// "Leave site?" prompt. Instead the form compares a snapshot of its current
// values with the snapshot taken once it finished loading: a form edited back
// to exactly how it started is pristine again.

type Value = unknown

function normalise(value: Value): Value {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(normalise)
  if (typeof value === 'object') {
    const record = value as Record<string, Value>
    const out: Record<string, Value> = {}
    for (const key of Object.keys(record).sort()) {
      const normalised = normalise(record[key])
      // Treat an empty string the same as a missing key (e.g. a reflection
      // framework part typed into and cleared again).
      if (normalised === '') continue
      out[key] = normalised
    }
    return out
  }
  return value
}

/**
 * Stable, order-independent snapshot of a form's values. null, undefined and
 * '' compare equal, object keys are sorted, array order is kept (tag order is
 * meaningful to the user).
 */
export function formSnapshot(values: Record<string, Value>): string {
  return JSON.stringify(normalise(values))
}

/** Dirty only once a baseline exists and the current values differ from it. */
export function isFormDirty(baseline: string | null, current: string): boolean {
  return baseline !== null && baseline !== current
}
