import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import { buildDigestSummary, type DigestEntry } from '@/lib/engagement/digest'
import { previousLondonMonthWindow } from '@/lib/engagement/streaks'
import { monthlyDigestEmail } from '@/lib/notifications/email-templates'
import { logBackgroundJobError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Preferences = {
  monthly_digest?: boolean
}

type ProfileRow = {
  id: string
  first_name: string | null
  notification_preferences: Preferences | null
  streak_cache: { active_weeks?: string[] } | null
}

export async function GET(req: NextRequest) {
  const cronError = validateCronSecret(req)
  if (cronError) return cronError

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ ok: true, sent: 0, skipped: 'missing_resend_key' })

  const supabase = createServiceClient()
  const resend = new Resend(resendKey)
  const { start, end, label } = previousLondonMonthWindow()

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, notification_preferences, streak_cache')

  if (profileError) {
    logBackgroundJobError('cron.monthly-digest.profiles', profileError)
    return NextResponse.json({ ok: false, error: 'profile_fetch_failed' }, { status: 500 })
  }

  let sent = 0
  for (const profile of (profiles ?? []) as ProfileRow[]) {
    if (profile.notification_preferences?.monthly_digest === false) continue

    const entries = await fetchDigestEntries(supabase, profile.id, start, end)
    const activeWeeks = profile.streak_cache?.active_weeks ?? []
    const summary = buildDigestSummary(entries, activeWeeks)
    const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
    if (!user?.email) continue

    const email = monthlyDigestEmail(profile.first_name, label, summary)
    try {
      await resend.emails.send({
        from: 'Clerkfolio <hello@clerkfolio.co.uk>',
        to: user.email,
        subject: `${label} in Clerkfolio`,
        text: email.text,
        html: email.html,
      })
      sent++
    } catch (error) {
      logBackgroundJobError('cron.monthly-digest.email', error, { userId: profile.id })
    }
  }

  return NextResponse.json({ ok: true, sent, month: label })
}

async function fetchDigestEntries(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  start: Date,
  end: Date
) {
  const [{ data: portfolioRows }, { data: caseRows }] = await Promise.all([
    supabase
      .from('portfolio_entries')
      .select('specialty_tags, completeness_score')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString()),
    supabase
      .from('cases')
      .select('specialty_tags, completeness_score')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString()),
  ])

  return [
    ...((portfolioRows ?? []) as DigestEntry[]),
    ...((caseRows ?? []) as DigestEntry[]),
  ]
}
