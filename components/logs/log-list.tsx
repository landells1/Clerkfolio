'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import SwipeToDelete from '@/components/ui/swipe-to-delete'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import SnippetTextarea from '@/components/ui/snippet-textarea'
import { buildPersonalLogMeta, isUpcoming, logRowSummary, type PersonalLogKind } from '@/lib/logs/personal-log'
import { formatRotationSpan, rotationEndDate } from '@/lib/logs/rotations'
import { WBA_TYPES, WBA_TYPE_LABELS, wbaTypeFor } from '@/lib/logs/wba'

export type PersonalLogListRow = {
  id: string
  title: string
  date: string
  expires_at: string | null
  cpd_hours: number | null
  attempts: number | null
  score: string | null
  cost_pence: number | null
  meta: { detail?: string; end_date?: string; wba_type?: string } | null
  notes: string | null
}

type EditDraft = {
  title: string
  date: string
  endDate: string
  wbaType: string
  expiresAt: string
  cpdHours: string
  attempts: string
  score: string
  cost: string
  detail: string
  notes: string
}

const FIELD = 'min-h-[44px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]'
const FIELD_LABEL = 'mb-1 block text-xs font-medium text-[var(--text-secondary)]'

function formatDay(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function LogList({ rows, kind, todayKey }: { rows: PersonalLogListRow[]; kind: PersonalLogKind; todayKey: string }) {
  const [visibleRows, setVisibleRows] = useState(rows)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PersonalLogListRow | null>(null)
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
    setPendingDelete(null)
    addToast('Log entry moved to trash', 'success')
    router.refresh()
  }

  function beginEdit(row: PersonalLogListRow) {
    setEditingId(row.id)
    setEditDraft({
      title: row.title,
      date: row.date,
      endDate: row.meta?.end_date ?? '',
      wbaType: kind === 'wba_received' ? wbaTypeFor({ title: row.title, date: row.date, meta: row.meta }) : '',
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

  async function saveLog(row: PersonalLogListRow) {
    if (!editDraft || !editDraft.title.trim() || !editDraft.date) return
    if (kind === 'rotation' && editDraft.endDate && editDraft.endDate < editDraft.date) {
      addToast('The end date must be on or after the start date.', 'error')
      return
    }
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
      // Keeps meta keys this form does not own, so an edit never drops data.
      meta: buildPersonalLogMeta(row.meta, kind, { detail: editDraft.detail, endDate: editDraft.endDate, wbaType: editDraft.wbaType }),
      notes: editDraft.notes.trim() || null,
    }

    const { error } = await supabase
      .from('personal_log')
      .update(patch)
      .eq('id', row.id)
      .eq('user_id', user.id)

    setSaving(false)
    if (error) {
      addToast('Failed to update log entry', 'error')
      return
    }

    setVisibleRows(current => current.map(item => item.id === row.id ? { ...item, ...patch } : item))
    setEditingId(null)
    setEditDraft(null)
    addToast('Log entry updated', 'success')
    router.refresh()
  }

  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {visibleRows.map(row => {
        const upcoming = isUpcoming(row.date, todayKey)
        const end = kind === 'rotation' ? rotationEndDate({ date: row.date, meta: row.meta }) : null
        const summary = logRowSummary(row)
        return (
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className={FIELD_LABEL}>Title</span>
                    <input required value={editDraft.title} onChange={event => updateDraft('title', event.target.value)} className={`${FIELD} w-full`} />
                  </label>
                  {kind === 'wba_received' && (
                    <label className="block sm:col-span-2">
                      <span className={FIELD_LABEL}>Type of WBA</span>
                      <select value={editDraft.wbaType} onChange={event => updateDraft('wbaType', event.target.value)} className={`${FIELD} w-full`}>
                        {WBA_TYPES.map(type => <option key={type} value={type}>{WBA_TYPE_LABELS[type]}</option>)}
                      </select>
                    </label>
                  )}
                  <label className="block">
                    <span className={FIELD_LABEL}>{kind === 'rotation' ? 'Start date' : 'Date'}</span>
                    <input type="date" required value={editDraft.date} onChange={event => updateDraft('date', event.target.value)} className={`${FIELD} w-full`} />
                  </label>
                  {kind === 'rotation' && (
                    <label className="block">
                      <span className={FIELD_LABEL}>End date (blank = current)</span>
                      <input type="date" value={editDraft.endDate} min={editDraft.date || undefined} onChange={event => updateDraft('endDate', event.target.value)} className={`${FIELD} w-full`} />
                    </label>
                  )}
                  {kind === 'mandatory_training' && (
                    <label className="block">
                      <span className={FIELD_LABEL}>Expires on</span>
                      <input type="date" value={editDraft.expiresAt} onChange={event => updateDraft('expiresAt', event.target.value)} className={`${FIELD} w-full`} />
                    </label>
                  )}
                  {kind === 'course' && (
                    <label className="block">
                      <span className={FIELD_LABEL}>CPD hours</span>
                      <input type="number" step="0.5" value={editDraft.cpdHours} onChange={event => updateDraft('cpdHours', event.target.value)} className={`${FIELD} w-full`} />
                    </label>
                  )}
                  {kind === 'exam' && (
                    <label className="block">
                      <span className={FIELD_LABEL}>Attempt number</span>
                      <input type="number" min="1" value={editDraft.attempts} onChange={event => updateDraft('attempts', event.target.value)} className={`${FIELD} w-full`} />
                    </label>
                  )}
                  {kind === 'exam' && (
                    <label className="block">
                      <span className={FIELD_LABEL}>Result / score</span>
                      <input value={editDraft.score} onChange={event => updateDraft('score', event.target.value)} className={`${FIELD} w-full`} />
                    </label>
                  )}
                  {(kind === 'exam' || kind === 'course') && (
                    <label className="block">
                      <span className={FIELD_LABEL}>Cost (GBP)</span>
                      <input type="number" step="0.01" value={editDraft.cost} onChange={event => updateDraft('cost', event.target.value)} className={`${FIELD} w-full`} />
                    </label>
                  )}
                  {(kind === 'oop' || kind === 'rotation' || kind === 'wba_received' || kind === 'teaching_observed') && (
                    <label className="block sm:col-span-2">
                      <span className={FIELD_LABEL}>Details</span>
                      <input value={editDraft.detail} onChange={event => updateDraft('detail', event.target.value)} className={`${FIELD} w-full`} />
                    </label>
                  )}
                </div>
                <label className="block">
                  <span className={FIELD_LABEL}>Notes</span>
                  <SnippetTextarea value={editDraft.notes} onValueChange={value => updateDraft('notes', value)} placeholder="Notes" className="min-h-[88px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3 text-sm text-[var(--text-primary)]" />
                </label>
                <div className="flex gap-2">
                  <button type="button" disabled={saving} onClick={() => void saveLog(row)} className="min-h-[40px] rounded-lg bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button type="button" disabled={saving} onClick={() => { setEditingId(null); setEditDraft(null) }} className="min-h-[40px] rounded-lg border border-[var(--border-default)] px-4 text-sm text-[var(--text-primary)] disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">{row.title}</h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {kind === 'rotation' ? formatRotationSpan({ start: row.date.slice(0, 10), end }) : formatDay(row.date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
                    {kind === 'wba_received' && (
                      <span className="rounded bg-[var(--accent-soft)] px-2 py-1 text-xs font-medium text-[var(--accent-soft-text)]">
                        {WBA_TYPE_LABELS[wbaTypeFor({ title: row.title, date: row.date, meta: row.meta })]}
                      </span>
                    )}
                    {upcoming && (kind === 'exam' || kind === 'course' || kind === 'rotation') && (
                      <span className="rounded bg-[var(--info-bg)] px-2 py-1 text-xs font-medium text-[var(--info-text)]">Upcoming</span>
                    )}
                    {row.expires_at && <span className="rounded bg-amber-400/10 px-2 py-1 text-xs text-[var(--warning)]">Expires {formatDay(row.expires_at)}</span>}
                    <button type="button" onClick={() => beginEdit(row)} className="text-xs text-[var(--accent-text)] transition-colors hover:text-[var(--accent-bright)]">Edit</button>
                    <button type="button" onClick={() => setPendingDelete(row)} className="text-xs text-[var(--danger)] transition-colors hover:text-[var(--danger)]">Delete</button>
                  </div>
                </div>
                {(summary || row.meta?.detail) && (
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {[summary, row.meta?.detail ?? ''].filter(Boolean).join(' - ')}
                  </p>
                )}
                {row.notes && <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{row.notes}</p>}
              </>
            )}
          </div>
        </SwipeToDelete>
        )
      })}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Move to Trash?"
        confirmLabel="Move to Trash"
        busyLabel="Moving..."
        tone="danger"
        onConfirm={() => pendingDelete ? deleteLog(pendingDelete.id) : undefined}
        onCancel={() => setPendingDelete(null)}
      >
        <p>&quot;{pendingDelete?.title}&quot; moves to Trash. You can restore it from there for 30 days.</p>
      </ConfirmDialog>
    </div>
  )
}
