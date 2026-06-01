import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { loadPortfolioPdfRuntime } from '@/lib/pdf/load-runtime'
import { validateOrigin } from '@/lib/csrf'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'

const EXPORT_RATE_MAX = 20
const EXPORT_RATE_WINDOW_SECONDS = 60 * 60

// POST (not GET) so cross-site <img src> / <a href> embeds cannot silently
// trigger PDF generation and consume the user's free-tier claim_free_pdf_export
// slot. validateOrigin requires Origin or an allowed Referer on POST.
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rateLimit = await checkRateLimit({
    key: user.id,
    max: EXPORT_RATE_MAX,
    windowSeconds: EXPORT_RATE_WINDOW_SECONDS,
    prefix: 'export',
  })
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: rateLimit.unavailable ? 'Export is temporarily unavailable.' : 'Too many exports. Please wait before generating another.' },
      { status: rateLimit.unavailable ? 503 : 429, headers: rateLimitHeaders(rateLimit, EXPORT_RATE_WINDOW_SECONDS) },
    )
  }

  const sub = await fetchSubscriptionInfo(supabase, user.id)
  if (!sub.limits.canExportPdf) {
    return NextResponse.json(
      { error: 'limit_reached', limit: 1, upgrade_url: '/upgrade' },
      { status: 403 }
    )
  }

  const year = new Date().getFullYear()
  const [{ data: profile }, { data: entries }] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single(),
    supabase
      .from('portfolio_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date', { ascending: false }),
  ])

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clerkfolio User'
  try {
    const { renderPortfolioPdf } = loadPortfolioPdfRuntime()
    const buffer = await renderPortfolioPdf({
      entries: entries ?? [],
      userName,
      specialty: `${year} year in review`,
      exportedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      templateName: `${year} year in review`,
      templateSubtitle: 'Your Clerkfolio portfolio entries from this calendar year',
      templateAccent: '#F59E0B',
    })

    // Atomically claim the free PDF slot after a successful render.
    if (!sub.isPro) {
      const { data: claimed } = await supabase.rpc('claim_free_pdf_export', { p_user_id: user.id })
      if (!claimed) {
        return NextResponse.json({ error: 'limit_reached', limit: 1, upgrade_url: '/upgrade' }, { status: 403 })
      }
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="clerkfolio-year-in-review-${year}.pdf"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : 'non-error throw'
    console.error('PDF generation error:', message)
    Sentry.captureException(err, { tags: { route: '/api/export/year-review', userId: user.id } })
    return NextResponse.json({ error: 'Failed to generate PDF. Please try again.' }, { status: 500 })
  }
}
