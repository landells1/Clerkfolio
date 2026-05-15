// Shared PII detection for user-imported content. Runs over case notes,
// portfolio entry titles + notes, and reflection free text before insert.
// Tighter than a single NHS-number regex so users can't bypass the guard by
// stripping spaces, swapping separators, or pasting a DOB-shaped string.

const NHS_NUMBER_FORMS = /\b(\d[\s\-\.]?){10}\b/g

const DOB_FORMATS = [
  /\b(?:0[1-9]|[12]\d|3[01])[\/\-\.](?:0[1-9]|1[0-2])[\/\-\.](?:19|20)\d{2}\b/, // DD/MM/YYYY etc.
  /\b(?:19|20)\d{2}[\/\-\.](?:0[1-9]|1[0-2])[\/\-\.](?:0[1-9]|[12]\d|3[01])\b/, // YYYY-MM-DD etc.
]

const WARD_BED_PATTERN = /\b(?:bay|bed|ward|bay\s?#|bed\s?#)\s*\d+\b/i

const NAME_PATTERNS = [
  /\b(?:Mr|Mrs|Ms|Miss|Dr)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/, // Title + Capitalised Name
  /\b(?:Mr|Mrs|Ms|Miss|Dr)\s+[A-Z]\.?\s*[A-Z]\.?\b/,            // Title + initials
]

// Validate a 10-digit string as an NHS number using the Modulus-11 checksum.
// Eliminates false positives on phone numbers and arbitrary 10-digit codes.
function isValidNhsNumber(digits: string): boolean {
  if (digits.length !== 10) return false
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i)
  }
  const remainder = sum % 11
  let check = 11 - remainder
  if (check === 11) check = 0
  if (check === 10) return false
  return check === Number(digits[9])
}

export function containsPII(value: string): boolean {
  if (!value) return false

  // NHS number: strip separators, validate checksum.
  const nhsMatches = value.match(NHS_NUMBER_FORMS) ?? []
  for (const match of nhsMatches) {
    const digits = match.replace(/[^0-9]/g, '')
    if (isValidNhsNumber(digits)) return true
  }

  if (DOB_FORMATS.some(pattern => pattern.test(value))) return true
  if (WARD_BED_PATTERN.test(value)) return true
  if (NAME_PATTERNS.some(pattern => pattern.test(value))) return true

  return false
}
