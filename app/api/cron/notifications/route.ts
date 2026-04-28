import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// This route is called daily by Vercel Cron.
// Auth: Bearer token checked against CRON_SECRET env var.
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service-role client so we can read all users' data
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in2Days = new Date(today); in2Days.setDate(today.getDate() + 2)
  const in2Str = in2Days.toISOString().split('T')[0]
  const in7Days = new Date(today); in7Days.setDate(today.getDate() + 7)
  const in7Str = in7Days.toISOString().split('T')[0]

  const toInsert: {
    user_id: string; type: string; title: string; body: string; link: string
  }[] = []

  // 1. Deadlines due within 2 days (not completed)
  const { data: deadlines } = await supabase
    .from('deadlines')
    .select('user_id, title, due_date')
    .eq('completed', false)
    .gte('due_date', todayStr)
    .lte('due_date', in2Str)

  deadlines?.forEach(d => {
    const daysLeft = Math.ceil((new Date(d.due_date).getTime() - today.getTime()) / 86400000)
    toInsert.push({
      user_id: d.user_id,
      type: 'deadline_due',
      title: `Deadline soon: ${d.title}`,
      body: daysLeft <= 0 ? 'Due today' : `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      link: '/deadlines',
    })
  })

  // 2. Share links expiring within 2 days
  const { data: shareLinks } = await supabase
    .from('share_links')
    .select('user_id, specialty_key, expires_at')
    .eq('revoked', false)
    .gte('expires_at', todayStr)
    .lte('expires_at', in2Str + 'T23:59:59Z')

  shareLinks?.forEach(sl => {
    toInsert.push({
      user_id: sl.user_id,
      type: 'share_link_expiring',
      title: `Shared link expiring soon`,
      body: `Your read-only link for ${sl.specialty_key ?? 'your portfolio'} expires within 2 days.`,
      link: '/settings/shared-links',
    })
  })

  // 3. Deduplicate — don't insert if same type+user+link already exists today
  if (toInsert.length > 0) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('user_id, type, link')
      .gte('created_at', todayStr + 'T00:00:00Z')

    const existingSet = new Set(
      (existing ?? []).map(n => `${n.user_id}|${n.type}|${n.link}`)
    )

    const deduplicated = toInsert.filter(
      n => !existingSet.has(`${n.user_id}|${n.type}|${n.link}`)
    )

    if (deduplicated.length > 0) {
      await supabase.from('notifications').insert(deduplicated)
    }

    // 4. Email reminders for Pro users who opted in
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && deduplicated.length > 0) {
      const resend = new Resend(resendKey)

      // Get unique users who need email reminders
      const userIdSet = new Set(deduplicated.map(n => n.user_id))
      const userIds = Array.from(userIdSet)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, email_reminders_enabled, subscription_status')
        .in('id', userIds)
        .eq('email_reminders_enabled', true)

      for (const profile of (profiles ?? [])) {
        // Only Pro users
        if (profile.subscription_status !== 'active') continue

        const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
        if (!user?.email) continue

        const userNotifs = deduplicated.filter(n => n.user_id === profile.id)
        if (userNotifs.length === 0) continue

        const items = userNotifs.map(n => `• ${n.title}: ${n.body}`).join('\n')
        await resend.emails.send({
          from: 'Clinidex <hello@clinidex.co.uk>',
          to: user.email,
          subject: `${userNotifs.length > 1 ? `${userNotifs.length} reminders` : userNotifs[0].title} — Clinidex`,
          text: `Hi ${profile.first_name ?? 'there'},\n\n${items}\n\nView your dashboard: https://clinidex.co.uk/dashboard\n\n—\nClinidex · Manage notification preferences at https://clinidex.co.uk/settings`,
        })
      }
    }
  }

  return NextResponse.json({ ok: true, inserted: toInsert.length })
}
