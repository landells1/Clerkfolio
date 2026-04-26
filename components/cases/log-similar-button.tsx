'use client'
import { useQuickAdd } from '@/app/(dashboard)/providers'

export default function LogSimilarButton({ domains, tags }: { domains?: string[]; tags?: string[] }) {
  const { openQuickAdd } = useQuickAdd()
  return (
    <button
      onClick={() => openQuickAdd({ type: 'case', domains: domains ?? [], tags: tags ?? [] })}
      className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[rgba(245,245,242,0.6)] border border-white/[0.08] rounded-lg hover:text-[#F5F5F2] hover:border-white/[0.15] transition-colors"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Log similar
    </button>
  )
}
