export type ChangelogEntry = {
  date: string
  title: string
  body: string
  video?: string
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-10-01',
    title: 'Dates, rotations, trash and snippets',
    body: 'Dashboard charts, streaks and "time since" now follow the date on each entry, so backfilled work shows when it happened. Rotations have an end date, WBAs have a type, Trash can delete an item permanently straight away, goals can count from a start date, and typing / in any notes box opens your snippets.',
  },
  {
    date: '2026-09-28',
    title: 'Foundation Programme 2021 capabilities',
    body: 'The ARCP page now lists the 13 Foundation Professional Capabilities from the 2021 curriculum.',
  },
  {
    date: '2026-07-11',
    title: 'Case templates and reusable evidence',
    body: 'Start a case from a template, link cases as ARCP and specialty evidence, attach one uploaded file to several entries and cases, and see every file you have uploaded in Import & export > Files.',
  },
  {
    date: '2026-05-06',
    title: 'Stage 2 workspace upgrades',
    body: 'Search, tracking logs, dashboard visualisations, share controls, export templates, and onboarding polish are now available.',
  },
]
