import Link from 'next/link'
import CompetencyThemePicker from '@/components/portfolio/competency-theme-picker'

export default function ThemesSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Settings</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Competency themes</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Rename, colour, or remove your custom interview themes.</p>
      </div>
      <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6">
        <CompetencyThemePicker manageOnly />
      </section>
    </div>
  )
}
