const NHS_NUMBER = /\b(?:nhs\s*(?:number|no\.?)\s*)?\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/i
const DOB = /\b(?:dob|date\s+of\s+birth|born)\s*[:\-]?\s*\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/i
const BED_LOCATION = /\b(?:bay|bed|ward)\s+\w+(?:\s+(?:bed|bay)\s+\w+)?\b/i
const HONORIFIC_NAME = /\b(?:mr|mrs|ms|miss|mx|dr)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/

export function containsPII(value: string | null | undefined): boolean {
  if (!value) return false
  return [NHS_NUMBER, DOB, BED_LOCATION, HONORIFIC_NAME].some(pattern => pattern.test(value))
}
