'use client'

import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type EntriesOverTimeBucket = {
  month: string
  cases: number
  audit_qip: number
  teaching: number
  conference: number
  publication: number
  leadership: number
  prize: number
  procedure: number
  reflection: number
  custom: number
}

const SERIES = [
  ['cases', 'var(--cat-cyan-dot)'],
  ['audit_qip', 'var(--cat-blue-dot)'],
  ['teaching', 'var(--cat-violet-dot)'],
  ['conference', 'var(--cat-amber-dot)'],
  ['publication', 'var(--cat-amber-dot)'],
  ['leadership', 'var(--cat-pink-dot)'],
  ['prize', 'var(--cat-amber-dot)'],
  ['procedure', 'var(--cat-teal-dot)'],
  ['reflection', 'var(--cat-green-dot)'],
  ['custom', 'var(--cat-neutral-dot)'],
] as const

export default function EntriesOverTime({ data }: { data: EntriesOverTimeBucket[] }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Entries over time</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">Last 12 months, grouped by category</p>
      </div>
      <div className="h-64">
        {mounted ? <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <defs>
              {SERIES.map(([key, color]) => (
                <linearGradient key={key} id={`entry-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--text-faint)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-primary)' }}
              labelStyle={{ color: 'var(--text-primary)' }}
            />
            {SERIES.map(([key, color]) => (
              <Area key={key} type="monotone" dataKey={key} stackId="entries" stroke={color} fill={`url(#entry-${key})`} strokeWidth={1.5} />
            ))}
          </AreaChart>
        </ResponsiveContainer> : <div className="h-full w-full" aria-hidden="true" />}
      </div>
    </div>
  )
}
