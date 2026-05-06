import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import { logBackgroundJobError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const cronError = validateCronSecret(req)
  if (cronError) return cronError

  const supabase = createServiceClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name')

  const resendKey = process.env.RESEND_API_KEY
  let emailed = 0
  if (resendKey && profiles?.length) {
    const resend = new Resend(resendKey)
    for (const profile of profiles) {
      const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
      if (!user?.email) continue
      try {
        await resend.emails.send({
          from: 'Clerkfolio <hello@clerkfolio.co.uk>',
          to: user.email,
          subject: 'Your Clerkfolio year in review is ready',
          text: `Hi ${profile.first_name ?? 'there'}, your year-in-review PDF is ready in Clerkfolio under Export > Data backup.`,
          html: `<p>Hi ${profile.first_name ?? 'there'},</p><p>Your year-in-review PDF is ready in Clerkfolio under <strong>Export &gt; Data backup</strong>.</p>`,
        })
        emailed += 1
      } catch (error) {
        logBackgroundJobError('cron.year-in-review.email', error, { userId: profile.id })
      }
    }
  }

  return NextResponse.json({ ok: true, users: profiles?.length ?? 0, emailed })
}
