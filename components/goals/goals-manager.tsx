'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORY_COLOURS } from '@/lib/types/portfolio'

type Goal = {
  id: string
  category: string
  target_count: number
  due_date: string | null
  start_date: string | null
}

type PortfolioEntry = { category: string; created_at: string }
type CaseEntry = { created_at: string }

type Props = {
  initialGoals: Goal[]
  portfolioEntries: PortfolioEntry[]
  caseEntries: CaseEntry[]
  accountCreatedAt: string
}

const CATEGORY_OPTIONS = [
  { value: 'audit_qip',   label: 'Audit & QIP' },
  { value: 'teaching',    label: 'Teaching' },
  { value: 'conference',  label: 'Conference' },
  { value: 'publication', label: 'Publication' },
  { value: 'leadership',  label: 'Leadership' },
  { value: 'prize',       label: 'Prize' },
  { value: 'procedure',   label: 'Procedure' },
  { value: 'reflection',  label: 'Reflection' },
  { value: 'case',        label: 'Cases' },
]

function fmt(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00Z')
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function countForGoal(
  goal: Goal,
  entries: PortfolioEntry[],
  cases: CaseEntry[],
  accountCreatedAt: string
): number {
  const from = goal.start_date ?? accountCreatedAt.split('T')[0]
  if (goal.category === 'case') {
    return cases.filter(c => c.created_at.split('T')[0] >= from).length
  }
  return entries.filter(e => e.category === goal.category && e.created_at.split('T')[0] >= from).length
}

type Status = 'complete' | 'overdue' | 'due-soon' | 'on-track' | 'no-deadline'

function getStatus(goal: Goal, current: number): Status {
  if (current >= goal.target_count) return 'complete'
  if (!goal.due_date) return 'no-deadline'
  const due = new Date(goal.due_date + 'T23:59:59Z').getTime()
  if (due < Date.now()) return 'overdue'
  if ((due - Date.now()) / 86400000 <= 7) return 'due-soon'
  return 'on-track'
}

const STATUS_CONFIG: Record<Status, { label: string; cls: string }> = {
  'complete':    { label: 'Complete',    cls: 'text-[#1B6FD9] bg-[#1B6FD9]/10' },
  'overdue':     { label: 'Overdue',     cls: 'text-red-400 bg-red-400/10' },
  'due-soon':    { label: 'Due soon',    cls: 'text-amber-400 bg-amber-400/10' },
  'on-track':    { label: 'On track',    cls: 'text-emerald-400 bg-emerald-400/10' },
  'no-deadline': { label: 'No deadline', cls: 'text-[rgba(245,245,242,0.4)] bg-white/[0.04]' },
}

const INPUT = 'w-full bg-[#0B0B0C] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors'
const LABEL = 'block text-xs font-medium text-[rgba(245,245,242,0.5)] mb-1.5'

export default function GoalsManager({ initialGoals, portfolioEntries, caseEntries, accountCreatedAt }: Props) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [showAddForm, setShowAddForm] = useState(false)
  const [category, setCategory] = useState('audit_qip')
  const [targetCount, setTargetCount] = useState(5)
  const [startDate, setStartDate] = useState(accountCreatedAt.split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Summary
  const counts = goals.map(g => ({
    status: getStatus(g, countForGoal(g, portfolioEntries, caseEntries, accountCreatedAt)),
  }))
  const nComplete  = counts.filter(c => c.status === 'complete').length
  const nOverdue   = counts.filter(c => c.status === 'overdue').length
  const nDueSoon   = counts.filter(c => c.status === 'due-soon').length
  const nOnTrack   = counts.filter(c => c.status === 'on-track').length

  async function handleAdd() {
    setError(null)
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); return }

      const { data, error: insertError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          category,
          target_count: targetCount,
          start_date: startDate || null,
          due_date: dueDate || null,
        })
        .select('id, category, target_count, due_date, start_date')
        .single()

      if (insertError) { setError(insertError.message); return }
      if (data) {
        setGoals(prev => [...prev, data])
        setShowAddForm(false)
        setCategory('audit_qip')
        setTargetCount(5)
        setStartDate(accountCreatedAt.split('T')[0])
        setDueDate('')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const goal = goals.find(g => g.id === id)
    const label = CATEGORY_OPTIONS.find(o => o.value === goal?.category)?.label ?? 'this goal'
    if (!window.confirm(`Remove "${label}" goal? This cannot be undone.`)) return

    setDeletingId(id)
    const { error: deleteError } = await supabase.from('goals').delete().eq('id', id)
    if (deleteError) {
      setError('Failed to remove goal. Please try again.')
    } else {
      setGoals(prev => prev.filter(g => g.id !== id))
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-3">

      {/* Summary chips */}
      {goals.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pb-1">
          <span className="text-xs text-[rgba(245,245,242,0.35)]">
            {goals.length} goal{goals.length !== 1 ? 's' : ''}
          </span>
          {nComplete > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-[#1B6FD9] bg-[#1B6FD9]/10">
              {nComplete} complete
            </span>
          )}
          {nOnTrack > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-400/10">
              {nOnTrack} on track
            </span>
          )}
          {nDueSoon > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-amber-400 bg-amber-400/10">
              {nDueSoon} due soon
            </span>
          )}
          {nOverdue > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-red-400 bg-red-400/10">
              {nOverdue} overdue
            </span>
          )}
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && !showAddForm && (
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl py-14 px-8 text-center">
          <div className="mx-auto mb-4 w-10 h-10 flex items-center justify-center text-[rgba(245,245,242,0.12)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-[rgba(245,245,242,0.5)] mb-1">No goals set yet</p>
          <p className="text-xs text-[rgba(245,245,242,0.3)]">
            Set a target in any category. Progress only counts entries logged from the goal&apos;s start date.
          </p>
        </div>
      )}

      {/* Goal cards */}
      {goals.map(goal => {
        const catLabel = CATEGORY_OPTIONS.find(o => o.value === goal.category)?.label ?? goal.category
        const current = countForGoal(goal, portfolioEntries, caseEntries, accountCreatedAt)
        const pct = Math.min(Math.round((current / goal.target_count) * 100), 100)
        const complete = current >= goal.target_count
        const status = getStatus(goal, current)
        const statusCfg = STATUS_CONFIG[status]
        const colour = goal.category !== 'case' ? CATEGORY_COLOURS[goal.category as keyof typeof CATEGORY_COLOURS] : null

        const fromStr = goal.start_date ?? accountCreatedAt.split('T')[0]

        return (
          <div
            key={goal.id}
            className="bg-[#141416] border border-white/[0.08] hover:border-white/[0.13] rounded-2xl p-5 group transition-colors"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${colour?.dot ?? 'bg-[#1B6FD9]'}`} />
                  <span className="text-sm font-semibold text-[#F5F5F2]">{catLabel}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${statusCfg.cls}`}>
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-xs text-[rgba(245,245,242,0.35)] pl-4">
                  From {fmt(fromStr)}
                  {goal.due_date ? ` · Due ${fmt(goal.due_date)}` : ' · No deadline'}
                </p>
              </div>
              {/* Big percentage */}
              <div className="text-right shrink-0 pl-2">
                <p
                  className="text-3xl font-bold tracking-tight leading-none"
                  style={{ color: complete ? '#1B6FD9' : 'rgba(245,245,242,0.85)' }}
                >
                  {pct}%
                </p>
                <p className="text-xs text-[rgba(245,245,242,0.4)] font-mono mt-0.5">
                  {current} / {goal.target_count}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all duration-500 ${complete ? 'bg-[#1B6FD9]' : 'bg-[#1B6FD9]/55'}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-[rgba(245,245,242,0.25)]">
                {goal.target_count - current > 0
                  ? `${goal.target_count - current} more to go`
                  : 'Target reached'}
              </p>
              <button
                onClick={() => handleDelete(goal.id)}
                disabled={deletingId === goal.id}
                className="text-xs text-[rgba(245,245,242,0.2)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
              >
                {deletingId === goal.id ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        )
      })}

      {/* Add form */}
      {showAddForm ? (
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold text-[#F5F5F2]">New goal</p>

          <div>
            <label className={LABEL}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={INPUT}>
              {CATEGORY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Target count</label>
            <input
              type="number"
              min={1}
              max={500}
              value={targetCount}
              onChange={e => setTargetCount(Math.max(1, Math.min(500, Number(e.target.value))))}
              className={INPUT}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>
                Count entries from
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={INPUT + ' [color-scheme:dark]'}
              />
              <p className="text-[11px] text-[rgba(245,245,242,0.3)] mt-1">
                Only entries logged on or after this date count toward this goal
              </p>
            </div>
            <div>
              <label className={LABEL}>
                Due date <span className="font-normal text-[rgba(245,245,242,0.3)]">(optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={INPUT + ' [color-scheme:dark]'}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 bg-[#1B6FD9] hover:bg-[#3884DD] disabled:opacity-50 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
            >
              {saving ? 'Saving…' : 'Add goal'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setError(null) }}
              className="px-4 py-2.5 text-sm text-[rgba(245,245,242,0.5)] hover:text-[#F5F5F2] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full border border-dashed border-white/[0.1] hover:border-white/[0.2] rounded-2xl px-5 py-4 text-sm text-[rgba(245,245,242,0.4)] hover:text-[rgba(245,245,242,0.7)] transition-all"
        >
          + Add a goal
        </button>
      )}

      {error && !showAddForm && <p className="text-xs text-red-400 px-1">{error}</p>}
    </div>
  )
}
