import Link from 'next/link'
import { CHANGELOG } from '@/lib/changelog'
import { ChangelogEntryList } from '@/components/dashboard/changelog-entry-list'

export const metadata = {
  title: "What's new - Clerkfolio",
}

// Persistent history of every changelog entry, rendered from the same
// lib/changelog.ts source of truth as the one-time ChangelogModal. The modal
// tracks seen/unseen via profiles.changelog_seen_at; this page always shows
// the full list regardless of that state.
export default function WhatsNewPage() {
  const entries = [...CHANGELOG].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <Link href="/help" className="text-sm text-[var(--accent-text)] hover:underline">
          &larr; Help &amp; glossary
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)] tracking-tight">What&apos;s new</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Everything shipped to Clerkfolio, newest first.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No updates yet.</p>
      ) : (
        <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6">
          <ChangelogEntryList entries={entries} />
        </section>
      )}
    </div>
  )
}
