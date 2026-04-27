'use client'

import { useState } from 'react'
import type { PortfolioEntry } from '@/lib/types/portfolio'
import { useToast } from '@/components/ui/toast-provider'

type Props = { entry: PortfolioEntry }

function buildFieldDefaults(entry: PortfolioEntry): Record<string, string | number | boolean> {
  const d: Record<string, string | number | boolean> = {}
  switch (entry.category) {
    case 'audit_qip':
      if (entry.audit_type) d.audit_type = entry.audit_type
      if (entry.audit_cycle_stage) d.audit_cycle_stage = entry.audit_cycle_stage
      break
    case 'teaching':
      if (entry.teaching_type) d.teaching_type = entry.teaching_type
      if (entry.teaching_audience) d.teaching_audience = entry.teaching_audience
      if (entry.teaching_setting) d.teaching_setting = entry.teaching_setting
      break
    case 'conference':
      if (entry.conf_type) d.conf_type = entry.conf_type
      if (entry.conf_attendance) d.conf_attendance = entry.conf_attendance
      if (entry.conf_level) d.conf_level = entry.conf_level
      break
    case 'publication':
      if (entry.pub_type) d.pub_type = entry.pub_type
      if (entry.pub_status) d.pub_status = entry.pub_status
      break
    case 'prize':
      if (entry.prize_level) d.prize_level = entry.prize_level
      break
    case 'procedure':
      if (entry.proc_name) d.proc_name = entry.proc_name
      if (entry.proc_setting) d.proc_setting = entry.proc_setting
      if (entry.proc_supervision) d.proc_supervision = entry.proc_supervision
      break
    case 'reflection':
      if (entry.refl_type) d.refl_type = entry.refl_type
      break
  }
  return d
}

export default function SaveTemplateButton({ entry }: Props) {
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(entry.title)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        category: entry.category,
        field_defaults: buildFieldDefaults(entry),
        guidance_prompts: {},
      }),
    })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      addToast('Template saved', 'success')
    } else {
      const j = await res.json()
      addToast(j.error ?? 'Failed to save template', 'error')
    }
  }

  return (
    <>
      <button
        onClick={() => { setName(entry.title); setOpen(true) }}
        className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[rgba(245,245,242,0.6)] border border-white/[0.08] rounded-lg hover:text-[#F5F5F2] hover:border-white/[0.15] transition-colors"
        title="Save as template"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
        </svg>
        Template
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#F5F5F2]">Save as template</h2>
              <button onClick={() => setOpen(false)} className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-[rgba(245,245,242,0.4)] mb-4">
              This will save the category and key field values as a personal template you can reuse when creating new entries.
            </p>
            <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Template name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              maxLength={100}
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] rounded-xl py-2.5 text-sm transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-[2] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-xl py-2.5 text-sm transition-colors"
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
