import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { notificationEmailHtml, notificationEmailText } from '@/lib/notifications/email-templates'
import { unsubscribeUrl } from '@/lib/notifications/unsubscribe'
import { validateCronSecret } from '@/lib/cron'
import { processInBatches } from '@/lib/utils/batch'
import * as Sentry from '@sentry/nextjs'
import { logBackgroundJobError } from '@/lib/monitoring'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { formatCompetencyTheme } from '@/lib/types/portfolio-labels'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { sendEmail } from '@/lib/email/send'
import {
  ACTIVITY_NUDGE_INTERVAL_DAYS,
  DEADLINE_REMINDER_DAYS,
  EXPIRY_REMINDER_DAYS,
  SHARE_EXPIRY_REMINDER_DAYS,
  isReminderDay,
  ukDaysUntil,
} from '@/lib/notifications/reminder-schedule'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type NotificationDraft = {
  user_id: string
  type: 'deadline_due' | 'share_link_expiring' | 'activity_nudge' | 'application_window_open' | 'student_verification_expiring' | 'mandatory_training_expiring'
  title: string
  body: string
  link: string
}
type Preferences = {
  deadlines?: boolean
  share_link_expiring?: boolean
  activity_nudge?: boolean
  application_window?: boolean
}

function preferenceAllows(prefs: Preferences, type: NotificationDraft['type']) {
  if (type === 'deadline_due' || type === 'student_verification_expiring' || type === 'mandatory_training_expiring') return prefs.deadlines !== false
  if (type === 'share_link_expiring') return prefs.share_link_expiring !== false
  if (type === 'activity_nudge') return prefs.activity_nudge === true
  if (type === 'application_window_open') return prefs.application_window !== false
  return true
}

