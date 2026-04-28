'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getSpecialtyConfig } from '@/lib/specialties'
import { useToast } from '@/components/ui/toast-provider'

type ShareLink = {
  id: string
  token: string
  specialty_key: string | null
  expires_at: string
  revoked: boolean
  created_at: string
}

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://clinidex.co.uk'

export default function SharedLinksPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/share')
      if (res.ok) {
        setLinks(await res.json())
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this link? Anyone using it will lose access immediately.')) return
    setRevoking(id)
    const res = await fetch(`/api/share?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setLinks(prev => prev.filter(l => l.id !== id))
      addToast('Link revoked', 'success')
    } else {
      addToast('Failed to revoke link', 'error')
    }
    setRevoking(null)
  }

  function handleCopy(token: string) {
    const url = `${BASE_URL}/share/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/settings" className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Shared links</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-0.5">
            Read-only links you&apos;ve shared. Each link expires after 30 days.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-[#1B6FD9] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <p className="text-sm text-[rgba(245,245,242,0.5)] mb-1">No active shared links</p>
          <p className="text-xs text-[rgba(245,245,242,0.3)] max-w-xs">
            Open a specialty tracker and click &quot;Share&quot; to generate a read-only link for your evidence view.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => {
            const config = link.specialty_key ? getSpecialtyConfig(link.specialty_key) : null
            const expiresDate = new Date(link.expires_at)
            const isExpired = expiresDate < new Date()
            const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / 86400000)
            const url = `${BASE_URL}/share/${link.token}`

            return (
              <div key={link.id} className="bg-[#141416] border border-white/[0.06] rounded-xl px-4 py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#F5F5F2]">
                      {config ? `${config.name} ${config.cycleYear}` : link.specialty_key ?? 'Full portfolio'}
                    </p>
                    <p className="text-xs text-[rgba(245,245,242,0.35)] font-mono mt-0.5 truncate">{url}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isExpired ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Expired</span>
                    ) : daysLeft <= 7 ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">{daysLeft}d left</span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/[0.06] text-[rgba(245,245,242,0.45)] border border-white/[0.08]">{daysLeft}d left</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(link.token)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[rgba(245,245,242,0.7)] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {copied === link.token
                        ? <polyline points="20 6 9 17 4 12" />
                        : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>
                      }
                    </svg>
                    {copied === link.token ? 'Copied!' : 'Copy link'}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[rgba(245,245,242,0.7)] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Preview
                  </a>
                  <button
                    onClick={() => handleRevoke(link.id)}
                    disabled={revoking === link.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50 ml-auto"
                  >
                    {revoking === link.id ? 'Revoking…' : 'Revoke'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
