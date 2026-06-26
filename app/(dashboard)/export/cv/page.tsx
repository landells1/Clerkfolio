import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, type Category, type PortfolioEntry } from '@/lib/types/portfolio'
import { PUB_STATUS_LABELS } from '@/lib/types/portfolio-labels'
import CvDownloadButton from '@/components/export/cv-download-button'
import { fetchSubscriptionInfo } from '@/lib/subscription'

const TEMPLATES = [
  { key: 'clinical', label: 'Clinical' },
  { key: 'academic', label: 'Academic' },
  { key: 'st_application', label: 'ST application' },
] as const

type CvTemplate = typeof TEMPLATES[number]['key']

const TEMPLATE_CATEGORY_ORDER: Record<CvTemplate, Category[]> = {
  clinical: ['procedure', 'audit_qip', 'teaching', 'reflection', 'leadership', 'conference', 'publication', 'prize', 'custom'],
  academic: ['publication', 'audit_qip', 'conference', 'teaching', 'prize', 'leadership', 'custom', 'procedure', 'reflection'],
  st_application: ['audit_qip', 'leadership', 'teaching', 'publication', 'procedure', 'conference', 'prize', 'reflection', 'custom'],
}

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
  const [{ data: entries }, subInfo] = await Promise.all([
    supabase
      .from('portfolio_entries')
      .select('id, title, date, category, notes, specialty_tags, conf_event_name, pub_journal, pub_status, leader_role, leader_organisation, prize_body')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(80),
    fetchSubscriptionInfo(supabase, user!.id),
  ])
  const rows = dedupeEntries((entries ?? []) as PortfolioEntry[])
  const categoryOrder = TEMPLATE_CATEGORY_ORDER[template]

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/export" prefetch={false} className="text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2]">Export</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#F5F5F2]">CV generator</h1>
        <p className="mt-1 text-sm text-[rgba(245,245,242,0.45)]">Generate a clinical, academic, or ST-application CV summary from your portfolio entries.</p>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {TEMPLATES.map(item => (
          // prefetch={false}: the three template switchers are query-param variants
          // of this one PDF-heavy route; default prefetch fans out the RSC renders
          // on mount (the BUG-001 / F-032 / F-044 prefetch storm). Fetch on click.
          <Link key={item.key} href={`/export/cv?template=${item.key}`} prefetch={false} className={`rounded-xl px-4 py-2 text-sm font-medium ${template === item.key ? 'bg-[#1B6FD9] text-[#0B0B0C]' : 'border border-white/[0.08] bg-[#141416] text-[#F5F5F2]'}`}>
            {item.label}
          </Link>
        ))}
        <CvDownloadButton template={template} isPro={subInfo.isPro} canExportPdf={subInfo.limits.canExportPdf} />
      </div>
      {!subInfo.isPro && (
        <p className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-100">
          {subInfo.limits.canExportPdf ? '1 of 1 PDF remaining. ' : 'Your included PDF has been used. '}
          CV downloads share the PDF allowance with Application PDF and Year in review downloads.
        </p>
      )}
      <section className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6">
        <h2 className="text-lg font-semibold text-[#F5F5F2]">{TEMPLATES.find(item => item.key === template)?.label ?? 'Clinical'} CV preview</h2>
        {rows.length === 0 ? (
          <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#0B0B0C] p-5 text-sm text-[rgba(245,245,242,0.55)]">
            Add publications, teaching, leadership, prizes, audits, or conference entries to build a CV preview.
          </div>
        ) : (
        <div className="mt-5 space-y-5">
          <p className="rounded-xl border border-white/[0.06] bg-[#0B0B0C] px-4 py-3 text-sm text-[rgba(245,245,242,0.65)]">
            {TEMPLATE_INTRO[template]}
          </p>
          {categoryOrder.map(categoryKey => {
            const category = CATEGORIES.find(item => item.value === categoryKey)
            if (!category) return null
            const matching = rows.filter(entry => entry.category === category.value)
            if (matching.length === 0) return null
            return (
              <div key={category.value}>
                <h3 className="text-sm font-semibold text-[#F5F5F2]">{category.label}</h3>
                <ul className="mt-2 space-y-2">
                  {matching.slice(0, 8).map(entry => (
                    <li key={entry.id} className="text-sm text-[rgba(245,245,242,0.62)]">
                      <span className="text-[#F5F5F2]">{entry.title}</span> · {new Date(entry.date).getFullYear()}
                      {tail(entry, category.value) ? ` · ${tail(entry, category.value)}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        )}
      </section>
    </div>
  )
}

function tail(entry: PortfolioEntry, category: Category) {
  if (category === 'conference') return entry.conf_event_name
  if (category === 'publication') return [entry.pub_journal, entry.pub_status ? PUB_STATUS_LABELS[entry.pub_status] ?? entry.pub_status : null].filter(Boolean).join(', ')
  if (category === 'leadership') return [entry.leader_role, entry.leader_organisation].filter(Boolean).join(', ')
  if (category === 'prize') return entry.prize_body
  return entry.notes?.slice(0, 90)
}
