import Link from 'next/link'
import { verifyUnsubscribeToken, UNSUBSCRIBE_LIST_LABELS } from '@/lib/notifications/unsubscribe'
import { UnsubscribeConfirm } from './confirm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Unsubscribe · Clerkfolio',
  robots: { index: false, follow: false },
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const parsed = token ? verifyUnsubscribeToken(token) : null

  return (
    <div className="min-h-screen bg-surface-0 text-fg flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-2xl border border-subtle bg-surface-1 p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--button-primary-bg)] text-sm font-bold text-[var(--button-primary-text)]">C</div>
          <span className="text-sm font-semibold tracking-tight">Clerkfolio</span>
        </div>

        {parsed ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Unsubscribe</h1>
            <p className="mt-2 text-sm leading-relaxed text-fg-2">
              Turn off {UNSUBSCRIBE_LIST_LABELS[parsed.list]} for this account. You can turn them back on at any time from your notification settings.
            </p>
            <UnsubscribeConfirm token={token!} />
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Link not valid</h1>
            <p className="mt-2 text-sm leading-relaxed text-fg-2">
              This unsubscribe link is invalid or has expired. You can manage every email preference from your notification settings once signed in.
            </p>
            <Link
              href="/settings/notifications"
              className="mt-5 inline-flex rounded-lg bg-[var(--button-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)] transition-colors"
            >
              Go to notification settings
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
