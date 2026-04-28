import Link from 'next/link'
import HorusImportWizard from '@/components/import/horus-import-wizard'

export default function ImportPage() {
  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Import from Horus</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-0.5">
            Import supervised learning events from your NHS Horus e-portfolio
          </p>
        </div>
      </div>

      <HorusImportWizard />
    </div>
  )
}
