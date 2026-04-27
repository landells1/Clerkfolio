import Link from 'next/link'

export default function ImportPage() {
  return (
    <div className="p-8 max-w-2xl">
      <nav className="flex items-center gap-1.5 text-xs text-[rgba(245,245,242,0.4)] mb-6">
        <Link href="/dashboard" className="hover:text-[#F5F5F2] transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-[rgba(245,245,242,0.7)]">Import</span>
      </nav>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Import</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">CSV import is paused while we tighten duplicate detection and source formatting.</p>
      </div>
      <div className="rounded-lg border border-white/[0.07] bg-[#141416] p-6">
        <h2 className="mb-2 text-sm font-medium text-[#F5F5F2]">Import is not available yet</h2>
        <p className="text-sm leading-relaxed text-[rgba(245,245,242,0.45)]">
          This workflow needs stronger duplicate checks and clearer templates before it is suitable for live use.
          For now, add entries manually from Portfolio, Cases, or Logbook.
        </p>
      </div>
    </div>
  )
}
