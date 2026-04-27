export const INTERVIEW_THEMES = [
  'Leadership',
  'Teamwork',
  'Communication',
  'Clinical Reasoning',
  'Teaching',
  'Research',
  'Audit & Quality Improvement',
  'Professionalism',
] as const

export type InterviewTheme = typeof INTERVIEW_THEMES[number]
