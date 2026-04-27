'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CaseCard from './case-card'
import type { Case } from '@/lib/types/cases'
import SpecialtyTagSelect from '@/components/portfolio/specialty-tag-select'
import { useToast } from '@/components/ui/toast-provider'

type Props = {
  cases: Case[]
  userInterests: string[]
}

export default function CasesListClient({ cases, userInterests }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()

  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [bulkTags, setBulkTags] = useState<string[]>([])
  const [applyingTag, setApplyingTag] = useState(false)
  const [trashing, setTrashing] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setSelectMode(false); setSelected(new Set()) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function toggleCase(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() { setSelected(new Set(cases.map(c => c.id))) }
  function deselectAll() { setSelected(new Set()) }

  async function handleBulkTrash() {
    if (!confirm(`Move ${selected.size} case${selected.size === 1 ? '' : 's'} to trash?`)) return
    setTrashing(true)
    const { error } = await supabase
      .from('cases')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', Array.from(selected))
    setTrashing(false)
    if (error) { addToast('Failed to trash cases', 'error'); return }
    addToast(`${selected.size} case${selected.size === 1 ? '' : 's'} moved to trash`, 'success')
    setSelected(new Set()); setSelectMode(false)
    router.refresh()
  }

  async function handleBulkAddTag() {
    if (bulkTags.length === 0) return
    setApplyingTag(true)
    const { data: rows } = await supabase
      .from('cases')
      .select('id, specialty_tags')
      .in('id', Array.from(selected))

    const errors: string[] = []
    for (const r of (rows ?? [])) {
      const merged = Array.from(new Set([...(r.specialty_tags ?? []), ...bulkTags]))
      const { error } = await supabase.from('cases').update({ specialty_tags: merged }).eq('id', r.id)
      if (error) errors.push(r.id)
    }
    setApplyingTag(false)
    if (errors.length > 0) {
      addToast(`Applied tags but ${errors.length} cases failed`, 'error')
    } else {
      addToast(`Tags added to ${selected.size} case${selected.size === 1 ? '' : 's'}`, 'success')
    }
    setTagModalOpen(false); setBulkTags([])
    setSelected(new Set()); setSelectMode(false)
    router.refresh()
  }

  function handleAddToExport() {
    sessionStorage.setItem('clinidex-export-preselect', JSON.stringify(Array.from(selected)))
    router.push('/export')
  }

  return (
    <>
      {/* Select mode toggle */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => { setSelectMode(v => !v); setSelected(new Set()) }}
          className={`text-xs font-medium transition-colors ${
            selectMode
              ? 'text-[#1B6FD9] hover:text-[#3884DD]'
              : 'text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2]'
          }`}
        >
          {selectMode ? 'Cancel selection' : 'Select'}
        </button>
        {selectMode && cases.length > 0 && (
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-xs text-[#1B6FD9] hover:text-[#3884DD] transition-colors">Select all</button>
            <button onClick={deselectAll} className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">Deselect all</button>
            <span className="text-xs text-[rgba(245,245,242,0.35)]">{selected.size} selected</span>
          </div>
        )}
      </div>

      {/* Cases list */}
      <div className="grid grid-cols-1 gap-3">
        {cases.map(c => (
          <div key={c.id} className="relative group/row">
            {selectMode && (
              <div
                className="absolute left-0 top-0 bottom-0 flex items-center pl-3 z-10 cursor-pointer"
                onClick={() => toggleCase(c.id)}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                  selected.has(c.id) ? 'bg-[#1B6FD9] border-[#1B6FD9]' : 'border-white/[0.3] bg-[#141416] group-hover/row:border-white/[0.5]'
                }`}>
                  {selected.has(c.id) && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            )}
            <div
              className={selectMode ? 'pl-9 cursor-pointer' : ''}
              onClick={selectMode ? () => toggleCase(c.id) : undefined}
            >
              <CaseCard c={c} />
            </div>
          </div>
        ))}
      </div>

      {/* Floating action bar */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#1B1B1E] border border-white/[0.1] rounded-2xl px-4 py-3 shadow-2xl">
          <span className="text-xs font-medium text-[rgba(245,245,242,0.6)] mr-1">{selected.size} selected</span>
          <button
            onClick={() => { setBulkTags([]); setTagModalOpen(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[rgba(245,245,242,0.8)] bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors border border-white/[0.08]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            Add tag
          </button>
          <button
            onClick={handleAddToExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[rgba(245,245,242,0.8)] bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors border border-white/[0.08]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Add to export
          </button>
          <button
            onClick={handleBulkTrash}
            disabled={trashing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/15 rounded-lg transition-colors border border-red-500/20 disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
            </svg>
            {trashing ? 'Moving…' : 'Move to trash'}
          </button>
          <button
            onClick={() => { setSelected(new Set()); setSelectMode(false) }}
            className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors ml-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Add tag modal */}
      {tagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setTagModalOpen(false)}>
          <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#F5F5F2]">Add specialty tag</h2>
              <button onClick={() => setTagModalOpen(false)} className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-[rgba(245,245,242,0.4)] mb-3">
              Adding to {selected.size} case{selected.size === 1 ? '' : 's'}.
            </p>
            <SpecialtyTagSelect value={bulkTags} onChange={setBulkTags} userInterests={userInterests} trackedOnly />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setTagModalOpen(false)} className="flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] rounded-xl py-2.5 text-sm transition-colors">
                Cancel
              </button>
              <button
                onClick={handleBulkAddTag}
                disabled={bulkTags.length === 0 || applyingTag}
                className="flex-[2] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-xl py-2.5 text-sm transition-colors"
              >
                {applyingTag ? 'Applying…' : `Apply to ${selected.size} case${selected.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
