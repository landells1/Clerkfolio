'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api-fetch'

type ShareLinkData = { id: string; token: string; expires_at: string }

export function ShareModal({ specialtyKey, onClose }: { specialtyKey: string; onClose: () => void }) {
  const [link, setLink] = useState<ShareLinkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [copied, setCopied] = useState(false)

  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://clerkfolio.co.uk'

  useEffect(() => {
    async function load() {
      const { ok, data } = await apiFetch<(ShareLinkData & { specialty_key: string })[]>('/api/share')
      if (ok && data) {
        const match = data.find(l => l.specialty_key === specialtyKey)
        setLink(match ?? null)
      }
      setLoading(false)
    }
    load()
  }, [specialtyKey])

  async function handleGenerate() {
    setGenerating(true)
    const { ok, data } = await apiFetch<ShareLinkData>('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specialty_key: specialtyKey }),
    })
    if (ok && data) {
      setLink(data)
    }
    setGenerating(false)
  }

  async function handleRevoke() {
    if (!link) return
    if (!confirm('Revoke this link? Anyone using it will lose access immediately.')) return
    setRevoking(true)
    const { ok } = await apiFetch(`/api/share?id=${link.id}`, { method: 'DELETE' })
    if (ok) setLink(null)
    setRevoking(false)
  }

  function handleCopy() {
    if (!link) return
    navigator.clipboard.writeText(`${BASE_URL}/share/${link.token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const url = link ? `${BASE_URL}/share/${link.token}` : null
  const expiresFormatted = link
    ? new Date(link.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-surface)] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Share read-only link</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Anyone with the link can view your evidence - no account needed.
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full motion-safe:animate-spin" />
          </div>
        ) : link ? (
          <div className="space-y-4">
            {/* URL display */}
            <div className="bg-[var(--bg-canvas)] border border-white/[0.08] rounded-xl p-3">
              <p className="text-xs font-mono text-[var(--text-secondary)] truncate">{url}</p>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Expires {expiresFormatted} · Read-only</p>
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {copied
                    ? <polyline points="20 6 9 17 4 12" />
                    : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>
                  }
                </svg>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <a
                href={url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Preview
              </a>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50"
              >
                {revoking ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
            {/* Manage all links */}
            <p className="text-xs text-[var(--text-secondary)] text-center">
              Manage all shared links in{' '}
              <a href="/export?tab=share" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline transition-colors">
                Import &amp; export → Share
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[var(--bg-canvas)] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="text-xs text-[var(--text-muted)]">Link expires after 30 days</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="text-xs text-[var(--text-muted)]">Read-only - no login required</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
                <span className="text-xs text-[var(--text-muted)]">Revoke at any time</span>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 text-[var(--button-primary-text)] font-semibold text-sm rounded-xl transition-colors"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--bg-canvas)] border-t-[var(--bg-canvas)] rounded-full motion-safe:animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  Generate link
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
