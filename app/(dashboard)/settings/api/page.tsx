'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast-provider'

type ApiKey = {
  id: string
  name: string
  prefix: string
  scopes: string[] | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

const ENDPOINTS = [
  '/api/v1/me/cases',
  '/api/v1/me/portfolio',
  '/api/v1/me/specialties',
  '/api/v1/me/deadlines',
  '/api/v1/me/goals',
]

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ApiSettingsPage() {
  const { addToast } = useToast()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [name, setName] = useState('Portfolio reader')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadKeys() {
    setLoading(true)
    const res = await fetch('/api/settings/api-keys')
    if (res.ok) {
      setKeys(await res.json())
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Could not load API keys.')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadKeys()
  }, [])

  async function createKey(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setNewKey(null)

    const res = await fetch('/api/settings/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const body = await res.json()
    setCreating(false)

    if (!res.ok) {
      setError(body.error ?? 'Could not create API key.')
      return
    }

    setNewKey(body.key)
    setKeys(current => [body.record as ApiKey, ...current])
    addToast('API key created', 'success')
  }

  async function revokeKey(id: string) {
    const key = keys.find(row => row.id === id)
    const keyName = key?.name ?? 'this API key'
    if (!confirm(`Are you sure you want to revoke ${keyName}? Callers using it will start receiving 401 responses immediately.`)) return

    setRevoking(id)
    const res = await fetch(`/api/settings/api-keys?id=${id}`, { method: 'DELETE' })
    const body = await res.json().catch(() => ({}))
    setRevoking(null)

    if (!res.ok) {
      addToast(body.error ?? 'Could not revoke API key', 'error')
      return
    }

    setKeys(current => current.map(key => key.id === id ? { ...key, revoked_at: body.revoked_at } : key))
    if (key?.prefix && newKey?.startsWith(key.prefix)) setNewKey(null)
    addToast('API key revoked', 'success')
  }

  async function copyNewKey() {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey)
    addToast('API key copied', 'success')
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/settings" className="text-[rgba(245,245,242,0.4)] transition-colors hover:text-[#F5F5F2]">
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#F5F5F2]">API access</h1>
          <p className="mt-0.5 text-sm text-[rgba(245,245,242,0.45)]">
            Bearer keys for developers integrating Clerkfolio with other tools (e.g. a personal
            dashboard or research project). All endpoints are read-only and return JSON. Most users
            won&apos;t need this.
          </p>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-white/[0.08] bg-[#141416] p-6">
        <form onSubmit={createKey} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="min-h-[44px] flex-1 rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3.5 py-2.5 text-sm text-[#F5F5F2] outline-none focus:border-[#1B6FD9]"
            placeholder="Key name"
          />
          <button disabled={creating} className="min-h-[44px] rounded-xl bg-[#1B6FD9] px-5 text-sm font-semibold text-[#0B0B0C] disabled:opacity-50">
            {creating ? 'Creating...' : 'Generate key'}
          </button>
        </form>

        {newKey && (
          <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-amber-200">Copy this key now</p>
              <button onClick={copyNewKey} className="rounded-lg border border-amber-300/20 px-3 py-1.5 text-xs font-medium text-amber-100">
                Copy
              </button>
            </div>
            <code className="block overflow-x-auto rounded-lg bg-[#0B0B0C] px-3 py-2 text-xs text-[#F5F5F2]">{newKey}</code>
          </div>
        )}
      </section>

      <section className="mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141416]">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-base font-semibold text-[#F5F5F2]">Keys</h2>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-[rgba(245,245,242,0.45)]">Loading keys...</p>
        ) : keys.length === 0 ? (
          <div className="px-5 py-6">
            <p className="text-sm text-[#F5F5F2]">No API keys yet</p>
            <p className="mt-1 text-xs text-[rgba(245,245,242,0.55)]">
              Generate a key above to access your portfolio over HTTPS. Keys are read-only and can be revoked any time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {keys.map(key => {
              const revoked = Boolean(key.revoked_at)
              return (
                <article key={key.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[#F5F5F2]">{key.name}</p>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${revoked ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                        {revoked ? 'Revoked' : 'Active'}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-[rgba(245,245,242,0.4)]">{key.prefix}... - last used {formatDate(key.last_used_at)}</p>
                  </div>
                  {!revoked && (
                    <button
                      onClick={() => revokeKey(key.id)}
                      disabled={revoking === key.id}
                      className="min-h-[36px] rounded-lg border border-red-500/20 px-3 text-xs font-medium text-red-300 disabled:opacity-50"
                    >
                      {revoking === key.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6">
        <h2 className="mb-3 text-base font-semibold text-[#F5F5F2]">Endpoints</h2>
        <div className="space-y-2">
          {ENDPOINTS.map(endpoint => (
            <code key={endpoint} className="block rounded-lg border border-white/[0.06] bg-[#0B0B0C] px-3 py-2 text-xs text-[rgba(245,245,242,0.7)]">
              GET {endpoint}
            </code>
          ))}
        </div>
      </section>

      {error && <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
    </div>
  )
}
