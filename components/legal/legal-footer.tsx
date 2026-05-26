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
            className="text-xs text-[rgba(245,245,242,0.35)] transition-colors hover:text-[rgba(245,245,242,0.65)]"
          >
            {label}
          </Link>
        ))}
        <CookiePreferencesButton className="text-xs text-[rgba(245,245,242,0.35)] transition-colors hover:text-[rgba(245,245,242,0.65)]" />
      </div>
      <p className="mt-3 px-6 mx-auto max-w-4xl text-[11px] text-[rgba(245,245,242,0.25)]">
        &copy; {new Date().getFullYear()} Clerkfolio Ltd. Registered in England and Wales.
      </p>
    </footer>
  )
}
