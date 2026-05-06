export function relativeDate(isoDate: string, timezone = 'Europe/London'): string {
  const date = new Date(isoDate.includes('T') ? isoDate : isoDate + 'T12:00:00Z')
  const now = new Date()

  const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  const startOfToday = new Date(`${todayParts}T00:00:00Z`)
  const startOfDate = new Date(`${dateParts}T00:00:00Z`)
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000)

  if (diffDays < 0)  return 'In the future'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return '1 month ago'
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  if (diffDays < 730) return '1 year ago'
  return `${Math.floor(diffDays / 365)} years ago`
}
