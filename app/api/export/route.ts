import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import PortfolioPDF from '@/lib/pdf/portfolio-pdf'
import { getSubscriptionInfo } from '@/lib/subscription'
import { validateOrigin } from '@/lib/csrf'
import React, { type ReactElement } from 'react'

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // ── Server-side subscription gate ─────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, trial_started_at, subscription_status, subscription_period_end')
    .eq('id', user.id)
    .single()

  const subInfo = getSubscriptionInfo(profile ?? { trial_started_at: null, subscription_status: null, subscription_period_end: null })
  if (!subInfo.canExport) {
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

  const safeSpecialty = (specialty || 'portfolio').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const dateStr = new Date().toISOString().split('T')[0]

  // ── JSON export ──────────────────────────────────────────────────────────────
  if (format === 'json') {
    const filename = `clinidex-${safeSpecialty}-${dateStr}.json`
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
    const filename = `clinidex-${safeSpecialty}-${dateStr}.csv`
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
  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clinidex User'
  const exportedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  try {
    const element = React.createElement(PortfolioPDF, {
      entries,
      userName,
      specialty: specialty || 'Portfolio',
      exportedAt,
    }) as unknown as ReactElement<DocumentProps>

    const buffer = await renderToBuffer(element)
    const filename = `clinidex-${safeSpecialty}-${dateStr}.pdf`

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

function toCsv(entries: any[]): string {
  const FIELDS = ['title', 'category', 'date', 'specialty_tags', 'notes', 'created_at'] as const
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const header = FIELDS.join(',')
  const rows = entries.map(e => [
    escape(e.title ?? ''),
    escape(e.category ?? ''),
    escape(e.date ?? ''),
    escape((e.specialty_tags ?? []).join(';')),
    escape(e.notes ?? ''),
    escape(e.created_at ?? ''),
  ].join(','))
  return [header, ...rows].join('\n')
}
