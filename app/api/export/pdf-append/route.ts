import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { loadPortfolioPdfRuntime } from '@/lib/pdf/load-runtime'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'

const EXPORT_RATE_MAX = 20
const EXPORT_RATE_WINDOW_SECONDS = 60 * 60

// 25 MB upload cap on the user-supplied PDF. pdf-lib parses untrusted input so
// an unbounded file is a parser-DoS vector even before the merge runs.
const MAX_INPUT_BYTES = 25 * 1024 * 1024

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      { error: 'PDF export limit reached. Upgrade to Pro for unlimited exports.' },
      { status: 403 }
    )
  }

  const form = await req.formData()
  const file = form.get('pdf')
  let entryIds: string[]
  try {
    const parsed = JSON.parse(String(form.get('entryIds') ?? '[]'))
    entryIds = Array.isArray(parsed) ? parsed : []
  } catch {
    return NextResponse.json({ error: 'Invalid entryIds format.' }, { status: 400 })
  }

  if (!(file instanceof File) || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Upload an existing PDF.' }, { status: 400 })
  }
  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: 'PDF is too large (25 MB max).' }, { status: 413 })
  }
  if (!entryIds.length || entryIds.length > 500) {
    return NextResponse.json({ error: 'Choose between 1 and 500 entries to append.' }, { status: 400 })
  }

  const [{ data: profile }, { data: entries, error }] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single(),
    supabase
      .from('portfolio_entries')
      .select('*')
      .in('id', entryIds)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('date', { ascending: false }),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!entries?.length) return NextResponse.json({ error: 'No entries found.' }, { status: 404 })

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clerkfolio User'
  const exportedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const { renderPortfolioPdf } = loadPortfolioPdfRuntime()
  const appendedBuffer = await renderPortfolioPdf({
    entries,
    userName,
    specialty: 'Append-only export',
    exportedAt,
  })
  const existing = await PDFDocument.load(await file.arrayBuffer())
  const appended = await PDFDocument.load(appendedBuffer)
  const copiedPages = await existing.copyPages(appended, appended.getPageIndices())
  copiedPages.forEach(page => existing.addPage(page))

  const merged = await existing.save()
  const body = new ArrayBuffer(merged.byteLength)
  new Uint8Array(body).set(merged)

  // Atomically claim the free PDF slot after a successful render.
  if (!sub.isPro) {
    const { data: claimed } = await supabase.rpc('claim_free_pdf_export', { p_user_id: user.id })
    if (!claimed) {
      return NextResponse.json({ error: 'limit_reached', limit: 1, upgrade_url: '/upgrade' }, { status: 403 })
    }
  }

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="clerkfolio-appended-${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  })
}
