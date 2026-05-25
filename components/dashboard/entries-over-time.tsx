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
  ['cases', '#0EA5E9'],
  ['audit_qip', '#1B6FD9'],
  ['teaching', '#A855F7'],
  ['conference', '#F59E0B'],
  ['publication', '#F97316'],
  ['leadership', '#EC4899'],
  ['prize', '#EAB308'],
  ['procedure', '#14B8A6'],
  ['reflection', '#22C55E'],
  ['custom', '#94A3B8'],
] as const

export default function EntriesOverTime({ data }: { data: EntriesOverTimeBucket[] }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[#F5F5F2]">Entries over time</p>
        <p className="mt-0.5 text-xs text-[rgba(245,245,242,0.4)]">Last 12 months, grouped by category</p>
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
            <CartesianGrid stroke="rgba(245,245,242,0.06)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'rgba(245,245,242,0.42)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'rgba(245,245,242,0.55)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#141416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F5F5F2' }}
              labelStyle={{ color: '#F5F5F2' }}
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
