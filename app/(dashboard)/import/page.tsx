import Link from 'next/link'
import CsvImportFlow from '@/components/import/csv-import-flow'

export default function ImportPage() {
  return (
    <div className="p-8 max-w-5xl">
      <nav className="flex items-center gap-1.5 text-xs text-[rgba(245,245,242,0.4)] mb-6">
        <Link href="/dashboard" className="hover:text-[#F5F5F2] transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-[rgba(245,245,242,0.7)]">Import</span>
      </nav>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Import</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">Import portfolio entries, cases, or operative logbook rows from a CSV file.</p>
      </div>
      <CsvImportFlow />
    </div>
  )
}
