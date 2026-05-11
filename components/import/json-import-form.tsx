'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast-provider'

type ImportResult = {
  portfolio_entries: number
  cases: number
  deadlines: number
  goals: number
  skipped: number
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
    const res = await fetch('/api/import/json', { method: 'POST', body: form })
    const body = await res.json()
    setLoading(false)
    if (!res.ok) {
      addToast(body.error ?? 'Import failed', 'error')
      return
    }
    setResult(body)
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
    </>
  )
}
