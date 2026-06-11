'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast-provider'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'

type ImportResult = {
  portfolio_entries: number
  cases: number
  deadlines: number
  goals: number
  skipped: number
  errors: { table: string; row: number; error: string }[]
}

export default function JsonImportForm() {
  const { addToast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setResult(null)
    const form = new FormData()
    form.set('file', file)
    const res = await apiFetch<ImportResult & { error?: string }>('/api/import/json', { method: 'POST', body: form })
    setLoading(false)
    if (!res.ok || !res.data) {
      addToast(res.status === null ? NETWORK_ERROR_MESSAGE : res.data?.error ?? 'Import failed', 'error')
      return
    }
    setResult(res.data)
    addToast('Backup import complete', 'success')
  }

  return (
    <>
      <form onSubmit={submit} className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6">
        <input
          type="file"
          accept=".json,.zip,application/json,application/zip"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-[rgba(245,245,242,0.65)] file:min-h-[44px] file:mr-4 file:rounded-lg file:border-0 file:bg-[#1B6FD9] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#0B0B0C]"
        />
        <button disabled={!file || loading} className="mt-5 min-h-[44px] rounded-xl bg-[#1B6FD9] px-5 text-sm font-semibold text-[#0B0B0C] disabled:opacity-50">
          {loading ? 'Importing...' : 'Import backup'}
        </button>
      </form>

      {result && (
        <section className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-100">
          Imported {result.portfolio_entries} portfolio entries, {result.cases} cases, {result.deadlines} deadlines, and {result.goals} goals. Skipped {result.skipped} duplicates.
        </section>
      )}

      {result && result.errors?.length > 0 && (
        <section className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-amber-100">
          <p className="font-medium">{result.errors.length} row{result.errors.length === 1 ? ' was' : 's were'} not imported:</p>
          <ul className="mt-2 space-y-1 text-amber-100/80">
            {result.errors.slice(0, 10).map((err, i) => (
              <li key={i}>{err.table.replace(/_/g, ' ')} row {err.row}: {err.error}</li>
            ))}
            {result.errors.length > 10 && <li>…and {result.errors.length - 10} more.</li>}
          </ul>
        </section>
      )}
    </>
  )
}
