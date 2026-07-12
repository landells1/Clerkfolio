'use client'

import { useState } from 'react'
import Link from 'next/link'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'

// Mirrors CvDownloadButton - same PDF allowance gate (canExportPdf), same
// apiFetch/blob-download pattern, .docx container instead of .pdf.
export default function DocxDownloadButton({ template, isPro, canExportPdf }: { template: string; isPro: boolean; canExportPdf: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const allowanceUsed = !isPro && !canExportPdf

  async function download() {
    setLoading(true)
    setError(null)
    const { ok, status, response } = await apiFetch(`/api/export/docx?template=${encodeURIComponent(template)}`, { method: 'POST', parse: 'none' })
    setLoading(false)

    if (!ok || !response) {
      if (status === null) { setError(NETWORK_ERROR_MESSAGE); return }
      const body = await response?.json().catch(() => ({})) ?? {}
      setError(body.error === 'limit_reached'
        ? 'Your included PDF has been used. CV, Application PDF and Year in review downloads share this allowance.'
        : body.error ?? 'Could not generate your CV DOCX.')
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clerkfolio-cv-${template}.docx`
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
        className="rounded-xl border border-subtle bg-surface-1 px-4 py-2 text-sm font-semibold text-fg disabled:opacity-50"
      >
        {loading ? 'Preparing DOCX...' : allowanceUsed ? 'PDF allowance used' : 'Download Word (.docx)'}
      </button>
      {allowanceUsed && (
        <p className="max-w-xs text-xs text-[var(--text-secondary)]">
          <Link href="/upgrade" className="text-[var(--accent-text)] underline">Upgrade for £9.99/yr</Link> for unlimited PDFs. Or <Link href="/settings/referrals" className="text-[var(--accent-text)] underline">invite a colleague</Link>. Each successful referral adds one more free PDF export.
        </p>
      )}
      {error && (
        <div className="max-w-xs rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-[var(--warning)]">
          {error}
        </div>
      )}
    </div>
  )
}
