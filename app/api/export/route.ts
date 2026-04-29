import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import PortfolioPDF from '@/lib/pdf/portfolio-pdf'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { validateOrigin } from '@/lib/csrf'
import { getSpecialtyConfig } from '@/lib/specialties'
import React, { type ReactElement } from 'react'

function formatTag(tag: string): string {
  const config = getSpecialtyConfig(tag)
  return config ? config.name : tag
}

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // ── Server-side subscription gate ─────────────────────────────────────────
  const [{ data: profile }, subInfo] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single(),
    fetchSubscriptionInfo(supabase, user.id),
  ])

  if (!subInfo.limits.canExportPdf) {
    return NextResponse.json({ error: 'subscription_required' }, { status: 403 })
  }

  const body = await request.json()
  const { entryIds, specialty, format } = body as { entryIds: string[]; specialty: string; format?: 'pdf' | 'csv' | 'json' }

  if (!entryIds?.length) {
    return NextResponse.json({ error: 'No entries selected' }, { status: 400 })
  }

  // Fetch selected entries (RLS ensures they belong to this user)
  const { data: entries, error } = await supabase
    .from('portfolio_entries')
    .select('*')
    .in('id', entryIds)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  if (error || !entries?.length) {
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
  }

  const specialtyDisplay = formatTag(specialty || 'Portfolio')
  const safeSpecialty = (specialty || 'portfolio').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const dateStr = new Date().toISOString().split('T')[0]

  // ── JSON export ──────────────────────────────────────────────────────────────
  if (format === 'json') {
    const filename = `clerkfolio-${safeSpecialty}-${dateStr}.json`
    return new NextResponse(JSON.stringify(entries), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // ── CSV export ───────────────────────────────────────────────────────────────
  if (format === 'csv') {
    const filename = `clerkfolio-${safeSpecialty}-${dateStr}.csv`
    const csv = toCsv(entries)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // ── PDF export (default) ─────────────────────────────────────────────────────
  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clerkfolio User'
  const exportedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  try {
    const element = React.createElement(PortfolioPDF, {
      entries,
      userName,
      specialty: specialtyDisplay,
      exportedAt,
    }) as unknown as ReactElement<DocumentProps>

    const buffer = await renderToBuffer(element)
    const filename = `clerkfolio-${safeSpecialty}-${dateStr}.pdf`

    // Increment lifetime PDF export counter for free-tier usage tracking (fire-and-forget)
    if (!subInfo.isPro) {
      supabase.from('profiles').update({
        pro_features_used: {
          pdf_exports_used: subInfo.usage.pdfExportsUsed + 1,
          share_links_used: subInfo.usage.shareLinksUsed,
          referral_pro_until: subInfo.usage.referralProUntil,
        },
      }).eq('id', user.id).then(() => {})
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Failed to generate PDF. Please try again.' }, { status: 500 })
  }
}

type CsvEntry = { title?: string; category?: string; date?: string; specialty_tags?: string[]; notes?: string; created_at?: string }

function toCsv(entries: CsvEntry[]): string {
  const FIELDS = ['title', 'category', 'date', 'specialty_tags', 'notes', 'created_at'] as const
  // Prefix leading formula characters so Excel/Sheets cannot execute them.
  const FORMULA_CHARS = /^[=+\-@\t\r]/
  const escape = (v: string) => {
    const safe = FORMULA_CHARS.test(v) ? `'${v}` : v
    return `"${safe.replace(/"/g, '""')}"`
  }
  const header = FIELDS.join(',')
  const rows = entries.map(e => [
    escape(e.title ?? ''),
    escape(e.category ?? ''),
    escape(e.date ?? ''),
    escape((e.specialty_tags ?? []).map(formatTag).join(';')),
    escape(e.notes ?? ''),
    escape(e.created_at ?? ''),
  ].join(','))
  return [header, ...rows].join('\n')
}
