// Specialty colour assignments for pills, dots, and accents.
// Each specialty maps to one of the named pill colours defined in tailwind.config.ts.
// The pill colour name is used to construct Tailwind classes via colourClasses().

export type PillColour =
  | 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'cyan'
  | 'pink' | 'red' | 'teal' | 'indigo' | 'fuchsia' | 'neutral'

// Keyed by specialty_key (the slug stored in specialty_applications.specialty_key).
// Anything missing falls back to neutral.
const SPECIALTY_COLOURS: Record<string, PillColour> = {
  // Internal medicine / acute
  imt_2026: 'blue',
  accs_am_2026: 'blue',
  cardiology_st4_2026: 'red',

  // Surgery family - rose
  cst_2026: 'rose',
  general_surgery_st3_2026: 'rose',
  cardiothoracic_st1_2026: 'rose',
  neurosurgery_st1_2026: 'rose',
  plastic_surgery_st3_2026: 'rose',
  to_st3_2026: 'rose',
  omfs_st1_2026: 'rose',

  // GP - green
  gp_st1_2026: 'green',
  ph_gp_dual_st1_2026: 'green',

  // Emergency / acute - amber
  accs_em_2026: 'amber',
  em_st4_2026: 'amber',

  // Anaesthetics - teal
  anaesthetics_ct1_2026: 'teal',
  accs_anaes_2026: 'teal',

  // Psychiatry - violet
  core_psych_2026: 'violet',
  child_adolescent_psych_st1_2026: 'violet',
  psych_learning_disability_st1_2026: 'violet',

  // O&G / sexual health - fuchsia
  og_st1_2026: 'fuchsia',
  csrh_st1_2026: 'fuchsia',

  // Radiology / pathology / public health - indigo
  radiology_st1_2026: 'indigo',
  histopathology_st1_2026: 'indigo',
  public_health_st1_2026: 'indigo',

  // Paediatrics - pink
  paediatrics_st1_2026: 'pink',

  // Eyes / skin
  ophthalmology_st1_2026: 'cyan',
  dermatology_st3_2026: 'pink',
}

export function getSpecialtyColour(key: string | null | undefined): PillColour {
  if (!key) return 'neutral'
  return SPECIALTY_COLOURS[key] ?? 'neutral'
}

// Tailwind class triple for a given pill colour.
// Text uses the 300-level shade so it reads on dark surfaces without shouting.
// Neutral falls back to fg tokens because there is no tailwind "neutral-300".
export function colourClasses(colour: PillColour): { bg: string; border: string; text: string; dot: string } {
  if (colour === 'neutral') {
    return {
      bg: 'bg-pill-neutral',
      border: 'border-pill-neutral',
      text: 'text-fg-1',
      dot: 'bg-fg-2',
    }
  }
  return {
    bg: `bg-pill-${colour}`,
    border: `border-pill-${colour}`,
    text: `text-${colour}-300`,
    dot: `bg-${colour}-400`,
  }
}
