'use client'

import { useState } from 'react'

export default function MemberDiscountCard() {
  const [member, setMember] = useState(false)

  return (
    <section className="mb-8 rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={member}
          onChange={event => setMember(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/[0.16] bg-[#0B0B0C] accent-[#1B6FD9]"
        />
        <span>
          <span className="block text-sm font-semibold text-[#F5F5F2]">
            Are you a Royal Society of Medicine / BMJ member?
          </span>
          <span className="mt-1 block text-sm leading-6 text-[rgba(245,245,242,0.55)]">
            Members can use a manually issued Stripe coupon. The checkout page accepts promotion codes.
          </span>
        </span>
      </label>

      {member && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-wide text-[rgba(245,245,242,0.45)]">Member price</p>
            <p className="mt-1 text-2xl font-semibold text-[#F5F5F2]">£8/yr</p>
          </div>
          <label className="text-xs font-medium uppercase tracking-wide text-[rgba(245,245,242,0.55)]">
            Manual code
            <input
              placeholder="Enter code at Stripe checkout"
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3.5 py-2.5 text-sm normal-case tracking-normal text-[#F5F5F2] outline-none placeholder:text-[rgba(245,245,242,0.55)] focus:border-[#1B6FD9]"
            />
          </label>
        </div>
      )}
    </section>
  )
}
