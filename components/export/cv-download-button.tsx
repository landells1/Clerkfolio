'use client'

import { useState } from 'react'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'

export default function CvDownloadButton({ template, isPro, canExportPdf }: { template: string; isPro: boolean; canExportPdf: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const allowanceUsed = !isPro && !canExportPdf

  async function download() {
    setLoading(true)
    setError(null)
    const { ok, status, response } = await apiFetch(`/api/export/cv?template=${encodeURIComponent(template)}`, { method: 'POST', parse: 'none' })
    setLoading(false)

    if (!ok || !response) {
      if (status === null) { setError(NETWORK_ERROR_MESSAGE); return }
      const body = await response?.json().catch(() => ({})) ?? {}
      setError(body.error === 'limit_reached'
        ? 'Your included PDF has been used. CV, Application PDF and Year in review downloads share this allowance.'
        : body.error ?? 'Could not generate your CV PDF.')
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clerkfolio-cv-${template}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="inline-flex flex-col gap-2">
      <button
        type="button"
        onClick={download}
        disabled={loading || allowanceUsed}
        title={allowanceUsed ? 'Your included PDF allowance has been used' : undefined}
        className="rounded-xl bg-[var(--bg-inverse)] px-4 py-2 text-sm font-semibold text-[var(--text-inverse)] disabled:opacity-50"
      >
        {loading ? 'Preparing PDF...' : allowanceUsed ? 'PDF allowance used' : 'Download PDF'}
      </button>
      {error && (
        <div className="max-w-xs rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-[var(--warning)]">
          {error}
        </div>
      )}
    </div>
  )
}
