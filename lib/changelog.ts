export type ChangelogEntry = {
  date: string
  title: string
  body: string
  video?: string
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-05-06',
    title: 'Stage 2 workspace upgrades',
    body: 'Search, tracking logs, dashboard visualisations, share controls, export templates, and onboarding polish are now available.',
  },
]
