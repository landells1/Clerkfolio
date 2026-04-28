'use client'

import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, CATEGORY_COLOURS, type Category } from '@/lib/types/portfolio'

type SharedEntry = {
  id: string
  title: string
  date: string
  category: Category
  specialty_tags: string[] | null
  interview_themes: string[] | null
  notes: string | null
}

type SharePayload = {
  ownerName: string
  scope: 'specialty' | 'theme' | 'full'
  specialtyKey: string | null
  themeSlug: string | null
  expiresAt: string
  entries: SharedEntry[]
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function scopeLabel(payload: SharePayload) {
  if (payload.scope === 'full') return 'Full portfolio'
  if (payload.scope === 'theme') return `Theme: ${payload.themeSlug}`
  return `Specialty: ${payload.specialtyKey}`
}

export default function PublicShareClient({ token }: { token: string }) {
  const [pin, setPin] = useState('')
  const [payload, setPayload] = useState<SharePayload | null>(null)
  const [pinRequired, setPinRequired] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(nextPin = '') {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/share/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, pin: nextPin }),
    })
    const json = await res.json()
    setLoading(false)

    if (res.status === 401 && json.pinRequired) {
      setPinRequired(true)
      return
    }
    if (!res.ok) {
      setError(json.error ?? 'This share link is unavailable.')
      return
    }
    setPayload(json as SharePayload)
    setPinRequired(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const grouped = useMemo(() => {
    const result = new Map<Category, SharedEntry[]>()
    payload?.entries.forEach(entry => {
      result.set(entry.category, [...(result.get(entry.category) ?? []), entry])
    })
    return result
  }, [payload])

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#F5F5F2]">
      <header className="border-b border-white/[0.06] px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1B6FD9] text-sm font-bold text-[#0B0B0C]">C</div>
            <span className="text-sm font-semibold tracking-tight">Clinidex</span>
          </div>
          {payload && (
            <p className="text-xs text-[rgba(245,245,242,0.35)]">
              Read-only · expires {formatDate(payload.expiresAt)}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        {loading && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-8 text-sm text-[rgba(245,245,242,0.5)]">
            Loading shared portfolio...
          </div>
        )}

        {!loading && pinRequired && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              load(pin)
            }}
            className="mx-auto mt-16 max-w-sm rounded-2xl border border-white/[0.08] bg-[#141416] p-6"
          >
            <h1 className="text-lg font-semibold tracking-tight">PIN required</h1>
            <p className="mt-2 text-sm text-[rgba(245,245,242,0.45)]">Enter the PIN provided by the portfolio owner.</p>
            <input
              value={pin}
              onChange={e => setPin(e.target.value)}
              inputMode="numeric"
              autoFocus
              className="mt-5 w-full rounded-xl border border-white/[0.08] bg-[#0B0B0C] px-4 py-3 text-center text-lg tracking-[0.35em] text-[#F5F5F2] outline-none focus:border-[#1B6FD9]"
              placeholder="0000"
            />
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button className="mt-5 w-full rounded-xl bg-[#1B6FD9] px-4 py-3 text-sm font-semibold text-[#0B0B0C] transition-colors hover:bg-[#155BB0]">
              Unlock
            </button>
          </form>
        )}

        {!loading && error && !pinRequired && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">{error}</div>
        )}

        {payload && (
          <>
            <section className="mb-8">
              <p className="text-xs font-medium uppercase tracking-wider text-[rgba(245,245,242,0.35)]">{scopeLabel(payload)}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{payload.ownerName}</h1>
              <p className="mt-2 text-sm text-[rgba(245,245,242,0.45)]">
                {payload.entries.length} shared portfolio {payload.entries.length === 1 ? 'entry' : 'entries'}
              </p>
            </section>

            {payload.entries.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-8 text-sm text-[rgba(245,245,242,0.45)]">
                No entries match this share scope.
              </div>
            ) : (
              <div className="space-y-6">
                {CATEGORIES.map(category => {
                  const entries = grouped.get(category.value)
                  if (!entries?.length) return null
                  const colours = CATEGORY_COLOURS[category.value]
                  return (
                    <section key={category.value}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${colours.badge}`}>{category.short}</span>
                        <h2 className="text-sm font-medium text-[rgba(245,245,242,0.6)]">{category.label}</h2>
                      </div>
                      <div className="divide-y divide-white/[0.04] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141416]">
                        {entries.map(entry => (
                          <article key={entry.id} className="p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                              <h3 className="text-sm font-medium text-[#F5F5F2]">{entry.title}</h3>
                              <span className="text-xs text-[rgba(245,245,242,0.35)]">{formatDate(entry.date)}</span>
                            </div>
                            {entry.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[rgba(245,245,242,0.55)]">{entry.notes}</p>}
                          </article>
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

