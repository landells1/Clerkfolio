'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import SwipeToDelete from '@/components/ui/swipe-to-delete'
import type { PersonalLogKind } from '@/components/logs/personal-log-form'

export type PersonalLogListRow = {
  id: string
  title: string
  date: string
  expires_at: string | null
  cpd_hours: number | null
  attempts: number | null
  score: string | null
  cost_pence: number | null
  meta: { detail?: string } | null
  notes: string | null
}

type EditDraft = {
  title: string
  date: string
  expiresAt: string
  cpdHours: string
  attempts: string
  score: string
  cost: string
  detail: string
  notes: string
}

export default function LogList({ rows, kind }: { rows: PersonalLogListRow[]; kind: PersonalLogKind }) {
  const [visibleRows, setVisibleRows] = useState(rows)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => setVisibleRows(rows), [rows])

  async function deleteLog(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      addToast('Please sign in again', 'error')
      return
    }
    const { error } = await supabase
      .from('personal_log')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      addToast('Failed to delete log entry', 'error')
      return
    }
    setVisibleRows(prev => prev.filter(row => row.id !== id))
    addToast('Log entry moved to trash', 'success')
    router.refresh()
  }

  function beginEdit(row: PersonalLogListRow) {
    setEditingId(row.id)
    setEditDraft({
      title: row.title,
      date: row.date,
      expiresAt: row.expires_at ?? '',
      cpdHours: row.cpd_hours?.toString() ?? '',
      attempts: row.attempts?.toString() ?? '',
      score: row.score ?? '',
      cost: row.cost_pence === null ? '' : (row.cost_pence / 100).toFixed(2),
      detail: row.meta?.detail ?? '',
      notes: row.notes ?? '',
    })
  }

  function updateDraft(field: keyof EditDraft, value: string) {
    setEditDraft(current => current ? { ...current, [field]: value } : current)
  }

  async function saveLog(id: string) {
    if (!editDraft || !editDraft.title.trim() || !editDraft.date) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      addToast('Please sign in again', 'error')
      return
    }

    const patch = {
      title: editDraft.title.trim(),
      date: editDraft.date,
      expires_at: kind === 'mandatory_training' && editDraft.expiresAt ? editDraft.expiresAt : null,
      cpd_hours: kind === 'course' && editDraft.cpdHours ? Number(editDraft.cpdHours) : null,
      attempts: kind === 'exam' && editDraft.attempts ? Number(editDraft.attempts) : null,
      score: kind === 'exam' && editDraft.score.trim() ? editDraft.score.trim() : null,
      cost_pence: (kind === 'exam' || kind === 'course') && editDraft.cost
        ? Math.round(Number(editDraft.cost) * 100)
        : null,
      meta: editDraft.detail.trim() ? { detail: editDraft.detail.trim() } : {},
      notes: editDraft.notes.trim() || null,
    }

    const { error } = await supabase
      .from('personal_log')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)

    setSaving(false)
    if (error) {
      addToast('Failed to update log entry', 'error')
      return
    }

    setVisibleRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row))
    setEditingId(null)
    setEditDraft(null)
    addToast('Log entry updated', 'success')
    router.refresh()
  }

  function confirmDelete(row: PersonalLogListRow) {
    if (!window.confirm(`Move "${row.title}" to trash?`)) return
    void deleteLog(row.id)
  }

  return (
    <div className="divide-y divide-white/[0.06]">
      {visibleRows.map(row => (
        <SwipeToDelete
          key={row.id}
          title="Move log entry to trash?"
          description={row.title}
          onConfirm={() => deleteLog(row.id)}
          disabled={editingId === row.id}
        >
          <div className="bg-[var(--bg-surface)] p-4">
            {editingId === row.id && editDraft ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required value={editDraft.title} onChange={event => updateDraft('title', event.target.value)} aria-label="Title" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]" />
                  <input type="date" required value={editDraft.date} onChange={event => updateDraft('date', event.target.value)} aria-label="Date" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]" />
                  {kind === 'mandatory_training' && <input type="date" value={editDraft.expiresAt} onChange={event => updateDraft('expiresAt', event.target.value)} aria-label="Expiry date" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]" />}
                  {kind === 'course' && <input type="number" step="0.5" value={editDraft.cpdHours} onChange={event => updateDraft('cpdHours', event.target.value)} placeholder="CPD hours" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]" />}
                  {kind === 'exam' && <input type="number" value={editDraft.attempts} onChange={event => updateDraft('attempts', event.target.value)} placeholder="Attempt count" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]" />}
                  {kind === 'exam' && <input value={editDraft.score} onChange={event => updateDraft('score', event.target.value)} placeholder="Score" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]" />}
                  {(kind === 'exam' || kind === 'course') && <input type="number" step="0.01" value={editDraft.cost} onChange={event => updateDraft('cost', event.target.value)} placeholder="Cost GBP" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]" />}
                  {(kind === 'oop' || kind === 'rotation' || kind === 'wba_received' || kind === 'teaching_observed') && <input value={editDraft.detail} onChange={event => updateDraft('detail', event.target.value)} placeholder="Detail" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]" />}
                </div>
                <textarea value={editDraft.notes} onChange={event => updateDraft('notes', event.target.value)} placeholder="Notes" className="min-h-[88px] w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] p-3 text-sm text-[var(--text-primary)]" />
                <div className="flex gap-2">
                  <button type="button" disabled={saving} onClick={() => void saveLog(row.id)} className="min-h-[40px] rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button type="button" disabled={saving} onClick={() => { setEditingId(null); setEditDraft(null) }} className="min-h-[40px] rounded-lg border border-white/[0.08] px-4 text-sm text-[var(--text-primary)] disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">{row.title}</h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{new Date(row.date).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {row.expires_at && <span className="rounded bg-amber-400/10 px-2 py-1 text-xs text-amber-300">Expires {new Date(row.expires_at).toLocaleDateString('en-GB')}</span>}
                    <button type="button" onClick={() => beginEdit(row)} className="text-xs text-[var(--accent-text)] transition-colors hover:text-[var(--accent-bright)]">Edit</button>
                    <button type="button" onClick={() => confirmDelete(row)} className="text-xs text-red-300 transition-colors hover:text-red-200">Delete</button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {[row.cpd_hours ? `${row.cpd_hours} CPD h` : '', row.score ? `Score ${row.score}` : '', row.attempts ? `${row.attempts} attempts` : '', row.cost_pence ? `£${(row.cost_pence / 100).toFixed(2)}` : '', row.meta?.detail ?? ''].filter(Boolean).join(' - ')}
                </p>
                {row.notes && <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{row.notes}</p>}
              </>
            )}
          </div>
        </SwipeToDelete>
      ))}
    </div>
  )
}
