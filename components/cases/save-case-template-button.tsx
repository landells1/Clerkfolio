'use client'

import { useState } from 'react'
import type { Case } from '@/lib/types/cases'
import { buildCaseTemplateFieldDefaults } from '@/lib/templates/case-defaults'
import { useToast } from '@/components/ui/toast-provider'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'

type Props = { caseData: Case }

export default function SaveCaseTemplateButton({ caseData }: Props) {
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(caseData.title)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const res = await apiFetch<{ error?: string }>('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        entry_type: 'case',
        field_defaults: buildCaseTemplateFieldDefaults(caseData),
        guidance_prompts: {},
      }),
    })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      addToast('Template saved', 'success')
    } else {
      addToast(res.status === null ? NETWORK_ERROR_MESSAGE : res.data?.error ?? 'Failed to save template', 'error')
    }
  }

  return (
    <>
      <button
        onClick={() => { setName(caseData.title); setOpen(true) }}
        className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] border border-white/[0.08] rounded-lg hover:text-[var(--text-primary)] hover:border-white/[0.15] transition-colors"
        title="Save as template"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
        </svg>
        Template
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Save as template</h2>
              <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              This will save the clinical areas as a personal template you can reuse when logging new cases. Notes are never saved into a template - keep clinical detail out of reusable shapes.
            </p>
            <label className="block text-xs font-medium text-[var(--text-emphasis)] mb-1.5 uppercase tracking-wide">Template name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              maxLength={100}
              className="w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 border border-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl py-2.5 text-sm transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-[2] bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 text-[var(--button-primary-text)] font-semibold rounded-xl py-2.5 text-sm transition-colors"
              >
                {saving ? 'Saving…' : 'Save template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
