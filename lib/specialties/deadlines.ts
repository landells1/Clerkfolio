import { SPECIALTY_CONFIGS } from '@/lib/specialties'

export type SpecialtyDeadline = {
  specialtyKey: string
  label: string
  date: string
  kind: 'applicationOpens' | 'applicationCloses'
}

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
        },
        {
          specialtyKey: config.key,
          label: `${config.name} applications close`,
          date: config.applicationWindow!.closesDate,
          kind: 'applicationCloses' as const,
        },
      ],
    ])
)

export function getDeadlinesForSpecialty(specialtyKey: string) {
  return SPECIALTY_DEADLINES[specialtyKey] ?? []
}
