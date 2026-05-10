import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, type Category, type PortfolioEntry } from '@/lib/types/portfolio'
import { PUB_STATUS_LABELS } from '@/lib/types/portfolio-labels'

const TEMPLATES = [
  { key: 'clinical', label: 'Clinical' },
  { key: 'academic', label: 'Academic' },
  { key: 'st_application', label: 'ST application' },
]

export default async function CvGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const template = resolvedSearchParams.template ?? 'clinical'
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: entries } = await supabase
    .from('portfolio_entries')
    .select('id, title, date, category, notes, specialty_tags, conf_event_name, pub_journal, pub_status, leader_role, leader_organisation, prize_body')
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .limit(80)
  const rows = (entries ?? []) as PortfolioEntry[]

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/export" className="text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2]">Export</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#F5F5F2]">CV generator</h1>
        <p className="mt-1 text-sm text-[rgba(245,245,242,0.45)]">Generate a clinical, academic, or ST-application CV summary from your portfolio entries.</p>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {TEMPLATES.map(item => (
          <Link key={item.key} href={`/export/cv?template=${item.key}`} className={`rounded-xl px-4 py-2 text-sm font-medium ${template === item.key ? 'bg-[#1B6FD9] text-[#0B0B0C]' : 'border border-white/[0.08] bg-[#141416] text-[#F5F5F2]'}`}>
            {item.label}
          </Link>
        ))}
        <a href={`/api/export/cv?template=${template}`} className="rounded-xl bg-[#F5F5F2] px-4 py-2 text-sm font-semibold text-[#0B0B0C]">Download PDF</a>
      </div>
      <section className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6">
        <h2 className="text-lg font-semibold text-[#F5F5F2]">{TEMPLATES.find(item => item.key === template)?.label ?? 'Clinical'} CV preview</h2>
        {rows.length === 0 ? (
          <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#0B0B0C] p-5 text-sm text-[rgba(245,245,242,0.55)]">
            Add publications, teaching, leadership, prizes, audits, or conference entries to build a CV preview.
          </div>
        ) : (
        <div className="mt-5 space-y-5">
          {CATEGORIES.map(category => {
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
