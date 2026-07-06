// Shared validation for the /api/feedback route. Kept pure so it can be unit
// tested without spinning up the Next.js route handler (matches the pattern
// used by lib/utils/entry-numeric-validation.ts).

export const FEEDBACK_CATEGORIES = [
  'feature_request',
  'specialty_request',
  'bug_report',
  'general',
] as const

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  feature_request: 'Feature request',
  specialty_request: 'Request a specialty',
  bug_report: 'Bug report',
  general: 'General feedback',
}

export const NAME_MAX = 100
export const EMAIL_MAX = 254
export const COMMENT_MAX = 2000
export const SPECIALTY_NAME_MAX = 100

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === 'string' && (FEEDBACK_CATEGORIES as readonly string[]).includes(value)
}

// Minimal email format check (mirrors the pre-existing route-local helper).
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= EMAIL_MAX
}

export type FeedbackInput = {
  name: string
  email: string
  comment: string
  category: FeedbackCategory
  specialty: string
}

export type FeedbackValidationError = { error: string }
export type FeedbackValidationResult =
  | { ok: true; value: FeedbackInput }
  | { ok: false; error: string }

/**
 * Validate + normalise a feedback submission body. Category defaults to
 * 'general' when absent so existing/older clients without the field keep
 * working. `specialty` is only meaningful (and only length-capped/trimmed)
 * when category is 'specialty_request'; it is otherwise ignored.
 */
export function validateFeedbackInput(body: unknown): FeedbackValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Invalid input types' }
  }

  const { name, email, comment, category, specialty } = body as Record<string, unknown>

  if (typeof name !== 'string' || typeof email !== 'string' || typeof comment !== 'string') {
    return { ok: false, error: 'Invalid input types' }
  }

  const resolvedCategory: FeedbackCategory = category === undefined ? 'general' : (category as FeedbackCategory)
  if (!isFeedbackCategory(resolvedCategory)) {
    return { ok: false, error: 'Invalid category' }
  }

  if (specialty !== undefined && typeof specialty !== 'string') {
    return { ok: false, error: 'Invalid input types' }
  }

  const trimmedName = name.trim().slice(0, NAME_MAX)
  const trimmedEmail = email.trim().toLowerCase().slice(0, EMAIL_MAX)
  const trimmedComment = comment.trim().slice(0, COMMENT_MAX)
  const trimmedSpecialty = typeof specialty === 'string' ? specialty.trim().slice(0, SPECIALTY_NAME_MAX) : ''

  if (!trimmedName || !trimmedEmail || !trimmedComment) {
    return { ok: false, error: 'Missing fields' }
  }

  if (!isValidEmail(trimmedEmail)) {
    return { ok: false, error: 'Invalid email address' }
  }

  if (resolvedCategory === 'specialty_request' && !trimmedSpecialty) {
    return { ok: false, error: 'Please tell us which specialty' }
  }

  return {
    ok: true,
    value: {
      name: trimmedName,
      email: trimmedEmail,
      comment: trimmedComment,
      category: resolvedCategory,
      specialty: resolvedCategory === 'specialty_request' ? trimmedSpecialty : '',
    },
  }
}

/** Builds the email subject line so triage can scan categories at a glance. */
export function buildFeedbackSubject(input: FeedbackInput): string {
  const label = FEEDBACK_CATEGORY_LABELS[input.category]
  const suffix = input.category === 'specialty_request' && input.specialty ? `: ${input.specialty}` : ''
  return `[${label}${suffix}] Feedback from ${input.name}`
}
