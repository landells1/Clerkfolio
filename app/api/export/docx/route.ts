import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { buildCvDocData, renderCvDocx } from '@/lib/export/cv-docx'
import type { PortfolioEntry } from '@/lib/types/portfolio'
import { validateOrigin } from '@/lib/csrf'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'

// Same allowance/rate-limit budget as /api/export/cv - this is the same CV
// content in a different (.docx) container, not a separate feature, so it
// must not become a free bypass of the paid PDF export.
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

// POST (not GET), same reasoning as /api/export/cv: cross-site <img src>/<a
// href> embeds must not be able to silently trigger a render and consume the
// user's free-tier claim_free_pdf_export slot. validateOrigin enforces this.
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

  // Same gate as /api/export/cv - the DOCX is the same CV content as the PDF
  // in a different container, so it draws on the same shared free-tier PDF
  // allowance (claim_free_pdf_export) across ALL PDF/DOCX CV-family endpoints,
  // not a separate free quota.
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
    const docData = buildCvDocData({
      // select('*') rows aren't statically typed as PortfolioEntry; the CV
      // PDF route makes the same assumption when passing entries into its
      // renderer.
      entries: orderedEntries as unknown as PortfolioEntry[],
      userName,
      specialty: label,
      exportedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      templateName: label,
      templateSubtitle: 'Generated CV summary from your Clerkfolio portfolio',
    })
    const buffer = await renderCvDocx(docData)

    // Atomically claim the free PDF slot after a successful render - same
    // shared allowance as every other PDF/DOCX CV-family export.
    if (!sub.isPro) {
      const { data: claimed } = await supabase.rpc('claim_free_pdf_export', { p_user_id: user.id })
      if (!claimed) {
        return NextResponse.json({ error: 'limit_reached', limit: 1, upgrade_url: '/upgrade' }, { status: 403 })
      }
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="clerkfolio-${template}-cv.docx"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : 'non-error throw'
    console.error('DOCX generation error:', message)
    Sentry.captureException(err, { tags: { route: '/api/export/docx', userId: user.id } })
    return NextResponse.json({ error: 'Failed to generate DOCX. Please try again.' }, { status: 500 })
  }
}
