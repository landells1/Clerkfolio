import Link from 'next/link'

const MESSAGE_BY_STATE = {
  sent: {
    title: 'Check your email',
    text: 'If the details can be used to create an account, a confirmation link has been sent. Open it to continue.',
  },
  rate_limited: {
    title: 'Try again later',
    text: 'Too many sign-up attempts have been made from this network. Please wait an hour and try again.',
  },
  invalid: {
    title: 'Check your details',
    text: 'Enter a valid email address, matching passwords, and a password of at least 8 characters.',
  },
  unavailable: {
    title: 'Sign up unavailable',
    text: 'We could not create an account with those details. Please check the form and try again.',
  },
} as const

export default async function SignupStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const { state } = await searchParams
  const message = MESSAGE_BY_STATE[state as keyof typeof MESSAGE_BY_STATE] ?? MESSAGE_BY_STATE.unavailable

  return (
    <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-8 text-center">
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{message.title}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{message.text}</p>
      <Link href="/signup" className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--button-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--button-primary-text)]">
        Back to sign up
      </Link>
    </div>
  )
}
