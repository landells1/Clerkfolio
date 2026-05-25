import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { loadPortfolioPdfRuntime } from '@/lib/pdf/load-runtime'
import { validateOrigin } from '@/lib/csrf'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'

const EXPORT_RATE_MAX = 20
const EXPORT_RATE_WINDOW_SECONDS = 60 * 60

const LABELS: Record<string, string> = {
  clinical: 'Clinical CV',
  academic: 'Academic CV',
  st_application: 'ST application CV',
}

const CATEGORY_ORDER: Record<string, string[]> = {
  clinical: ['procedure', 'audit_qip', 'teaching', 'reflection', 'leadership', 'conference', 'publication', 'prize', 'custom'],
  academic: ['publication', 'audit_qip', 'conference', 'teaching', 'prize', 'leadership', 'custom', 'procedure', 'reflection'],
  st_application: ['audit_qip', 'leadership', 'teaching', 'publication', 'procedure', 'conference', 'prize', 'reflection', 'custom'],
}

function orderEntriesForTemplate(entries: Record<string, unknown>[], template: string) {
  const order = CATEGORY_ORDER[template] ?? CATEGORY_ORDER.clinical
  const seen = new Set<string>()
  return entries
    .filter(entry => {
      const key = `${entry.category}|${entry.date}|${String(entry.title ?? '').trim().toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => {
      const categoryA = order.indexOf(String(a.category))
      const categoryB = order.indexOf(String(b.category))
      const rankA = categoryA === -1 ? order.length : categoryA
      const rankB = categoryB === -1 ? order.length : categoryB
      if (rankA !== rankB) return rankA - rankB
      return new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime()
    })
}

// POST (not GET) so cross-site <img src> / <a href> embeds cannot silently
// trigger PDF generation and consume the user's free-tier claim_free_pdf_export
// slot. validateOrigin requires Origin or an allowed Referer on POST, so
// CSRF-style cross-site form submits are rejected.
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
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

  // Match the gating used by the main /api/export route - Free accounts are
  // capped at 1 lifetime PDF export across ALL PDF endpoints, not per-endpoint.
  const sub = await fetchSubscriptionInfo(supabase, user.id)
  if (!sub.limits.canExportPdf) {
    return NextResponse.json(
      { error: 'limit_reached', limit: 1, upgrade_url: '/upgrade' },
      { status: 403 }
    )
  }

  const template = req.nextUrl.searchParams.get('template') ?? 'clinical'
  const [{ data: profile }, { data: entries }] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single(),
    supabase
      .from('portfolio_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(120),
  ])

  const label = LABELS[template] ?? LABELS.clinical
  const orderedEntries = orderEntriesForTemplate((entries ?? []) as Record<string, unknown>[], template)
  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clerkfolio User'
  try {
    const { renderPortfolioPdf } = loadPortfolioPdfRuntime()
    const buffer = await renderPortfolioPdf({
      entries: orderedEntries,
      userName,
      specialty: label,
      exportedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      templateName: label,
      templateSubtitle: 'Generated CV summary from your Clerkfolio portfolio',
      templateAccent: template === 'academic' ? '#14B8A6' : template === 'st_application' ? '#A855F7' : '#1B6FD9',
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
        'Content-Disposition': `attachment; filename="clerkfolio-${template}-cv.pdf"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : 'non-error throw'
    console.error('PDF generation error:', message)
    Sentry.captureException(err, { tags: { route: '/api/export/cv', userId: user.id } })
    return NextResponse.json({ error: 'Failed to generate PDF. Please try again.' }, { status: 500 })
  }
}
