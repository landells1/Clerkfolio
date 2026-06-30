'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CATEGORIES, CATEGORY_COLOURS, type Category } from '@/lib/types/portfolio'
import { formatCompetencyTheme } from '@/lib/types/portfolio-labels'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { PrintHeader } from '@/components/print-header'

type SharedEntry = {
  id: string
  title: string
  date: string
  category: Category
  specialty_tags: string[] | null
  specialty_tag_labels?: string[] | null
  interview_themes: string[] | null
  notes?: string | null
  refl_free_text?: string | null
}

type SharePayload = {
  ownerName: string
  scope: 'specialty' | 'theme' | 'full'
  specialtyKey: string | null
  specialtyLabel: string | null
  themeSlug: string | null
  expiresAt: string
  watermark?: string | null
  entries: SharedEntry[]
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function scopeLabel(payload: SharePayload) {
  if (payload.scope === 'full') return 'Full portfolio (entries only)'
  if (payload.scope === 'theme') return `Theme: ${payload.themeSlug ? formatCompetencyTheme(payload.themeSlug) : 'unknown'}`
  return `Specialty: ${payload.specialtyLabel ?? formatSpecialtyLabel(payload.specialtyKey)}`
}

function excerpt(value: string | null | undefined) {
  if (!value) return ''
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned.length > 260 ? `${cleaned.slice(0, 260)}...` : cleaned
}

function pinSessionKey(token: string) {
  return `clerkfolio-share-pin:${token}`
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
    let res: Response
    try {
      res = await fetch('/api/share/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin: nextPin }),
      })
    } catch {
      setLoading(false)
      setError('Could not reach Clerkfolio. Check your connection and try again.')
      return
    }
    const json = await res.json().catch(() => ({} as { error?: string; pinRequired?: boolean }))
    setLoading(false)

    if (res.status === 401 && json.pinRequired) {
      setPinRequired(true)
      return
    }
    if (!res.ok) {
      if (res.status === 403 && nextPin) {
        sessionStorage.removeItem(pinSessionKey(token))
      }
      if (res.status === 403 || (res.status === 401 && json.pinRequired)) {
        setPinRequired(true)
      }
      const fallback = res.status === 410
        ? 'This share link has expired.'
        : res.status === 429
          ? 'Too many requests right now. Try again in a few minutes.'
          : 'This share link is no longer available - it may have been revoked or never existed.'
      setError(json.error ?? fallback)
      return
    }
    if (nextPin) sessionStorage.setItem(pinSessionKey(token), nextPin)
    setPayload(json as SharePayload)
    setPinRequired(false)
  }

  useEffect(() => {
    load(sessionStorage.getItem(pinSessionKey(token)) ?? '')
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
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <header className="border-b border-white/[0.06] px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-sm font-bold text-white">C</div>
            <span className="text-sm font-semibold tracking-tight">Clerkfolio</span>
          </div>
          {payload && (
            <p className="text-xs text-[var(--text-secondary)]">
              Read-only - expires {formatDate(payload.expiresAt)}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        {loading && (
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-8 text-sm text-[var(--text-secondary)]">
            Loading shared portfolio...
          </div>
        )}

        {!loading && pinRequired && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              load(pin)
            }}
            className="mx-auto mt-16 max-w-sm rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6"
          >
            <h1 className="text-lg font-semibold tracking-tight">PIN required</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Enter the PIN provided by the portfolio owner.</p>
            <label htmlFor="share-pin" className="sr-only">PIN</label>
            <input
              id="share-pin"
              value={pin}
              onChange={e => setPin(e.target.value)}
              inputMode="numeric"
              autoFocus
              className="mt-5 w-full rounded-xl border border-white/[0.08] bg-[var(--bg-canvas)] px-4 py-3 text-center text-lg tracking-[0.35em] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              placeholder="0000"
            />
            {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
            <button className="mt-5 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]">
              Unlock
            </button>
          </form>
        )}

        {!loading && error && !pinRequired && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-sm text-[var(--danger)]">{error}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => history.back()} className="min-h-[40px] rounded-lg border border-red-200/20 px-4 text-sm font-medium text-white hover:bg-[var(--bg-overlay-soft)]">
                Back
              </button>
              <Link href="/login" className="inline-flex min-h-[40px] items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">
                Log in to Clerkfolio
              </Link>
            </div>
          </div>
        )}

        {payload && (
          <>
            <PrintHeader userName={payload.ownerName} />
            <section className="mb-8">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">{scopeLabel(payload)}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{payload.ownerName}</h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {payload.entries.length} shared portfolio {payload.entries.length === 1 ? 'entry' : 'entries'}
              </p>
              {payload.scope === 'full' && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">Portfolio entries only. Cases are never shared.</p>
              )}
              {payload.watermark && (
                <p className="mt-3 inline-flex rounded border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-xs text-[var(--text-secondary)]">
                  {payload.watermark}
                </p>
              )}
            </section>

            {payload.entries.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-8 text-sm text-[var(--text-muted)]">
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
                        <h2 className="text-sm font-medium text-[var(--text-secondary)]">{category.label}</h2>
                      </div>
                      <div className="divide-y divide-white/[0.04] overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)]">
                        {entries.map(entry => (
                          <article key={entry.id} className="p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                              <h3 className="text-sm font-medium text-[var(--text-primary)]">{entry.title}</h3>
                              <span className="text-xs text-[var(--text-secondary)]">{formatDate(entry.date)}</span>
                            </div>
                            {entry.specialty_tag_labels && entry.specialty_tag_labels.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {entry.specialty_tag_labels.map(label => (
                                  <span key={label} className="rounded bg-[#1B6FD9]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent-text)]">
                                    {label}
                                  </span>
                                ))}
                              </div>
                            )}
                            {excerpt(entry.notes) && (
                              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{excerpt(entry.notes)}</p>
                            )}
                            {excerpt(entry.refl_free_text) && (
                              <p className="mt-3 border-l border-[#1B6FD9]/40 pl-3 text-sm leading-relaxed text-[var(--text-secondary)]">{excerpt(entry.refl_free_text)}</p>
                            )}
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
