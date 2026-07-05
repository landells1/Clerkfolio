'use client'

import type { Dispatch, SetStateAction } from 'react'

export type StudentEmailState = {
  email: string
  verified: boolean
  verifiedAt: string
  dueAt: string
  sentAt: string
}

function StudentEmailStatus({ studentEmail }: { studentEmail: { email: string; verified: boolean; verifiedAt: string; dueAt: string } }) {
  if (!studentEmail.email) {
    return <span className="text-xs text-[var(--text-secondary)]">Not added</span>
  }

  if (!studentEmail.verified) {
    return <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-[var(--warning)]">Unverified</span>
  }

  const dueLabel = studentEmail.dueAt
    ? new Date(studentEmail.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'next year'

  return (
    <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-[var(--text-on-accent)]">
      Verified until {dueLabel}
    </span>
  )
}

// Institutional (.ac.uk / NHS) email verification panel.
export function InstitutionalEmailSection({
  studentEmail,
  setStudentEmail,
  sendingStudentEmail,
  onSubmit,
  studentEmailError,
}: {
  studentEmail: StudentEmailState
  setStudentEmail: Dispatch<SetStateAction<StudentEmailState>>
  sendingStudentEmail: boolean
  onSubmit: (e: React.FormEvent) => void
  studentEmailError: string | null
}) {
  return (
    <section className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 mb-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Institutional email</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Verify a university or NHS email for Student storage where eligible and referral rewards. Re-verification is required yearly, and you can change this email when your institution changes.
          </p>
        </div>
        <StudentEmailStatus studentEmail={studentEmail} />
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={studentEmail.email}
          onChange={e => setStudentEmail(current => ({ ...current, email: e.target.value }))}
          placeholder="you@university.ac.uk or you@nhs.net"
          className="min-h-[44px] flex-1 rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
        <button
          disabled={sendingStudentEmail}
          className="min-h-[44px] rounded-lg bg-[var(--button-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50"
        >
          {sendingStudentEmail ? 'Sending...' : studentEmail.verified ? 'Re-verify' : 'Send verification'}
        </button>
      </form>
      <p className="mt-3 text-xs text-[var(--text-secondary)]">
        Accepted domains include .ac.uk, nhs.net, nhs.uk, nhs.scot, wales.nhs.uk, and hscni.net.
      </p>
      {studentEmail.sentAt && !studentEmail.verified && (
        <p role="status" className="mt-3 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-sm text-[var(--accent-soft-text)]">
          We sent a verification link to {studentEmail.email}. Check your institution inbox.
        </p>
      )}
      {studentEmailError && (
        <p role="alert" className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-[var(--danger)]">
          {studentEmailError}
        </p>
      )}
    </section>
  )
}
