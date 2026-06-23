import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { safeJsonBody, badJson } from '@/lib/safe-json'
import { CAREER_STAGE_SET, MEDICAL_STUDENT_STAGE_SET } from '@/lib/constants/career-stages'

const VALID_TIMEZONES = new Set([
  'Europe/London', 'UTC', 'Europe/Dublin', 'Europe/Paris',
])

function normalisePublicSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}

// Server-side profile update route.
// Handles the profile fields exposed by /settings; validates onboarding-level
// invariants (graduation date required for student career stages) and
// recomputes the user's tier after every save so that a career-stage change
// is immediately reflected in entitlements without needing a separate call.
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await safeJsonBody<Record<string, unknown>>(req)
  if (!body) return badJson()

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : undefined
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : undefined
  const careerStage = typeof body.careerStage === 'string' ? body.careerStage : undefined
  const studentGraduationDate =
    typeof body.studentGraduationDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.studentGraduationDate)
      ? body.studentGraduationDate
      : (body.studentGraduationDate === null || body.studentGraduationDate === '' ? null : undefined)
  const timezone = typeof body.timezone === 'string' ? body.timezone : undefined
  const rawPublicSlug = typeof body.publicSlug === 'string' ? body.publicSlug : undefined
  const publicSlug = rawPublicSlug === undefined ? undefined : normalisePublicSlug(rawPublicSlug)
  const publicShowcaseEnabled = typeof body.publicShowcaseEnabled === 'boolean' ? body.publicShowcaseEnabled : undefined
  const displayPrefs = body.displayPrefs && typeof body.displayPrefs === 'object' && !Array.isArray(body.displayPrefs)
    ? body.displayPrefs as Record<string, unknown>
    : undefined

  // Validate career stage if provided
  if (careerStage !== undefined && !CAREER_STAGE_SET.has(careerStage)) {
    return NextResponse.json({ error: 'Invalid career stage.' }, { status: 400 })
  }

  // Enforce graduation date invariant: medical students must have it set
  if (careerStage !== undefined && MEDICAL_STUDENT_STAGE_SET.has(careerStage) && studentGraduationDate === null) {
    return NextResponse.json(
      { error: 'Expected graduation date is required for medical student accounts.' },
      { status: 400 }
    )
  }

  if (timezone !== undefined && !VALID_TIMEZONES.has(timezone)) {
    return NextResponse.json({ error: 'Invalid timezone.' }, { status: 400 })
  }

  if (rawPublicSlug !== undefined && rawPublicSlug.trim() && !publicSlug) {
    return NextResponse.json({ error: 'Public showcase URL can only contain letters, numbers, and dashes.' }, { status: 400 })
  }

  let effectivePublicSlug = publicSlug
  if (publicShowcaseEnabled === true && effectivePublicSlug === undefined) {
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('public_slug')
      .eq('id', user.id)
      .maybeSingle<{ public_slug: string | null }>()
    effectivePublicSlug = currentProfile?.public_slug ? normalisePublicSlug(currentProfile.public_slug) : ''
  }
  if (publicShowcaseEnabled === true && !effectivePublicSlug) {
    return NextResponse.json({ error: 'Choose a valid public showcase URL before enabling showcase.' }, { status: 400 })
  }

  // Build update payload from only the fields that were provided
  const payload: Record<string, unknown> = {}
  if (firstName !== undefined) payload.first_name = firstName
  if (lastName !== undefined) payload.last_name = lastName
  if (careerStage !== undefined) payload.career_stage = careerStage
  if (studentGraduationDate !== undefined) payload.student_graduation_date = studentGraduationDate
  if (timezone !== undefined) payload.timezone = timezone
  if (publicSlug !== undefined) payload.public_slug = publicSlug || null
  if (publicShowcaseEnabled !== undefined) payload.public_showcase_enabled = publicShowcaseEnabled
  if (displayPrefs !== undefined) payload.display_prefs = displayPrefs

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  // Update via the user-bound client so guard_profile_writes trigger fires and
  // reverts any attempt to mutate server-owned fields.
  const { error: updateError } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Recompute tier centrally after every save. A career-stage change can
  // promote (verified NHS → foundation) or demote (FY1 → student where
  // graduation date is still in future) the user's tier. Without this call the
  // tier drifts until the next scheduled recompute or login.
  const service = createServiceClient()
  const { error: recomputeError } = await service.rpc('recompute_profile_tier', { p_user_id: user.id })
  if (recomputeError) {
    console.error('settings/profile: recompute_profile_tier failed:', recomputeError.message)
  }

  // Read back the tier the recompute may have changed so the client can refresh.
  const { data: refreshed } = await service
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ ok: true, profile: refreshed ?? null })
}
