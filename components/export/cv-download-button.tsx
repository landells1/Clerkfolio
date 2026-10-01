'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'
import { saveBlob } from '@/lib/download-blob'

export default function CvDownloadButton({ template, isPro, canExportPdf }: { template: string; isPro: boolean; canExportPdf: boolean }) {
  const router = useRouter()
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
        ? 'Your included PDF allowance has been used. CV, Application PDF and Year in review downloads share this allowance.'
        : body.error ?? 'Could not generate your CV PDF.')
      return
    }

    saveBlob(await response.blob(), `clerkfolio-cv-${template}.pdf`)
    // Re-read the server-computed allowance so the sibling PDF/DOCX button
    // reflects the export this download just used.
    router.refresh()
  }

  return (
    <div className="inline-flex flex-col gap-2">
      <button
        type="button"
        onClick={download}
        disabled={loading || allowanceUsed}
        title={allowanceUsed ? 'Your included PDF allowance has been used' : undefined}
        className="rounded-xl bg-[var(--button-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50"
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
