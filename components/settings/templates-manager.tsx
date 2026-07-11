'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CATEGORIES, CATEGORY_COLOURS } from '@/lib/types/portfolio'
import type { Template } from '@/lib/types/templates'
import { caseTemplates, portfolioTemplates } from '@/lib/templates/filter'
import { useToast } from '@/components/ui/toast-provider'
import { apiFetch } from '@/lib/api-fetch'

export default function TemplatesManager({ initialTemplates }: { initialTemplates: Template[] }) {
  const { addToast } = useToast()
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleRename(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    const res = await apiFetch('/api/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editName.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      setTemplates(ts => ts.map(t => t.id === id ? { ...t, name: editName.trim() } : t))
      setEditingId(null)
      addToast('Template renamed', 'success')
    } else {
      addToast('Failed to rename template', 'error')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template? This cannot be undone.')) return
    const res = await apiFetch(`/api/templates?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTemplates(ts => ts.filter(t => t.id !== id))
      addToast('Template deleted', 'success')
    } else {
      addToast('Failed to delete template', 'error')
    }
  }

  const entryTemplates = portfolioTemplates(templates)
  const caseTemplatesList = caseTemplates(templates)

  // Group entry templates by category
  const grouped = CATEGORIES.reduce<Record<string, Template[]>>((acc, cat) => {
    acc[cat.value] = entryTemplates.filter(t => t.category === cat.value)
    return acc
  }, {})

  function renderRow(t: Template) {
    return (
      <div key={t.id} className="flex items-center gap-3 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl px-4 py-3">
        {editingId === t.id ? (
          <>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleRename(t.id); if (e.key === 'Escape') setEditingId(null) }}
              className="flex-1 bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            <button
              onClick={() => handleRename(t.id)}
              disabled={saving}
              className="text-xs text-[var(--accent-text)] hover:text-[var(--accent-bright)] transition-colors font-medium disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={() => setEditingId(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{t.name}</span>
            {t.is_curated ? (
              <span className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)]">Curated</span>
            ) : (
              <>
                <button
                  onClick={() => { setEditingId(t.id); setEditName(t.name) }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-xs text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/settings" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">My templates</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Reusable shapes you can apply when creating new portfolio entries or cases (different from snippets, which are short reusable phrases). To create one, open any entry or case and click &quot;Template&quot;.
          </p>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-1">No personal templates yet</p>
          <p className="text-xs text-[var(--text-secondary)] mb-6 max-w-xs">
            Open any portfolio entry or case and click the &quot;Template&quot; button in the actions row to save it as a personal template.
          </p>
          <Link href="/portfolio" className="flex items-center gap-2 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] text-[var(--button-primary-text)] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors">
            Go to Portfolio
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {entryTemplates.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[var(--text-emphasis)] uppercase tracking-wider mb-4">Entry templates</h2>
              <div className="space-y-6">
                {CATEGORIES.map(cat => {
                  const ts = grouped[cat.value]
                  if (!ts || ts.length === 0) return null
                  const colours = CATEGORY_COLOURS[cat.value]
                  return (
                    <div key={cat.value}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${colours.badge}`}>{cat.short}</span>
                        <h3 className="text-sm font-medium text-[var(--text-secondary)]">{cat.label}</h3>
                      </div>
                      <div className="space-y-2">
                        {ts.map(renderRow)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {caseTemplatesList.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[var(--text-emphasis)] uppercase tracking-wider mb-4">Case templates</h2>
              <div className="space-y-2">
                {caseTemplatesList.map(renderRow)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
