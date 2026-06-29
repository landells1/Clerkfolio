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

// Free-text clinical domains used on cases (e.g. "General Surgery", "Cardiology",
// "Paediatrics"). Lower-cased substring match so variations like "Gen Surg" or
// "Acute Medicine" still resolve. Used as a fallback dot colour when a case has
// no specialty_tags - prevents the visual noise of every untagged case being grey.
const CLINICAL_DOMAIN_COLOURS: { match: string; colour: PillColour }[] = [
  { match: 'surgery', colour: 'rose' },
  { match: 'surg', colour: 'rose' },
  { match: 'cardio', colour: 'red' },
  { match: 'paedi', colour: 'pink' },
  { match: 'paed', colour: 'pink' },
  { match: 'emergency', colour: 'amber' },
  { match: 'a&e', colour: 'amber' },
  { match: 'ed', colour: 'amber' },
  { match: 'gp', colour: 'green' },
  { match: 'general practice', colour: 'green' },
  { match: 'anaes', colour: 'teal' },
  { match: 'psych', colour: 'violet' },
  { match: 'mental health', colour: 'violet' },
  { match: 'obs', colour: 'fuchsia' },
  { match: 'gynae', colour: 'fuchsia' },
  { match: 'o&g', colour: 'fuchsia' },
  { match: 'radiol', colour: 'indigo' },
  { match: 'imaging', colour: 'indigo' },
  { match: 'patho', colour: 'indigo' },
  { match: 'public health', colour: 'indigo' },
  { match: 'derm', colour: 'pink' },
  { match: 'ophthal', colour: 'cyan' },
  { match: 'eye', colour: 'cyan' },
  { match: 'medicine', colour: 'blue' },
  { match: 'medical', colour: 'blue' },
  { match: 'acute', colour: 'blue' },
  { match: 'imt', colour: 'blue' },
]

export function getClinicalDomainColour(domain: string | null | undefined): PillColour {
  if (!domain) return 'neutral'
  const lower = domain.toLowerCase()
  for (const entry of CLINICAL_DOMAIN_COLOURS) {
    if (lower.includes(entry.match)) return entry.colour
  }
  return 'neutral'
}

// Best-available colour for a case row: prefer the first specialty_tag (which is
// a known slug), fall back to fuzzy match on the clinical domain string.
export function getCaseRowColour(specialtyTags: string[] | null | undefined, clinicalDomain: string | null | undefined): PillColour {
  const first = specialtyTags?.[0]
  if (first) {
    const c = getSpecialtyColour(first)
    if (c !== 'neutral') return c
  }
  return getClinicalDomainColour(clinicalDomain)
}

// Tailwind class quad for a given pill colour, routed through the themed
// category CSS variables (defined in app/globals.css). Each --cat-*-{soft,
// border,text,dot} flips between the cream and dark palettes, so chips read
// correctly on both backgrounds (deepened on cream, bright on dark).
export function colourClasses(colour: PillColour): { bg: string; border: string; text: string; dot: string } {
  return {
    bg: `bg-[var(--cat-${colour}-soft)]`,
    border: `border-[var(--cat-${colour}-border)]`,
    text: `text-[var(--cat-${colour}-text)]`,
    dot: `bg-[var(--cat-${colour}-dot)]`,
  }
}
