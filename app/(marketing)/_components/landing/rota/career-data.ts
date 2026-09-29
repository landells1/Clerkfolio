// Illustrative example record for the landing page. Every entry is
// synthetic and anonymised; the page labels the grid "Example record".

export const STAGES = [
  { key: 'med', label: 'Med school', where: 'Medical school' },
  { key: 'fy1', label: 'FY1', where: 'North trust' },
  { key: 'fy2', label: 'FY2', where: 'City trust' },
  { key: 'f3', label: 'F3', where: 'Locum posts' },
  { key: 'st', label: 'CT / ST', where: 'Your deanery' },
] as const

// Palette law: each category owns one fill, used everywhere on the page.
export const CATEGORIES = [
  { key: 'audit', label: 'Audit & QIP', fill: 'var(--r-cat-audit)' },
  { key: 'teaching', label: 'Teaching', fill: 'var(--r-cat-teaching)' },
  { key: 'cases', label: 'Cases', fill: 'var(--r-cat-cases)' },
  { key: 'courses', label: 'Courses & exams', fill: 'var(--r-cat-courses)' },
  { key: 'leadership', label: 'Leadership & prizes', fill: 'var(--r-cat-leadership)' },
] as const

export type StageKey = (typeof STAGES)[number]['key']
export type CategoryKey = (typeof CATEGORIES)[number]['key']

export type CareerEntry = { title: string; when: string; linked?: string }

export const ENTRIES: Partial<Record<`${StageKey}:${CategoryKey}`, CareerEntry>> = {
  'med:audit': { title: 'Hand hygiene audit', when: '2021' },
  'med:cases': { title: 'Acute asthma, paediatrics', when: '2022' },
  'med:courses': { title: 'ILS certificate', when: '2022' },
  'med:leadership': { title: 'Anatomy prize', when: '2020' },
  'fy1:audit': { title: 'VTE prophylaxis re-audit', when: 'Aug 2024', linked: 'IMT 2026: Quality Improvement' },
  'fy1:teaching': { title: 'OSCE teaching, 3rd years', when: 'Nov 2024', linked: 'IMT 2026: Teaching Experience' },
  'fy1:cases': { title: 'DKA in type 1 diabetes', when: 'Jan 2025' },
  'fy1:courses': { title: 'ALS certificate', when: 'Mar 2025' },
  'fy2:teaching': { title: 'Grand round talk', when: 'Oct 2025', linked: 'IMT 2026: Presentations & Posters' },
  'fy2:cases': { title: 'Anterior STEMI', when: 'Dec 2025' },
  'fy2:courses': { title: 'MRCP Part 1', when: 'Jan 2026' },
  'fy2:leadership': { title: 'FY2 forum rep', when: 'Feb 2026' },
  'f3:audit': { title: 'Sepsis screening QIP', when: 'Sep 2026', linked: 'IMT 2026: Quality Improvement' },
}

export const DEFAULT_SELECTION = 'fy1:audit' as const

export function cellAddress(stageIndex: number, categoryIndex: number) {
  // Column A holds the row labels; rows 1 and 2 are the frozen headers.
  return `${String.fromCharCode(66 + stageIndex)}${categoryIndex + 3}`
}
