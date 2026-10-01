import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, type Category, type PortfolioEntry } from '@/lib/types/portfolio'
import { PUB_STATUS_LABELS } from '@/lib/types/portfolio-labels'
import CvDownloadButton from '@/components/export/cv-download-button'
import DocxDownloadButton from '@/components/export/docx-download-button'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { buildCvLogSections, CV_LOG_KINDS, CV_LOG_SELECT, type CvLogRow } from '@/lib/export/cv-log-sections'
import { londonDateKey } from '@/lib/engagement/streaks'
import { pdfRemainingLabel } from '@/lib/entitlements/allowance'
import { CV_ENTRY_LIMIT, cvCategoryOrder } from '@/lib/export/cv-category-order'

const TEMPLATES = [
  { key: 'clinical', label: 'Clinical' },
  { key: 'academic', label: 'Academic' },
  { key: 'st_application', label: 'ST application' },
] as const

type CvTemplate = typeof TEMPLATES[number]['key']

const TEMPLATE_INTRO: Record<CvTemplate, string> = {
  clinical: 'Clinical template prioritises practical clinical experience, governance, teaching, and reflective development.',
  academic: 'Academic template prioritises publications, research outputs, conferences, prizes, and scholarly activity.',
  st_application: 'ST application template groups high-signal portfolio evidence for shortlisting and interview preparation.',
}

function normaliseTemplate(value: string | undefined): CvTemplate {
  return TEMPLATES.some(item => item.key === value) ? value as CvTemplate : 'clinical'
}

function dedupeEntries(entries: PortfolioEntry[]) {
  const seen = new Set<string>()
  return entries.filter(entry => {
    const key = `${entry.category}|${entry.date}|${entry.title.trim().toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default async function CvGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const template = normaliseTemplate(resolvedSearchParams.template)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: entries }, { data: logRows }, subInfo] = await Promise.all([
    supabase
      .from('portfolio_entries')
      .select('id, title, date, category, notes, specialty_tags, conf_event_name, pub_journal, pub_status, leader_role, leader_organisation, prize_body')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .eq('is_demo', false)
      .order('date', { ascending: false })
      .limit(CV_ENTRY_LIMIT),
    // Structured columns only (never notes, cost_pence or the free-text meta.detail; just the meta end_date key) - same query shape
    // as the /api/export/cv and /api/export/docx routes so all three CV
    // renderings stay in sync.
    supabase
      .from('personal_log')
      .select(CV_LOG_SELECT)
      .eq('user_id', user!.id)
      .in('kind', CV_LOG_KINDS)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(120),
    fetchSubscriptionInfo(supabase, user!.id),
  ])
  const rows = dedupeEntries((entries ?? []) as PortfolioEntry[])
  const logSections = buildCvLogSections((logRows ?? []) as unknown as CvLogRow[], londonDateKey(new Date()))
  const categoryOrder = cvCategoryOrder(template)

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/export" prefetch={false} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Export</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">CV generator</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Generate a clinical, academic, or ST-application CV summary from your portfolio entries.</p>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {TEMPLATES.map(item => (
          // prefetch={false}: the three template switchers are query-param variants
          // of this one PDF-heavy route; default prefetch fans out the RSC renders
          // on mount (the BUG-001 / F-032 / F-044 prefetch storm). Fetch on click.
          <Link key={item.key} href={`/export/cv?template=${item.key}`} prefetch={false} className={`rounded-xl px-4 py-2 text-sm font-medium ${template === item.key ? 'bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]' : 'border border-white/[0.08] bg-[var(--bg-surface)] text-[var(--text-primary)]'}`}>
            {item.label}
          </Link>
        ))}
        <CvDownloadButton template={template} isPro={subInfo.isPro} canExportPdf={subInfo.limits.canExportPdf} />
        <DocxDownloadButton template={template} isPro={subInfo.isPro} canExportPdf={subInfo.limits.canExportPdf} />
      </div>
      {/* One allowance banner for both download buttons (they used to repeat
          it under each button as well). */}
      {!subInfo.isPro && (
        <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-[var(--warning)]">
          <p>
            {subInfo.limits.canExportPdf ? `${pdfRemainingLabel(subInfo)}. ` : 'Your included PDF allowance has been used. '}
            CV PDF and Word downloads share the PDF allowance with Application PDF and Year in review downloads.
          </p>
          {!subInfo.limits.canExportPdf && (
            <p className="mt-1.5 text-[var(--text-secondary)]">
              <Link href="/upgrade" className="text-[var(--accent-text)] underline">Upgrade for £9.99/yr</Link> for unlimited PDFs, or{' '}
              <Link href="/settings/referrals" className="text-[var(--accent-text)] underline">invite a colleague</Link>. Each successful referral adds one more free PDF export.
            </p>
          )}
        </div>
      )}
      <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{TEMPLATES.find(item => item.key === template)?.label ?? 'Clinical'} CV preview</h2>
        {rows.length === 0 && logSections.length === 0 ? (
          <div className="mt-5 rounded-xl border border-white/[0.08] bg-[var(--bg-canvas)] p-5 text-sm text-[var(--text-secondary)]">
            Add publications, teaching, leadership, prizes, audits, or conference entries to build a CV preview.
          </div>
        ) : (
        <div className="mt-5 space-y-5">
          <p className="rounded-xl border border-white/[0.06] bg-[var(--bg-canvas)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            {TEMPLATE_INTRO[template]}
          </p>
          {categoryOrder.map(categoryKey => {
            const category = CATEGORIES.find(item => item.value === categoryKey)
            if (!category) return null
            const matching = rows.filter(entry => entry.category === category.value)
            if (matching.length === 0) return null
            return (
              <div key={category.value}>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{category.label}</h3>
                <ul className="mt-2 space-y-2">
                  {matching.slice(0, 8).map(entry => (
                    <li key={entry.id} className="text-sm text-[var(--text-secondary)]">
                      <span className="text-[var(--text-primary)]">{entry.title}</span> · {formatCvDate(entry.date)}
                      {tail(entry, category.value) ? ` · ${tail(entry, category.value)}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {/* Log-sourced sections (Rotations & placements, Courses &
              Certifications, Examinations) - same structure/order/data as the
              CV PDF + DOCX. Future-dated items are left out of all three. */}
          {logSections.map(section => (
            <div key={section.key}>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{section.title}</h3>
              <ul className="mt-2 space-y-2">
                {section.entries.slice(0, 8).map(entry => (
                  <li key={entry.id} className="text-sm text-[var(--text-secondary)]">
                    <span className="text-[var(--text-primary)]">{entry.title}</span> · {entry.dateLabel}
                    {entry.details.length > 0 ? ` · ${entry.details.map(detail => `${detail.label}: ${detail.value}`).join(' · ')}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        )}
      </section>
    </div>
  )
}

// Same day/short-month/year format as the CV PDF and DOCX renderers.
function formatCvDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function tail(entry: PortfolioEntry, category: Category) {
  if (category === 'conference') return entry.conf_event_name
  if (category === 'publication') return [entry.pub_journal, entry.pub_status ? PUB_STATUS_LABELS[entry.pub_status] ?? entry.pub_status : null].filter(Boolean).join(', ')
  if (category === 'leadership') return [entry.leader_role, entry.leader_organisation].filter(Boolean).join(', ')
  if (category === 'prize') return entry.prize_body
  return entry.notes?.slice(0, 90)
}
