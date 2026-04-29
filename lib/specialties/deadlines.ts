import { SPECIALTY_CONFIGS } from '@/lib/specialties'

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
    label: 'Round 3: applications open',
    date: '2026-07-28',
    kind: 'applicationOpens',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 applications open. Round 3 is for posts commencing between January and March 2027. Not all specialties will advertise in this round.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3: applications close',
    date: '2026-08-13',
    kind: 'applicationCloses',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 applications close. Applications close at 4pm UK local time.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3: interviews open',
    date: '2026-08-24',
    kind: 'interviewWindowOpens',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 interview window opens.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3: interviews close',
    date: '2026-10-16',
    kind: 'interviewWindowCloses',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 interview window closes.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3: initial offers',
    date: '2026-10-20',
    kind: 'initialOffers',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 initial offers are released by this date. Initial offers are due by 5pm UK local time.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3: hold deadline',
    date: '2026-10-27',
    kind: 'holdDeadline',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 hold deadline. Hold deadline is 1pm UK local time.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3: upgrade deadline',
    date: '2026-10-29',
    kind: 'upgradeDeadline',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 upgrade deadline. Upgrade deadline is 4pm UK local time.',
  },
  {
    specialtyKey: 'nhs_round_3_2026',
    label: 'Round 3: hierarchy deadline',
    date: '2026-10-29',
    kind: 'hierarchicalDeadline',
    sourceUrl: NHS_RECRUITMENT_TIMELINE_URL,
    sourceLabel: 'NHS England Medical Hub recruitment timeline',
    details: 'NHS specialty recruitment Round 3 hierarchical deadline. Hierarchical deadline is 5pm UK local time.',
  },
]

export const SPECIALTY_DEADLINES: Record<string, SpecialtyDeadline[]> = Object.fromEntries(
  SPECIALTY_CONFIGS
    .filter(config => config.applicationWindow)
    .map(config => [
      config.key,
      [
        {
          specialtyKey: config.key,
          label: `${config.name} applications open`,
          date: config.applicationWindow!.opensDate,
          kind: 'applicationOpens' as const,
          sourceUrl: config.applicationWindow!.source,
          sourceLabel: config.sourceLabel,
        },
        {
          specialtyKey: config.key,
          label: `${config.name} applications close`,
          date: config.applicationWindow!.closesDate,
          kind: 'applicationCloses' as const,
          sourceUrl: config.applicationWindow!.source,
          sourceLabel: config.sourceLabel,
        },
      ],
    ])
)

export function getDeadlinesForSpecialty(specialtyKey: string) {
  return SPECIALTY_DEADLINES[specialtyKey] ?? []
}
