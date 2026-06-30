'use client'

import { useState } from 'react'

export default function MemberDiscountCard() {
  const [member, setMember] = useState(false)

  return (
    <section className="mb-8 rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={member}
          onChange={event => setMember(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/[0.16] bg-[var(--bg-canvas)] accent-[var(--accent-text)]"
        />
        <span>
          <span className="block text-sm font-semibold text-[var(--text-primary)]">
            Are you a Royal Society of Medicine / BMJ member?
          </span>
          <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">
            Members can use a manually issued Stripe coupon. The checkout page accepts promotion codes.
          </span>
        </span>
      </label>

      {member && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-emphasis)]">Member price</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">£8/yr</p>
          </div>
          <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
            Manual code
            <input
              placeholder="Enter code at Stripe checkout"
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm normal-case tracking-normal text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)]"
            />
          </label>
        </div>
      )}
    </section>
  )
}
