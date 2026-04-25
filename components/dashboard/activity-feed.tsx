'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CATEGORY_COLOURS, CATEGORIES } from '@/lib/types/portfolio'
import type { PortfolioEntry } from '@/lib/types/portfolio'
import type { Case } from '@/lib/types/cases'
import { relativeDate } from '@/lib/utils/dates'

function entrySubtitle(e: PortfolioEntry): string {
  if (e.category === 'audit_qip')   return [e.audit_type?.toUpperCase(), e.audit_trust].filter(Boolean).join(' · ')
  if (e.category === 'teaching')    return e.teaching_type?.replace('_', ' ') ?? ''
  if (e.category === 'conference')  return e.conf_event_name ?? ''
  if (e.category === 'publication') return [e.pub_type?.replace('_', ' '), e.pub_status].filter(Boolean).join(' · ')
  if (e.category === 'leadership')  return e.leader_organisation ?? ''
  if (e.category === 'prize')       return e.prize_body ?? ''
  if (e.category === 'procedure')   return e.proc_name ?? ''
  if (e.category === 'reflection')  return e.refl_type?.replace('_', '-').toUpperCase() ?? ''
  return ''
}

// Dot glow colour map (hex values for box-shadow)
const DOT_HEX: Record<string, string> = {
  audit_qip:   '#60A5FA',
  teaching:    '#A78BFA',
  conference:  '#F472B6',
  publication: '#FB923C',
  leadership:  '#F472B6',
  prize:       '#FBBF24',
  procedure:   '#1B6FD9',
  reflection:  '#94A3B8',
  custom:      'rgba(245,245,242,0.4)',
}

const TABS = ['Portfolio', 'Cases', 'Specialty'] as const
type Tab = typeof TABS[number]

export default function ActivityFeed({
  entries,
  cases,
  specialtyInterests,
  specialtyCounts,
}: {
  entries: PortfolioEntry[]
  cases: Case[]
  specialtyInterests: string[]
  specialtyCounts: Record<string, number>
}) {
  const [tab, setTab] = useState<Tab>('Portfolio')

  const tabCounts: Record<Tab, number | null> = {
    Portfolio: entries.length,
    Cases: cases.length,
    Specialty: null,
  }

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl flex flex-col min-h-0">
      {/* Widget header with segmented tab control */}
      <div className="flex items-center justify-between px-4 pt-4 pb-0 border-b border-white/[0.06]">
        <div className="flex gap-0.5">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-medium transition-colors relative whitespace-nowrap ${
                tab === t
                  ? 'text-[#F5F5F2]'
                  : 'text-[rgba(245,245,242,0.4)] hover:text-[rgba(245,245,242,0.7)]'
              }`}
            >
              {tabCounts[t] !== null ? `${t} · ${tabCounts[t]}` : t}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-blue-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] max-h-[420px]">
        {/* Portfolio */}
        {tab === 'Portfolio' && (
          entries.length === 0 ? (
            <EmptyState
              icon={<AchievIcon />}
              text="No achievements logged yet"
              href="/portfolio/new"
              cta="Log your first entry"
            />
          ) : (
            entries.slice(0, 20).map(e => {
              const colour = CATEGORY_COLOURS[e.category]
              const label = CATEGORIES.find(c => c.value === e.category)?.short ?? e.category
              const sub = entrySubtitle(e)
              const dotHex = DOT_HEX[e.category] ?? 'rgba(245,245,242,0.4)'
              return (
                <Link key={e.id} href={`/portfolio/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                  <span
                    className={`shrink-0 w-1.5 h-1.5 rounded-full ${colour.dot}`}
                    style={{ boxShadow: `0 0 0 3px ${dotHex}22` }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#F5F5F2] truncate group-hover:text-white transition-colors">{e.title}</p>
                    {sub && <p className="text-xs text-[rgba(245,245,242,0.4)] truncate">{sub}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colour.bg} ${colour.text}`}>{label}</span>
                    <span className="text-[10px] text-[rgba(245,245,242,0.25)] font-mono">{relativeDate(e.created_at)}</span>
                  </div>
                </Link>
              )
            })
          )
        )}

        {/* Cases */}
        {tab === 'Cases' && (
          cases.length === 0 ? (
            <EmptyState
              icon={<CaseIcon />}
              text="No cases logged yet"
              href="/cases/new"
              cta="Log your first case"
            />
          ) : (
            cases.slice(0, 20).map(c => (
              <Link key={c.id} href={`/cases/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                <span
                  className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400"
                  style={{ boxShadow: '0 0 0 3px #3884DD22' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#F5F5F2] truncate group-hover:text-white transition-colors">{c.title}</p>
                  {c.clinical_domain && (
                    <p className="text-xs text-[rgba(245,245,242,0.4)] truncate">{c.clinical_domain}</p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px] text-[rgba(245,245,242,0.25)] font-mono">{relativeDate(c.created_at)}</span>
                </div>
              </Link>
            ))
          )
        )}

        {/* Specialty */}
        {tab === 'Specialty' && (
          specialtyInterests.length === 0 ? (
            <EmptyState
              icon={<SpecialtyIcon />}
              text="No specialty interests set"
              href="/specialties"
              cta="Add your interests"
            />
          ) : (
            <div className="p-4 space-y-2">
              {specialtyInterests.map(s => {
                const count = specialtyCounts[s] ?? 0
                const maxCount = Object.keys(specialtyCounts).length === 0 ? 1 : Math.max(...Object.values(specialtyCounts))
                return (
                  <div key={s} className="flex items-center justify-between py-2">
                    <span className="text-sm text-[rgba(245,245,242,0.8)]">{s}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (count / maxCount) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-[rgba(245,245,242,0.35)] font-mono w-6 text-right">{count}</span>
                    </div>
                  </div>
                )
              })}
              <div className="pt-2 border-t border-white/[0.06]">
                <Link href="/specialties" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Manage interests →
                </Link>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, text, href, cta }: { icon: React.ReactNode; text: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
      <div className="text-[rgba(245,245,242,0.15)]">{icon}</div>
      <p className="text-sm text-[rgba(245,245,242,0.35)]">{text}</p>
      <Link href={href} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">{cta}</Link>
    </div>
  )
}

function AchievIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

function CaseIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
}

function SpecialtyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
