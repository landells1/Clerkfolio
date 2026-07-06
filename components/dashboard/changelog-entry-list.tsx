import type { ChangelogEntry } from '@/lib/changelog'

// Shared entry rendering for the changelog: used by both the "seen once" modal
// (ChangelogModal) and the persistent /help/whats-new history page, so the two
// surfaces never drift in how an entry is presented.
export function ChangelogEntryList({ entries }: { entries: ChangelogEntry[] }) {
  return (
    <div className="space-y-4">
      {entries.map(entry => (
        <article key={`${entry.date}-${entry.title}`} className="rounded-xl bg-[var(--bg-canvas)] p-4">
          <p className="text-xs text-[var(--text-muted)]">{new Date(entry.date).toLocaleDateString('en-GB')}</p>
          <h3 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{entry.title}</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{entry.body}</p>
        </article>
      ))}
    </div>
  )
}
