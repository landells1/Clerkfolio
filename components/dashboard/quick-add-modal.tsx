'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CLINICAL_DOMAINS } from '@/lib/types/cases'
import SpecialtyTagSelect from '@/components/portfolio/specialty-tag-select'

const INPUT = 'w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1D9E75] transition-colors'
const LABEL = 'block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide'

export default function QuickAddModal({
  onClose,
  userInterests = [],
}: {
  onClose: () => void
  userInterests?: string[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [domain, setDomain] = useState('')
  const [tags, setTags] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('cases').insert({
      user_id: user.id,
      title: title.trim(),
      date,
      clinical_domain: domain.trim() || null,
      specialty_tags: tags,
      notes: null,
    })

    if (error) { setError(error.message); setSaving(false); return }

    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F2]">Quick log a case</h2>
            <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5">Anonymised entries only</p>
          </div>
          <button
            onClick={onClose}
            className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL}>Case title <span className="text-red-400">*</span></label>
            <input
              autoFocus
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={INPUT}
              placeholder="Brief description — no patient identifiers"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Clinical domain</label>
              <input
                type="text"
                list="quick-add-domains"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                className={INPUT}
                placeholder="e.g. Cardiology"
              />
              <datalist id="quick-add-domains">
                {CLINICAL_DOMAINS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label className={LABEL}>Specialty tags</label>
            <SpecialtyTagSelect value={tags} onChange={setTags} userInterests={userInterests} />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-xl py-2.5 text-sm transition-colors"
            >
              {saving ? 'Saving…' : 'Save case →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