export async function GET(req: NextRequest) {
  const cronError = validateCronSecret(req)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-notifications', async () => {
  const supabase = createServiceClient()

  const now = new Date()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in3Days = new Date(today); in3Days.setDate(today.getDate() + 3)
  const in3Str = in3Days.toISOString().split('T')[0]
  const in31Days = new Date(today); in31Days.setDate(today.getDate() + 31)
  const in31Str = in31Days.toISOString().split('T')[0]
  const fourteenDaysAgo = new Date(today); fourteenDaysAgo.setDate(today.getDate() - 14)

  const drafts: NotificationDraft[] = []

  const { data: deadlines, error: deadlinesError } = await fetchAllRows<{ user_id: string; title: string; due_date: string; source_specialty_key: string | null }>((from, to) => supabase
    .from('deadlines')
    .select('user_id, title, due_date, source_specialty_key')
    .eq('completed', false)
    .gte('due_date', todayStr)
    .lte('due_date', in3Str)
    .order('id')
    .range(from, to))
  if (deadlinesError) logBackgroundJobError('cron.notifications.deadlines', deadlinesError)

  deadlines?.forEach(d => {
    const daysLeft = ukDaysUntil(d.due_date, now)
    if (!isReminderDay(daysLeft, DEADLINE_REMINDER_DAYS)) return
    const isApplicationWindow = Boolean(d.source_specialty_key)
    drafts.push({
      user_id: d.user_id,
      type: isApplicationWindow ? 'application_window_open' : 'deadline_due',
      title: isApplicationWindow ? d.title : `Deadline soon: ${d.title}`,
      body: daysLeft <= 0 ? 'Due today' : `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      link: '/timeline',
    })
  })

  // Compare against NOW, not the start of today: a link that expired at 03:00
  // was still warned about as "expires within 3 days" at 09:00.
  const { data: shareLinks, error: shareLinksError } = await supabase
    .from('share_links')
    .select('user_id, specialty_key, theme_slug, scope, expires_at')
    .eq('revoked', false)
    .is('revoked_at', null)
    .gt('expires_at', now.toISOString())
    .lte('expires_at', `${in3Str}T23:59:59Z`)
  if (shareLinksError) logBackgroundJobError('cron.notifications.share_links', shareLinksError)

  shareLinks?.forEach(link => {
    const daysLeft = ukDaysUntil(link.expires_at, now)
    if (!isReminderDay(daysLeft, SHARE_EXPIRY_REMINDER_DAYS)) return
    const label = link.scope === 'theme'
      ? `theme ${link.theme_slug ? formatCompetencyTheme(link.theme_slug) : 'portfolio'}`
      : link.scope === 'full'
        ? 'full portfolio'
        : (link.specialty_key ? formatSpecialtyLabel(link.specialty_key) : 'portfolio')
    drafts.push({
      user_id: link.user_id,
      type: 'share_link_expiring',
      title: 'Shared link expiring soon',
      body: `Your read-only link for ${label} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew it under Import & export > Share links if you still need it.`,
      link: '/export?tab=share',
    })
  })

  // Every institutionally verified account (a .ac.uk student OR an NHS
  // doctor), not tier='student': that label only fits .ac.uk medical-student
  // stages, so NHS-verified doctors silently lost their Verified storage and
  // referral activation at the yearly re-check without a warning.
  const { data: expiringVerifications, error: verificationsError } = await supabase
    .from('profiles')
    .select('id, student_email_verification_due_at')
    .eq('student_email_verified', true)
    .gte('student_email_verification_due_at', todayStr)
    .lte('student_email_verification_due_at', in31Str)
  if (verificationsError) logBackgroundJobError('cron.notifications.verifications', verificationsError)

  expiringVerifications?.forEach(profile => {
    const daysLeft = ukDaysUntil(profile.student_email_verification_due_at, now)
    if (!isReminderDay(daysLeft, EXPIRY_REMINDER_DAYS)) return
    drafts.push({
      user_id: profile.id,
      type: 'student_verification_expiring',
      title: 'Your institutional email verification expires soon',
      body: daysLeft <= 0
        ? 'Re-verify your institutional email today to keep your Verified storage and referral rewards.'
        : `Re-verify your institutional email within ${daysLeft} day${daysLeft !== 1 ? 's' : ''} to keep your Verified storage and referral rewards.`,
      link: '/settings',
    })
  })

  const { data: expiringTraining, error: trainingError } = await fetchAllRows<{ user_id: string; title: string; expires_at: string }>((from, to) => supabase
    .from('personal_log')
    .select('user_id, title, expires_at')
    .eq('kind', 'mandatory_training')
    .is('deleted_at', null)
    .gte('expires_at', todayStr)
    .lte('expires_at', in31Str)
    .order('id')
    .range(from, to))
  if (trainingError) logBackgroundJobError('cron.notifications.training', trainingError)

  expiringTraining?.forEach(item => {
    const daysLeft = ukDaysUntil(item.expires_at, now)
    if (!isReminderDay(daysLeft, EXPIRY_REMINDER_DAYS)) return
    drafts.push({
      user_id: item.user_id,
      type: 'mandatory_training_expiring',
      title: `Training expiring: ${item.title}`,
      body: daysLeft <= 0 ? 'Expires today' : `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      link: '/logs/training',
    })
  })

  // Two filtered profile queries instead of a full-table scan: the prefs of
  // users who already have a draft, plus everyone who opted into the activity
  // nudge (opt-in, so it can't be derived from the drafts).
  type ProfileRow = { id: string; first_name: string | null; notification_preferences: Preferences | null }
  const draftUserIds = Array.from(new Set(drafts.map(draft => draft.user_id)))
  const draftProfiles: ProfileRow[] = []
  for (let offset = 0; offset < draftUserIds.length; offset += 200) {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, notification_preferences')
      .in('id', draftUserIds.slice(offset, offset + 200))
    draftProfiles.push(...((data ?? []) as ProfileRow[]))
  }
  const { data: nudgeProfiles } = await fetchAllRows<ProfileRow>((from, to) => supabase
    .from('profiles')
    .select('id, first_name, notification_preferences')
    .eq('notification_preferences->activity_nudge', true)
    .order('id')
    .range(from, to))

  const profilePrefs = new Map<string, { first_name: string | null; prefs: Preferences }>(
    [...draftProfiles, ...((nudgeProfiles ?? []) as ProfileRow[])].map(profile => [
      profile.id,
      {
        first_name: profile.first_name ?? null,
        prefs: (profile.notification_preferences ?? {}) as Preferences,
      },
    ])
  )

  const activityEnabledIds = ((nudgeProfiles ?? []) as ProfileRow[]).map(profile => profile.id)

  if (activityEnabledIds.length > 0) {
    // Paged: one row per entry, so a plain read stopped at 1000 rows and
    // active users past the cap were told they had logged nothing. Cases and
    // entries both count as activity; onboarding demo rows never do.
    const since = fourteenDaysAgo.toISOString()
    const nudgeSince = new Date(now.getTime() - ACTIVITY_NUDGE_INTERVAL_DAYS * 86_400_000).toISOString()
    const [recentEntries, recentCases, recentNudges] = await Promise.all([
      fetchAllRows<{ user_id: string }>((from, to) => supabase.from('portfolio_entries').select('user_id').in('user_id', activityEnabledIds).gte('created_at', since).is('deleted_at', null).eq('is_demo', false).order('id').range(from, to)),
      fetchAllRows<{ user_id: string }>((from, to) => supabase.from('cases').select('user_id').in('user_id', activityEnabledIds).gte('created_at', since).is('deleted_at', null).eq('is_demo', false).order('id').range(from, to)),
      // A nudge at most once a week (it used to repeat every day).
      fetchAllRows<{ user_id: string }>((from, to) => supabase.from('notifications').select('user_id').in('user_id', activityEnabledIds).eq('type', 'activity_nudge').gte('created_at', nudgeSince).order('id').range(from, to)),
    ])
    if (recentEntries.error || recentCases.error || recentNudges.error) {
      logBackgroundJobError('cron.notifications.activity_lookup', recentEntries.error ?? recentCases.error ?? recentNudges.error)
    } else {
      const skip = new Set([...(recentEntries.data ?? []), ...(recentCases.data ?? []), ...(recentNudges.data ?? [])].map(row => row.user_id))
      activityEnabledIds.filter(id => !skip.has(id)).forEach(userId => {
        drafts.push({
          user_id: userId,
          type: 'activity_nudge',
          title: 'No recent portfolio entries',
          body: 'Capture one recent case, reflection, teaching session, or achievement while it is still fresh.',
          link: '/portfolio/new',
        })
      })
    }
  }

  const filtered = drafts.filter(draft => preferenceAllows(profilePrefs.get(draft.user_id)?.prefs ?? {}, draft.type))

  let inserted: NotificationDraft[] = []
  if (filtered.length > 0) {
    // Same-day de-duplication keeps a re-run of this cron idempotent; the
    // milestone days above stop an item repeating on later days.
    const { data: existing, error: existingError } = await fetchAllRows<{ user_id: string; type: string; link: string; title: string }>((from, to) => supabase
      .from('notifications')
      .select('user_id, type, link, title')
      .gte('created_at', `${todayStr}T00:00:00Z`)
      .order('id')
      .range(from, to))
    if (existingError) {
      logBackgroundJobError('cron.notifications.dedupe_lookup', existingError)
      return NextResponse.json({ error: 'Could not check for duplicate notifications.' }, { status: 500 })
    }

    // Include title in the dedupe key - two distinct deadlines often share the
    // same `link: /timeline` target, so keying on (user_id, type, link) alone
    // collapses them into one and the second deadline silently never sends.
    const dedupeKey = (n: { user_id: string; type: string; link: string; title: string }) =>
      `${n.user_id}|${n.type}|${n.link}|${n.title}`
    const existingSet = new Set((existing ?? []).map(dedupeKey))
    inserted = filtered.filter(n => !existingSet.has(dedupeKey(n)))

    if (inserted.length > 0) {
      const { error: insertError } = await supabase.from('notifications').insert(inserted)
      if (insertError) logBackgroundJobError('cron.notifications.insert', insertError, { count: inserted.length })
    }
  }

  const resendKey = process.env.RESEND_API_KEY
  let emailed = 0
  if (resendKey && inserted.length > 0) {
    const resend = new Resend(resendKey)
    const userIds = Array.from(new Set(inserted.map(n => n.user_id)))

    await processInBatches(userIds, 2, async userId => {
      const profile = profilePrefs.get(userId)
      const userItems = inserted.filter(n => n.user_id === userId && preferenceAllows(profile?.prefs ?? {}, n.type))
      if (userItems.length === 0) return

      const { data: { user } } = await supabase.auth.admin.getUserById(userId)
      if (!user?.email) return
      // Never email an account that has not confirmed its address yet.
      if (!user.email_confirmed_at) return

      const unsub = unsubscribeUrl(userId, 'reminders')
      const result = await sendEmail(resend, {
        from: 'Clerkfolio <hello@clerkfolio.co.uk>',
        to: user.email,
        subject: userItems.length > 1 ? `${userItems.length} Clerkfolio reminders` : userItems[0].title,
        text: notificationEmailText(profile?.first_name ?? null, userItems, unsub ?? undefined),
        html: notificationEmailHtml(profile?.first_name ?? null, userItems, unsub ?? undefined),
        ...(unsub
          ? { headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }
          : {}),
      })
      if (result.ok) emailed++
      else logBackgroundJobError('cron.notifications.email', new Error(result.error), { userId, count: userItems.length, code: result.code })
    })
  }

  return NextResponse.json({ ok: true, generated: drafts.length, inserted: inserted.length, emailed })
  }, {
    schedule: { type: 'crontab', value: '0 9 * * *' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 30,
    failureIssueThreshold: 1,
  })
}
