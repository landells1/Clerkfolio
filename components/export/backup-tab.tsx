'use client'

import Link from 'next/link'
import type { SubscriptionInfo } from '@/lib/subscription'

// Data backup tab: full ZIP backup, year-in-review PDF and reflections
// markdown downloads. Handlers live in the page.
export function BackupTab({
  subInfo,
  includeEvidenceBackup,
  setIncludeEvidenceBackup,
  backupLoading,
  onBackup,
  yearReviewLoading,
  onYearReview,
  markdownLoading,
  onMarkdownExport,
}: {
  subInfo: SubscriptionInfo | null
  includeEvidenceBackup: boolean
  setIncludeEvidenceBackup: (include: boolean) => void
  backupLoading: boolean
  onBackup: () => void
  yearReviewLoading: boolean
  onYearReview: () => void
  markdownLoading: boolean
  onMarkdownExport: () => void
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Full data backup</h2>
      <p className="mt-2 max-w-2xl mx-auto text-sm leading-relaxed text-[var(--text-muted)]">
        Download a ZIP containing your profile, portfolio entries, cases, deadlines, goals, specialty scoring links, templates, and evidence files.
      </p>
      <label className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input type="checkbox" checked={includeEvidenceBackup} onChange={e => setIncludeEvidenceBackup(e.target.checked)} />
        Include evidence files
      </label>
      {subInfo && !subInfo.isPro && (
        <div className="mt-5 max-w-2xl rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-[var(--warning)]">
          <p className="font-semibold">
            {subInfo.limits.canExportPdf ? '1 of 1 PDF remaining' : 'PDF allowance used'}
          </p>
          <p className="mt-1 text-[var(--text-secondary)]">
            Year in review PDF shares your single included PDF download with Application PDF, appended PDF and CV PDF/DOCX downloads.
          </p>
          {!subInfo.limits.canExportPdf && (
            <p className="mt-1 text-[var(--text-secondary)]">
              <Link href="/upgrade" className="text-[var(--accent-text)] underline">Upgrade for £9.99/yr</Link> for unlimited PDFs. Or <Link href="/settings/referrals" className="text-[var(--accent-text)] underline">invite a colleague</Link>. Each successful referral adds one more free PDF export.
            </p>
          )}
        </div>
      )}
      <button onClick={onBackup} disabled={backupLoading} className="mt-6 rounded-xl bg-[var(--button-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--button-primary-text)] disabled:opacity-50">
        {backupLoading ? 'Preparing backup...' : 'Download ZIP backup'}
      </button>
      <button
        type="button"
        onClick={onYearReview}
        disabled={yearReviewLoading || Boolean(subInfo && !subInfo.isPro && !subInfo.limits.canExportPdf)}
        className="ml-3 inline-flex min-h-[40px] items-center rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-[var(--text-primary)] hover:border-white/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {yearReviewLoading ? 'Generating...' : 'Year in review PDF'}
      </button>
      <button
        type="button"
        onClick={onMarkdownExport}
        disabled={markdownLoading}
        className="ml-3 inline-flex min-h-[40px] items-center rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-[var(--text-primary)] hover:border-white/[0.16] disabled:opacity-50"
      >
        {markdownLoading ? 'Exporting...' : 'Reflections MD'}
      </button>
    </section>
  )
}
