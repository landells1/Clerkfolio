import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import PortfolioPDF from '@/lib/pdf/portfolio-pdf'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { validateOrigin } from '@/lib/csrf'
import { formatSpecialtyLabel } from '@/lib/specialties'
import React, { type ReactElement } from 'react'
import { foundationPortfolioTemplate } from '@/lib/pdf/foundation-portfolio'
import { mrcpTemplate } from '@/lib/pdf/mrcp'
import { stApplicationTemplate } from '@/lib/pdf/st-application'

const PDF_TEMPLATES = {
  foundation: foundationPortfolioTemplate,
  mrcp: mrcpTemplate,
  st_application: stApplicationTemplate,
} as const

const EXPORT_FIELDS = ['record_type', 'id', 'title', 'category_or_area', 'date', 'specialty_tags', 'notes', 'created_at'] as const
type ExportField = typeof EXPORT_FIELDS[number]

function formatTag(tag: string): string {
  return formatSpecialtyLabel(tag)
}

function formatTags(tags: string[] | null | undefined) {
  return (tags ?? []).map(formatTag)
}

function parseFields(value: unknown): ExportField[] {
  if (!Array.isArray(value)) return [...EXPORT_FIELDS]
  const set = new Set(value.filter((field): field is ExportField => EXPORT_FIELDS.includes(field as ExportField)))
  return set.size > 0 ? EXPORT_FIELDS.filter(field => set.has(field)) : [...EXPORT_FIELDS]
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

  const body = await request.json()
  const { entryIds, caseIds, specialty, format, template, theme, fields } = body as { entryIds: string[]; caseIds?: string[]; specialty: string; format?: 'pdf' | 'csv' | 'json'; template?: keyof typeof PDF_TEMPLATES | 'default'; theme?: string | null; fields?: string[] }
  const selectedFields = parseFields(fields)

  // PDF-only lifetime cap: do not block CSV / JSON exports.
  if ((!format || format === 'pdf') && !subInfo.limits.canExportPdf) {
    return NextResponse.json({ error: 'limit_reached', limit: 1, used: subInfo.usage.pdfExportsUsed, upgrade_url: '/upgrade' }, { status: 403 })
  }

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

  const filteredEntries = theme
    ? (entries ?? []).filter(entry => (entry.interview_themes ?? []).includes(theme))
    : (entries ?? [])
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
      portfolio_entries: filteredEntries.map(entry => selectJsonFields('portfolio_entry', entry, selectedFields)),
      cases: (cases ?? []).map(c => selectJsonFields('case', c, selectedFields)),
      readable: {
        portfolio_entries: filteredEntries.map(entry => selectJsonFields('portfolio_entry', {
          ...entry,
          specialty_tag_labels: formatTags(entry.specialty_tags),
        }, selectedFields)),
        cases: (cases ?? []).map(c => selectJsonFields('case', {
          ...c,
          specialty_tag_labels: formatTags(c.specialty_tags),
          clinical_area_labels: c.clinical_domains?.length ? c.clinical_domains : c.clinical_domain ? [c.clinical_domain] : [],
        }, selectedFields)),
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
    const csv = '\uFEFF' + toCsv(filteredEntries, cases ?? [], selectedFields)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // ── PDF export (default) ─────────────────────────────────────────────────────
  if (!filteredEntries.length) {
    return NextResponse.json({ error: 'PDF exports currently require at least one portfolio entry. Use CSV or JSON to export cases.' }, { status: 400 })
  }

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clerkfolio User'
  const exportedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  try {
    const selectedTemplate = template && template !== 'default' ? PDF_TEMPLATES[template] : null
    // Debug: log React version and element $$typeof identity
    const testElement = PortfolioPDF({
      entries: filteredEntries,
      userName,
      specialty: specialtyDisplay,
      exportedAt,
      templateName: selectedTemplate?.name,
      templateSubtitle: selectedTemplate?.subtitle,
      templateAccent: selectedTemplate?.accent,
    }) as unknown as ReactElement<DocumentProps>
    const debugInfo = {
      reactVersion: (React as unknown as { version: string }).version,
      typeOfSymbol: ((testElement as unknown as { $$typeof?: symbol }).$$typeof || 'none').toString(),
      expectedSymbol: Symbol.for('react.element').toString(),
      expectedTransitional: Symbol.for('react.transitional.element').toString(),
    }
    console.log('PDF debug info:', JSON.stringify(debugInfo))

    const buffer = await renderToBuffer(testElement)
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
    // Full error including stack to surface the underlying @react-pdf/renderer
    // failure in Vercel logs - the previous one-liner hid everything below the
    // top frame.
    if (err instanceof Error) {
      console.error('PDF generation error:', err.message)
      console.error('PDF generation stack:', err.stack)
    } else {
      console.error('PDF generation error (non-Error):', err)
    }
    // TEMP debug after v4 upgrade
    const debug = err instanceof Error
      ? { name: err.name, message: err.message?.slice(0, 800), stack: err.stack?.split('\n').slice(0, 10).join('\n') }
      : { value: String(err) }
    return NextResponse.json({ error: 'Failed to generate PDF. Please try again.', debug }, { status: 500 })
  }
}

type CsvEntry = { id?: string; title?: string; category?: string; date?: string; specialty_tags?: string[]; notes?: string; created_at?: string }
type CsvCase = { id?: string; title?: string; date?: string; clinical_domain?: string | null; clinical_domains?: string[]; specialty_tags?: string[]; notes?: string | null; created_at?: string }

function selectJsonFields(recordType: 'portfolio_entry' | 'case', row: Record<string, unknown>, fields: ExportField[]) {
  const next: Record<string, unknown> = {}
  fields.forEach(field => {
    if (field === 'record_type') next.record_type = recordType
    else if (field === 'category_or_area') {
      if (recordType === 'portfolio_entry') next.category = row.category
      else {
        next.clinical_domain = row.clinical_domain
        next.clinical_domains = row.clinical_domains
      }
    } else {
      next[field] = row[field]
    }
  })
  return next
}

function toCsv(entries: CsvEntry[], cases: CsvCase[], fields: ExportField[]): string {
  // Prefix leading formula characters so Excel/Sheets cannot execute them.
  const FORMULA_CHARS = /^[=+\-@\t\r]/
  const escape = (v: string) => {
    const safe = FORMULA_CHARS.test(v) ? `'${v}` : v
    return `"${safe.replace(/"/g, '""')}"`
  }
  const entryValue = (e: CsvEntry, field: ExportField) => {
    if (field === 'record_type') return 'portfolio_entry'
    if (field === 'category_or_area') return e.category ?? ''
    if (field === 'specialty_tags') return formatTags(e.specialty_tags).join(';')
    return String(e[field as keyof CsvEntry] ?? '')
  }
  const caseValue = (c: CsvCase, field: ExportField) => {
    if (field === 'record_type') return 'case'
    if (field === 'category_or_area') return (c.clinical_domains?.length ? c.clinical_domains : c.clinical_domain ? [c.clinical_domain] : []).join(';')
    if (field === 'specialty_tags') return formatTags(c.specialty_tags).join(';')
    return String(c[field as keyof CsvCase] ?? '')
  }
  const header = fields.join(',')
  const rows = entries.map(e => fields.map(field => escape(entryValue(e, field))).join(','))
  const caseRows = cases.map(c => fields.map(field => escape(caseValue(c, field))).join(','))
  return [header, ...rows, ...caseRows].join('\n')
}
