// Clinical-safety anonymisation reminders (Batch 3 / F-015). The free-text on a
// reflection, procedure or case is the field most likely to hold a patient
// narrative, so these surface the product's "no patient identifiers"
// Non-Negotiable directly on the forms — not hidden inside a collapsed guide.

/** Prominent top-of-form reminder. Use on the case, reflection and procedure
 *  forms. */
export function AnonymisationBanner({ className = '' }: { className?: string }) {
  return (
    <div
      role="note"
      className={`flex items-start gap-2.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-3.5 py-2.5 text-xs leading-relaxed text-amber-200/90 ${className}`}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span>
        Keep this anonymous — no patient names, dates of birth, NHS numbers, or other identifying details.
      </span>
    </div>
  )
}

/** Compact line shown directly under a free-text field. */
export function AnonymisationHint({ className = '' }: { className?: string }) {
  return (
    <p className={`mt-1 text-[11px] text-[rgba(245,245,242,0.45)] ${className}`}>
      No patient-identifiable details.
    </p>
  )
}
