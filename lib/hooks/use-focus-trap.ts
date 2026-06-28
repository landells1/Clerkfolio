'use client'

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessibility plumbing for a modal dialog (F-034). While `active` is true it:
 *  - moves focus into `ref` if focus isn't already inside it,
 *  - keeps Tab / Shift+Tab cycling within `ref` (a focus trap),
 *  - closes on Escape when `onEscape` is supplied, and
 *  - restores focus to whatever was focused before opening, when it closes.
 *
 * `onEscape` is read through a ref so passing a fresh closure each render does
 * not re-run the effect — re-running would re-capture the "previously focused"
 * element (now inside the dialog) and break focus restoration.
 *
 * The container should carry `tabIndex={-1}` so focus has somewhere to rest when
 * the dialog has no focusable children yet (e.g. a loading/empty state).
 */
export function useFocusTrap(
  active: boolean,
  ref: RefObject<HTMLElement | null>,
  onEscape?: () => void,
) {
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  useEffect(() => {
    if (!active) return
    if (!ref.current) return
    // Re-bind to a non-null typed local: TS does not carry the null-guard
    // flow-narrowing of a closure-captured const into the nested handlers.
    const container: HTMLElement = ref.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => el.offsetParent !== null || el === document.activeElement,
      )

    if (!container.contains(document.activeElement)) {
      const els = focusable()
      ;(els[0] ?? container).focus()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (onEscapeRef.current) {
          e.preventDefault()
          onEscapeRef.current()
        }
        return
      }
      if (e.key !== 'Tab') return
      const els = focusable()
      if (els.length === 0) {
        e.preventDefault()
        container.focus()
        return
      }
      const first = els[0]
      const last = els[els.length - 1]
      const activeEl = document.activeElement
      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault()
          last.focus()
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus?.()
    }
  }, [active, ref])
}
