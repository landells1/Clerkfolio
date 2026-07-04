// Preset competency themes offered by the CompetencyThemePicker. The
// user-facing concept is "Competency themes"; they are persisted on the
// legacy-named `interview_themes` column (the DB column keeps its original name
// to avoid a live-column rename migration). Custom themes live in the
// `custom_competency_themes` table. See CLAUDE.md "UI Conventions".
export const COMPETENCY_THEMES = [
  'Leadership',
  'Teamwork',
  'Communication',
  'Clinical Reasoning',
  'Teaching',
  'Research',
  'Audit & Quality Improvement',
  'Professionalism',
] as const
