// Renders an ISO guide date as UK long form, e.g. '13 July 2026'. Fixed
// en-GB + UTC so server and client can never disagree.
export function formatGuideDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
