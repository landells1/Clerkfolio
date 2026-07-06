import type { Theme } from '@/lib/theme'

// Shape of the editable profile state shared between the settings page and
// its section components.
export type ProfileState = {
  first_name: string
  last_name: string
  career_stage: string
  student_graduation_date: string
  referral_code: string
  timezone: string
  public_slug: string
  public_showcase_enabled: boolean
  display_prefs: {
    high_contrast?: boolean
    dyslexic_font?: boolean
    theme?: Theme
    // Timeline "Show NHS national recruitment dates" tick; written from the
    // Timeline page, read by /timeline and the ICS feed (undefined = legacy
    // auto behaviour - see lib/timeline/national-deadlines.ts).
    show_national_deadlines?: boolean
  }
}
