const NHS_EMAIL_PATTERNS = [
  /\.nhs\.uk$/,
  /\.nhs\.scot$/,
  /\.wales\.nhs\.uk$/,
]

export function normaliseEmail(email: unknown) {
  return typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : ''
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isAcUkEmail(email: string) {
  return isValidEmail(email) && email.endsWith('.ac.uk')
}

export function isNhsEmail(email: string) {
  if (!isValidEmail(email)) return false

  const domain = email.split('@')[1] ?? ''
  return (
    domain === 'nhs.net' ||
    domain === 'hscni.net' ||
    NHS_EMAIL_PATTERNS.some(pattern => pattern.test(domain))
  )
}

export function isInstitutionEmail(email: string) {
  return isAcUkEmail(email) || isNhsEmail(email)
}

export function institutionalEmailHelpText() {
  return 'Use a .ac.uk, nhs.net, nhs.uk, nhs.scot, wales.nhs.uk, or hscni.net email address.'
}
