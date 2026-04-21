export default function ExportPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Export</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
          Build a filtered PDF for any specialty application.
        </p>
      </div>
      <div className="flex items-center justify-center h-64 border border-dashed border-white/[0.08] rounded-2xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-lg px-4 py-2 mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-[#1D9E75] text-xs font-medium font-mono">PRO FEATURE</span>
          </div>
          <p className="text-[rgba(245,245,242,0.35)] text-sm">PDF export — coming in Stage 6</p>
        </div>
      </div>
    </div>
  )
}
