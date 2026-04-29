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

function formatTags(tags: string[] | null | undefined) {
  return (tags ?? []).map(formatTag)
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
  const { entryIds, caseIds, specialty, format } = body as { entryIds: string[]; caseIds?: string[]; specialty: string; format?: 'pdf' | 'csv' | 'json' }

  if ((entryIds?.length ?? 0) > 500 || (caseIds?.length ?? 0) > 500) {
    return NextResponse.json({ error: 'Maximum 500 items per export. Use filters to narrow your selection.' }, { status: 400 })
  }

  if (!entryIds?.length && !caseIds?.length) {
    return NextResponse.json({ error: 'No entries or cases selected' }, { status: 400 })
  }

  const [{ data: entries, error }, { data: cases, error: casesError }] = await Promise.all([
    entryIds?.length
      ? supabase
          .from('portfolio_entries')
          .select('*')
          .in('id', entryIds)
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('date', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    caseIds?.length
      ? supabase
          .from('cases')
          .select('*')
          .in('id', caseIds)
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('date', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (error || casesError) {
    return NextResponse.json({ error: 'Failed to fetch export data' }, { status: 500 })
  }

  const specialtyDisplay = formatTag(specialty || 'Portfolio')
  const safeSpecialty = ((specialty || 'portfolio')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()) || 'portfolio'
  const dateStr = new Date().toISOString().split('T')[0]

  // ── JSON export ──────────────────────────────────────────────────────────────
  if (format === 'json') {
    const filename = `clerkfolio-${safeSpecialty}-${dateStr}.json`
    const payload = {
      schema_version: 1,
      exported_at: new Date().toISOString(),
      specialty: {
        key: specialty || null,
        label: specialtyDisplay,
      },
      portfolio_entries: entries ?? [],
      cases: cases ?? [],
      readable: {
        portfolio_entries: (entries ?? []).map(entry => ({
          ...entry,
          specialty_tag_labels: formatTags(entry.specialty_tags),
        })),
        cases: (cases ?? []).map(c => ({
          ...c,
          specialty_tag_labels: formatTags(c.specialty_tags),
          clinical_area_labels: c.clinical_domains?.length ? c.clinical_domains : c.clinical_domain ? [c.clinical_domain] : [],
        })),
      },
    }
    return new NextResponse(JSON.stringify(payload, null, 2), {
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
    const csv = '\uFEFF' + toCsv(entries ?? [], cases ?? [])
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // ── PDF export (default) ─────────────────────────────────────────────────────
  if (!entries?.length) {
    return NextResponse.json({ error: 'PDF exports currently require at least one portfolio entry. Use CSV or JSON to export cases.' }, { status: 400 })
  }

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
      supabase.rpc('increment_pro_feature_usage', {
        p_user_id: user.id,
        p_feature: 'pdf_exports_used',
      }).then(() => {})
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

type CsvEntry = { id?: string; title?: string; category?: string; date?: string; specialty_tags?: string[]; notes?: string; created_at?: string }
type CsvCase = { id?: string; title?: string; date?: string; clinical_domain?: string | null; clinical_domains?: string[]; specialty_tags?: string[]; notes?: string | null; created_at?: string }

function toCsv(entries: CsvEntry[], cases: CsvCase[]): string {
  const FIELDS = ['record_type', 'id', 'title', 'category_or_area', 'date', 'specialty_tags', 'notes', 'created_at'] as const
  // Prefix leading formula characters so Excel/Sheets cannot execute them.
  const FORMULA_CHARS = /^[=+\-@\t\r]/
  const escape = (v: string) => {
    const safe = FORMULA_CHARS.test(v) ? `'${v}` : v
    return `"${safe.replace(/"/g, '""')}"`
  }
  const header = FIELDS.join(',')
  const rows = entries.map(e => [
    escape('portfolio_entry'),
    escape(e.id ?? ''),
    escape(e.title ?? ''),
    escape(e.category ?? ''),
    escape(e.date ?? ''),
    escape(formatTags(e.specialty_tags).join(';')),
    escape(e.notes ?? ''),
    escape(e.created_at ?? ''),
  ].join(','))
  const caseRows = cases.map(c => [
    escape('case'),
    escape(c.id ?? ''),
    escape(c.title ?? ''),
    escape((c.clinical_domains?.length ? c.clinical_domains : c.clinical_domain ? [c.clinical_domain] : []).join(';')),
    escape(c.date ?? ''),
    escape(formatTags(c.specialty_tags).join(';')),
    escape(c.notes ?? ''),
    escape(c.created_at ?? ''),
  ].join(','))
  return [header, ...rows, ...caseRows].join('\n')
}
