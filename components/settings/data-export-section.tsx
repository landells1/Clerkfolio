'use client'

export function DataExportSection({
  exportLoading,
  onExport,
}: {
  exportLoading: boolean
  onExport: () => void
}) {
  return (
    <section className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 mb-6">
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Data</h2>
      <button onClick={onExport} disabled={exportLoading} className="min-h-[44px] bg-white/[0.05] hover:bg-white/[0.08] disabled:opacity-50 text-[var(--text-primary)] font-medium rounded-lg px-5 py-2.5 text-sm">
        {exportLoading ? 'Preparing backup...' : 'Download personal data backup'}
      </button>
      <p className="mt-4 text-xs text-[var(--text-secondary)]">Data encrypted at rest by Supabase, eu-west-2.</p>
    </section>
  )
}
