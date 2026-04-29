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

export const COMPETENCY_THEMES = INTERVIEW_THEMES

export type InterviewTheme = typeof INTERVIEW_THEMES[number]
export type CompetencyTheme = typeof COMPETENCY_THEMES[number]
