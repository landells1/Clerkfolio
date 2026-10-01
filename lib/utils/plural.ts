// Count-aware wording so UI copy never reads "1 entries" or "1 attempts".
// `plural` defaults to `${singular}s`; pass it for irregular nouns
// ("entry" -> "entries").

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural
}

/** "1 entry", "3 entries", "0 cases". */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${pluralize(count, singular, plural)}`
}

/** Ordinal for small counts: 1st, 2nd, 3rd, 4th, 11th, 21st. */
export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

/** Sentence case: first letter upper, the rest as given ("WBA" stays "WBA"). */
export function sentenceCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}
