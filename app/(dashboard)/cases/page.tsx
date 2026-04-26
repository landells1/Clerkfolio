import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import CaseCard from '@/components/cases/case-card'
import CasesFilters from '@/components/cases/cases-filters'
import DraftResumeBanner from '@/components/cases/draft-resume-banner'

const PAGE_SIZE = 20

export default async function CasesPage({
  searchParams,
}: {
  searchParams: { q?: string; domain?: string; specialty?: string; sort?: string; page?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const q = searchParams.q ?? ''
  const domain = searchParams.domain ?? ''
  const specialty = searchParams.specialty ?? ''
  const sort = searchParams.sort ?? ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('cases')
    .select('*', { count: 'exact' })
    .eq('user_id', user!.id)
    .is('deleted_at', null)

  if (q.trim()) {
    query = query.ilike('title', `%${q.trim()}%`)
  }

  if (domain) {
    query = query.eq('clinical_domain', domain)
  }

  if (specialty) {
    query = query.contains('specialty_tags', [specialty])
  }

  if (sort === 'date_asc') {
    query = query.order('pinned', { ascending: false }).order('date', { ascending: true }).order('created_at', { ascending: true })
  } else if (sort === 'title_asc') {
    query = query.order('pinned', { ascending: false }).order('title', { ascending: true })
  } else {
    query = query.order('pinned', { ascending: false }).order('created_at', { ascending: false })
  }

  const [{ data: cases, count }, { data: allCasesMeta }, { data: trackedSpecialtyRows }] = await Promise.all([
    query.range(offset, offset + PAGE_SIZE - 1),
    supabase.from('cases').select('clinical_domain, specialty_tags').eq('user_id', user!.id).is('deleted_at', null),
    supabase.from('specialty_applications').select('specialty_key').eq('user_id', user!.id),
  ])

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Domain breakdown for stats bar
  const domainCountMap: Record<string, number> = {}
  allCasesMeta?.forEach(c => {
    if (c.clinical_domain) domainCountMap[c.clinical_domain] = (domainCountMap[c.clinical_domain] ?? 0) + 1
  })

  // Tracked specialty keys for filter dropdown
  const trackedSpecialtyKeys = (trackedSpecialtyRows ?? []).map(r => r.specialty_key)

  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (domain) params.set('domain', domain)
    if (specialty) params.set('specialty', specialty)
    if (sort) params.set('sort', sort)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/cases${qs ? `?${qs}` : ''}`
  }

  const allCasesTotal = allCasesMeta?.length ?? 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Cases</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
            {allCasesTotal} {allCasesTotal === 1 ? 'case' : 'cases'} logged
          </p>
        </div>
        <Link
          href="/cases/new"
          className="flex items-center gap-2 bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Log case
        </Link>
      </div>

      {/* Domain count summary bar */}
      {Object.keys(domainCountMap).length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-xs text-[rgba(245,245,242,0.4)]">
          {Object.entries(domainCountMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([d, n]) => (
              <span key={d}>
                <span className="text-[rgba(245,245,242,0.65)]">{n}</span> {d}
              </span>
            ))}
          {Object.keys(domainCountMap).length > 6 && (
            <span className="text-[rgba(245,245,242,0.3)]">+{Object.keys(domainCountMap).length - 6} more areas</span>
          )}
        </div>
      )}

      {/* Search + sort + domain + specialty filters */}
      <Suspense fallback={<div className="h-10" />}>
        <CasesFilters
          defaultQ={q}
          defaultDomain={domain}
          defaultSpecialty={specialty}
          defaultSort={sort}
          trackedSpecialtyKeys={trackedSpecialtyKeys}
        />
      </Suspense>

      {/* Draft resume banner — shown if user has an unsaved draft in sessionStorage */}
      <DraftResumeBanner />

      {/* Anonymisation notice */}
      <div className="flex items-start gap-3 bg-[#141416] border border-white/[0.06] rounded-xl px-4 py-3 mb-6">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-xs text-[rgba(245,245,242,0.4)] leading-relaxed">
          All case entries must be anonymised. Do not include patient names, dates of birth, NHS numbers, or other identifying information.
        </p>
      </div>

      {/* Case list */}
      {!cases || cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12h6m-3-3v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
            </svg>
          </div>
          <p className="text-sm text-[rgba(245,245,242,0.5)] mb-1">No cases logged yet</p>
          <p className="text-xs text-[rgba(245,245,242,0.3)] mb-6 max-w-xs">
            Start logging clinical cases you&apos;ve seen. They&apos;ll appear here and on your dashboard.
          </p>
          <Link
            href="/cases/new"
            className="flex items-center gap-2 bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log your first case
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3">
            {cases.map(c => (
              <CaseCard key={c.id} c={c} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 mt-2 border-t border-white/[0.06]">
              <p className="text-xs text-[rgba(245,245,242,0.35)]">
                Page {page} of {totalPages} · {total} cases
              </p>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={pageHref(page - 1)}
                    className="px-3 py-1.5 text-xs text-[rgba(245,245,242,0.6)] hover:text-[#F5F5F2] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-colors"
                  >
                    ← Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={pageHref(page + 1)}
                    className="px-3 py-1.5 text-xs text-[rgba(245,245,242,0.6)] hover:text-[#F5F5F2] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-colors"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
