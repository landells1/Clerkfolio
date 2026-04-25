export function relativeDate(isoDate: string): string {
  const date = new Date(isoDate.includes('T') ? isoDate : isoDate + 'T12:00:00Z')
  const now = new Date()

  // Compare local calendar dates so BST/timezone doesn't shift "yesterday" to "today"
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate  = new Date(date.getFullYear(), date.getMonth(), date.getDate())
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
