'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RestoreVersionButton({
  revisionId,
  entryType,
  entryPath,
}: {
  revisionId: string
  entryType: 'portfolio' | 'case'
  entryPath: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function restore() {
    if (!confirm('Restore this version? The current version will be saved to history first.')) return
    setLoading(true)
    const res = await fetch('/api/history/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revisionId, entryType }),
    })
    setLoading(false)
    if (res.ok) {
      router.push(entryPath)
      router.refresh()
    } else {
      const json = await res.json()
      alert(json.error ?? 'Could not restore this version.')
    }
  }

  return (
    <button
      onClick={restore}
      disabled={loading}
      className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-[rgba(245,245,242,0.65)] transition-colors hover:border-white/[0.16] hover:text-[#F5F5F2] disabled:opacity-50"
    >
      {loading ? 'Restoring...' : 'Restore'}
    </button>
  )
}

