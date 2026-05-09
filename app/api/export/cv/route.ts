import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import React, { type ReactElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import PortfolioPDF from '@/lib/pdf/portfolio-pdf'

const LABELS: Record<string, string> = {
  clinical: 'Clinical CV',
  academic: 'Academic CV',
  st_application: 'ST application CV',
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Match the gating used by the main /api/export route — Free accounts are
  // capped at 1 lifetime PDF export across ALL PDF endpoints, not per-endpoint.
  const sub = await fetchSubscriptionInfo(supabase, user.id)
  if (!sub.limits.canExportPdf) {
    return NextResponse.json(
      { error: 'PDF export limit reached. Upgrade to Pro for unlimited exports.' },
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
  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clerkfolio User'
  const element = React.createElement(PortfolioPDF, {
    entries: entries ?? [],
    userName,
    specialty: label,
    exportedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    templateName: label,
    templateSubtitle: 'Generated CV summary from your Clerkfolio portfolio',
    templateAccent: template === 'academic' ? '#14B8A6' : template === 'st_application' ? '#A855F7' : '#1B6FD9',
  }) as unknown as ReactElement<DocumentProps>

  const buffer = await renderToBuffer(element)

  // Only count the export against the lifetime cap once the PDF was generated
  // successfully — a render error must not consume the user's only free PDF.
  if (!sub.isPro) {
    supabase
      .rpc('increment_pro_feature_usage', { p_user_id: user.id, p_feature: 'pdf_exports_used' })
      .then(() => {})
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="clerkfolio-${template}-cv.pdf"`,
    },
  })
}
