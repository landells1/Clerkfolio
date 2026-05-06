import Link from 'next/link'
import CompetencyThemePicker from '@/components/portfolio/competency-theme-picker'

export default function ThemesSettingsPage() {
  return (
    <div className="max-w-3xl p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2]">Settings</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#F5F5F2]">Competency themes</h1>
        <p className="mt-1 text-sm text-[rgba(245,245,242,0.45)]">Rename, colour, or remove your custom interview themes.</p>
      </div>
      <section className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6">
        <CompetencyThemePicker manageOnly />
      </section>
    </div>
  )
}
