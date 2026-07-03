'use client'

import { forwardRef, useState } from 'react'
import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Password field with a show/hide (eye) toggle. Drop-in for a
 * `<input type="password" />` - pass the same props/className. The toggle swaps
 * the input type between `password` and `text`, is labelled for screen readers,
 * and reserves right padding via inline style so it always wins over whatever
 * horizontal padding the caller's className sets.
 */
const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className = '', style, ...props },
  ref
) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={show ? 'text' : 'password'}
        className={className}
        style={{ ...style, paddingRight: '2.75rem' }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 flex w-11 min-h-[32px] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        {show ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
})

export default PasswordInput
