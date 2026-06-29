import Link from 'next/link'
import CookiePreferencesButton from '@/components/legal/cookie-preferences-button'

const LEGAL_LINKS = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Cookies', href: '/cookies' },
  { label: 'DPA', href: '/dpa' },
  { label: 'Subprocessors', href: '/subprocessors' },
  { label: 'Security', href: '/security' },
  { label: 'Contact', href: '/contact' },
]

export default function LegalFooter({ className }: { className?: string }) {
  return (
    <footer className={`mt-12 border-t border-white/[0.06] pt-6 pb-2 ${className ?? ''}`}>
      <div className="mx-auto max-w-4xl flex flex-wrap gap-x-4 gap-y-2 px-6">
        {LEGAL_LINKS.map(({ label, href }) => (
          <Link
            key={href + label}
            href={href}
            // The footer renders on most surfaces and prefetching all 7 rarely-
            // clicked legal pages on every render contributes to the per-IP
            // `?_rsc=` prefetch-burst 503s. Disable prefetch here. (BUG-001)
            prefetch={false}
            className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          >
            {label}
          </Link>
        ))}
        <CookiePreferencesButton className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]" />
      </div>
      <p className="mt-3 px-6 mx-auto max-w-4xl text-[11px] text-[var(--text-faint)]">
        &copy; {new Date().getFullYear()} Clerkfolio.
      </p>
    </footer>
  )
}
