export const NHS_RECRUITMENT_TIMELINE_URL =
  'https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/overview-of-specialty-training/recruitment-timelines'

export type SpecialtyDeadline = {
  specialtyKey: string
  label: string
  date: string
  kind:
    | 'applicationOpens'
    | 'applicationCloses'
    | 'interviewWindowOpens'
    | 'interviewWindowCloses'
    | 'initialOffers'
    | 'holdDeadline'
    | 'upgradeDeadline'
    | 'hierarchicalDeadline'
  sourceUrl: string
  sourceLabel: string
  details?: string
}

export const NHS_ROUND_3_2026_DEADLINES: SpecialtyDeadline[] = [
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3 2026: applications open',
    date: '2026-07-28',
    kind: 'applicationOpens',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 applications open. Round 3 is for posts commencing between January and March 2027. Not all specialties will advertise in this round.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3 2026: applications close',
    date: '2026-08-13',
    kind: 'applicationCloses',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 applications close. Applications close at 4pm UK local time.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3 2026: interviews open',
    date: '2026-08-24',
    kind: 'interviewWindowOpens',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 interview window opens.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3 2026: interviews close',
    date: '2026-10-16',
    kind: 'interviewWindowCloses',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 interview window closes.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3 2026: initial offers',
    date: '2026-10-20',
    kind: 'initialOffers',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 initial offers are released by this date. Initial offers are due by 5pm UK local time.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3 2026: hold deadline',
    date: '2026-10-27',
    kind: 'holdDeadline',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 hold deadline. Hold deadline is 1pm UK local time.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3 2026: upgrade deadline',
    date: '2026-10-29',
    kind: 'upgradeDeadline',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 upgrade deadline. Upgrade deadline is 4pm UK local time.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3 2026: hierarchy deadline',
    date: '2026-10-29',
    kind: 'hierarchicalDeadline',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 hierarchical deadline. Hierarchical deadline is 5pm UK local time.',
  },
]

const ROUND_1_2027_SOURCE = {
  specialtyKey: 'nhs_round_1_2027',
  sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
  sourceLabel: 'NHS England Medical Hub recruitment timeline',
} as const

// 2027 Round 1 (CT1/ST1 and ST3/ST4 national timeline, posts starting August
// 2027). Verified 2026-09-28 against the NHS England Medical Hub timeline.
export const NHS_ROUND_1_2027_DEADLINES: SpecialtyDeadline[] = [
  {
    ...ROUND_1_2027_SOURCE,
    label: 'Round 1 2027: applications open',
    date: '2026-10-22',
    kind: 'applicationOpens',
    details: 'NHS specialty recruitment 2027 Round 1 applications open on Oriel at 10am UK local time. Round 1 is for posts starting from August 2027. From 2027 each applicant can submit a maximum of five applications per round.',
  },
  {
    ...ROUND_1_2027_SOURCE,
    label: 'Round 1 2027: applications close',
    date: '2026-11-19',
    kind: 'applicationCloses',
    details: 'NHS specialty recruitment 2027 Round 1 applications close at 4pm UK local time.',
  },
  {
    ...ROUND_1_2027_SOURCE,
    label: 'Round 1 2027: interviews open',
    date: '2027-01-11',
    kind: 'interviewWindowOpens',
    details: 'NHS specialty recruitment 2027 Round 1 national interview window opens. Individual specialties set their own interview dates within this window.',
  },
  {
    ...ROUND_1_2027_SOURCE,
    label: 'Round 1 2027: interviews close',
    date: '2027-04-02',
    kind: 'interviewWindowCloses',
    details: 'NHS specialty recruitment 2027 Round 1 national interview window closes.',
  },
  {
    ...ROUND_1_2027_SOURCE,
    label: 'Round 1 2027: initial offers',
    date: '2027-04-06',
    kind: 'initialOffers',
    details: 'NHS specialty recruitment 2027 Round 1 initial offers are released at 5pm UK local time.',
  },
  {
    ...ROUND_1_2027_SOURCE,
    label: 'Round 1 2027: hold deadline',
    date: '2027-04-09',
    kind: 'holdDeadline',
    details: 'NHS specialty recruitment 2027 Round 1 hold deadline. Hold deadline is 9am UK local time.',
  },
  {
    ...ROUND_1_2027_SOURCE,
    label: 'Round 1 2027: upgrade deadline',
    date: '2027-04-14',
    kind: 'upgradeDeadline',
    details: 'NHS specialty recruitment 2027 Round 1 upgrade deadline. Upgrade deadline is 4pm UK local time.',
  },
  {
    ...ROUND_1_2027_SOURCE,
    label: 'Round 1 2027: hierarchy deadline',
    date: '2027-04-15',
    kind: 'hierarchicalDeadline',
    details: 'NHS specialty recruitment 2027 Round 1 hierarchical deadline. Hierarchical deadline is 4pm UK local time.',
  },
]

// Every pinned national round, oldest first. Add the next round here (and in
// the freshness tripwire test) when NHS England publishes it; verify against
// NHS_RECRUITMENT_TIMELINE_URL first - dates are time-sensitive.
export const NHS_NATIONAL_RECRUITMENT_ROUNDS: SpecialtyDeadline[][] = [
  NHS_ROUND_3_2026_DEADLINES,
  NHS_ROUND_1_2027_DEADLINES,
]

// Each round's dates are pinned. After a round closes its dates are in the
// past and the figures we surface to users quietly become misleading. Callers
// can use this helper to render an "out-of-date - please re-check the source
// URL" notice once the most recent close-date has elapsed for a set.
export function isSpecialtyCycleStale(deadlines: SpecialtyDeadline[], referenceDate: Date = new Date()): boolean {
  if (deadlines.length === 0) return false
  const latest = deadlines.reduce((acc, d) => (d.date > acc ? d.date : acc), deadlines[0].date)
  // Add a 30-day grace window so we don't flash "stale" the moment the
  // last deadline ticks past - the cycle can still be live in practice.
  const cutoff = new Date(latest)
  cutoff.setDate(cutoff.getDate() + 30)
  return referenceDate.getTime() > cutoff.getTime()
}

/** Stable, round-unique id for a national deadline (React keys, ICS UIDs). */
export function nationalDeadlineId(deadline: SpecialtyDeadline): string {
  return `${deadline.specialtyKey}-${deadline.kind}`
}

// The national dates the Timeline page and the ICS feed should surface right
// now: every pinned round that has not yet gone stale (so a closed round drops
// out by itself once a newer one is pinned). If every pinned round is stale the
// most recent one is returned flagged `stale`, so callers can annotate it
// instead of silently showing past dates as live.
export function currentNationalRecruitmentDeadlines(
  referenceDate: Date = new Date(),
  rounds: SpecialtyDeadline[][] = NHS_NATIONAL_RECRUITMENT_ROUNDS
): { deadlines: SpecialtyDeadline[]; stale: boolean } {
  const nonEmpty = rounds.filter(round => round.length > 0)
  if (nonEmpty.length === 0) return { deadlines: [], stale: false }
  const live = nonEmpty.filter(round => !isSpecialtyCycleStale(round, referenceDate))
  if (live.length > 0) {
    const deadlines = live.flat().sort((a, b) => a.date.localeCompare(b.date))
    return { deadlines, stale: false }
  }
  const latestDate = (round: SpecialtyDeadline[]) => round.reduce((acc, d) => (d.date > acc ? d.date : acc), round[0].date)
  const mostRecent = nonEmpty.reduce((acc, round) => (latestDate(round) > latestDate(acc) ? round : acc))
  return { deadlines: mostRecent, stale: true }
}
