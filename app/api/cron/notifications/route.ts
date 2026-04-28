import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { notificationEmailHtml, notificationEmailText } from '@/lib/notifications/email-templates'

export const maxDuration = 30

type NotificationDraft = {
  user_id: string
  type: 'deadline_due' | 'share_link_expiring' | 'activity_nudge' | 'application_window'
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

function daysUntil(date: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function preferenceAllows(prefs: Preferences, type: NotificationDraft['type']) {
  if (type === 'deadline_due') return prefs.deadlines !== false
  if (type === 'share_link_expiring') return prefs.share_link_expiring !== false
  if (type === 'activity_nudge') return prefs.activity_nudge === true
  if (type === 'application_window') return prefs.application_window !== false
  return true
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in3Days = new Date(today); in3Days.setDate(today.getDate() + 3)
  const in3Str = in3Days.toISOString().split('T')[0]
  const fourteenDaysAgo = new Date(today); fourteenDaysAgo.setDate(today.getDate() - 14)

  const drafts: NotificationDraft[] = []

  const { data: deadlines } = await supabase
    .from('deadlines')
    .select('user_id, title, due_date, source_specialty_key')
    .eq('completed', false)
    .gte('due_date', todayStr)
    .lte('due_date', in3Str)

  deadlines?.forEach(d => {
    const daysLeft = daysUntil(d.due_date)
    const isApplicationWindow = Boolean(d.source_specialty_key)
    drafts.push({
      user_id: d.user_id,
      type: isApplicationWindow ? 'application_window' : 'deadline_due',
      title: isApplicationWindow ? d.title : `Deadline soon: ${d.title}`,
      body: daysLeft <= 0 ? 'Due today' : `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      link: '/timeline',
    })
  })

  const { data: shareLinks } = await supabase
    .from('share_links')
    .select('user_id, specialty_key, theme_slug, scope, expires_at')
    .is('revoked_at', null)
    .gte('expires_at', todayStr)
    .lte('expires_at', `${in3Str}T23:59:59Z`)

  shareLinks?.forEach(link => {
    const label = link.scope === 'theme'
      ? `theme ${link.theme_slug ?? 'portfolio'}`
      : link.scope === 'full'
        ? 'full portfolio'
        : link.specialty_key ?? 'portfolio'
    drafts.push({
      user_id: link.user_id,
      type: 'share_link_expiring',
      title: 'Shared link expiring soon',
      body: `Your read-only link for ${label} expires within 3 days.`,
      link: '/export',
    })
  })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, notification_preferences')

  const profilePrefs = new Map<string, { first_name: string | null; prefs: Preferences }>(
    (profiles ?? []).map(profile => [
      profile.id,
      {
        first_name: profile.first_name ?? null,
        prefs: (profile.notification_preferences ?? {}) as Preferences,
      },
    ])
  )

  const activityEnabledIds = (profiles ?? [])
    .filter(profile => ((profile.notification_preferences ?? {}) as Preferences).activity_nudge === true)
    .map(profile => profile.id)

  if (activityEnabledIds.length > 0) {
    const { data: recentEntries } = await supabase
      .from('portfolio_entries')
      .select('user_id')
      .in('user_id', activityEnabledIds)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .is('deleted_at', null)

    const activeUsers = new Set((recentEntries ?? []).map(row => row.user_id))
    activityEnabledIds.filter(id => !activeUsers.has(id)).forEach(userId => {
      drafts.push({
        user_id: userId,
        type: 'activity_nudge',
        title: 'No recent portfolio entries',
        body: 'Capture one recent case, reflection, teaching session, or achievement while it is still fresh.',
        link: '/portfolio/new',
      })
    })
  }

  const filtered = drafts.filter(draft => preferenceAllows(profilePrefs.get(draft.user_id)?.prefs ?? {}, draft.type))

  let inserted: NotificationDraft[] = []
  if (filtered.length > 0) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('user_id, type, link')
      .gte('created_at', `${todayStr}T00:00:00Z`)

    const existingSet = new Set((existing ?? []).map(n => `${n.user_id}|${n.type}|${n.link}`))
    inserted = filtered.filter(n => !existingSet.has(`${n.user_id}|${n.type}|${n.link}`))

    if (inserted.length > 0) {
      await supabase.from('notifications').insert(inserted)
    }
  }

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && inserted.length > 0) {
    const resend = new Resend(resendKey)
    const userIds = Array.from(new Set(inserted.map(n => n.user_id)))

    for (const userId of userIds) {
      const profile = profilePrefs.get(userId)
      const userItems = inserted.filter(n => n.user_id === userId && preferenceAllows(profile?.prefs ?? {}, n.type))
      if (userItems.length === 0) continue

      const { data: { user } } = await supabase.auth.admin.getUserById(userId)
      if (!user?.email) continue

      await resend.emails.send({
        from: 'Clinidex <hello@clinidex.co.uk>',
        to: user.email,
        subject: userItems.length > 1 ? `${userItems.length} Clinidex reminders` : userItems[0].title,
        text: notificationEmailText(profile?.first_name ?? null, userItems),
        html: notificationEmailHtml(profile?.first_name ?? null, userItems),
      })
    }
  }

  return NextResponse.json({ ok: true, generated: drafts.length, inserted: inserted.length })
}
