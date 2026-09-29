import type { KeyboardEvent } from 'react'

const TEXT_LIKE_INPUTS = new Set(['text', 'search', 'email', 'number', 'date', 'datetime-local', 'month', 'week', 'time', 'tel', 'url', 'password'])

/**
 * Form onKeyDown: make Enter in a text field perform the form's PRIMARY save.
 * Native implicit submission clicks the first submit button in the DOM, which
 * on the create forms is "Save & add another" - so pressing Enter in the title
 * saved and reloaded a blank form. requestSubmit() with no submitter lets the
 * submit handler treat it as a plain save. Fields that handle Enter
 * themselves (tag pickers, etc.) call preventDefault first and are left alone.
 */
export function submitOnEnterAsPrimary(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== 'Enter' || event.defaultPrevented || event.nativeEvent.isComposing) return
  const target = event.target as HTMLElement
  if (!(target instanceof HTMLInputElement) || !TEXT_LIKE_INPUTS.has(target.type)) return
  event.preventDefault()
  event.currentTarget.requestSubmit()
}
