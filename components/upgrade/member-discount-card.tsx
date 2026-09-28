// Promotion codes are entered on the Stripe checkout page itself
// (allow_promotion_codes is on). This card previously asked about Royal
// Society of Medicine / BMJ membership, showed an unverified "£8/yr member
// price" and offered a code box whose value was never sent anywhere - so it
// only points people at the real place to enter a code.
export default function MemberDiscountCard() {
  return (
    <section className="mb-8 rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
      <p className="text-sm font-semibold text-[var(--text-primary)]">Have a promotion code?</p>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
        Choose Get Pro, then select &quot;Add promotion code&quot; on the secure Stripe checkout page to apply it before you pay.
      </p>
    </section>
  )
}
