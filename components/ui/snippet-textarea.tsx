'use client'

import { useId, useRef, useState, type KeyboardEvent, type TextareaHTMLAttributes } from 'react'
import { useSnippets } from '@/components/ui/slash-menu'
import { activeSlashQuery, insertSnippet, matchSnippets, type Snippet, type SlashQuery } from '@/lib/snippets/match'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string
  onValueChange: (value: string) => void
}

// A textarea with the snippet menu: type "/" plus part of a shortcut and a
// small list of matching snippets (from Settings > Snippets) appears below
// the box. Arrow keys move, Enter / Tab / click inserts, Escape closes.
// Accessible as a combobox over a listbox; without matches it behaves exactly
// like a plain textarea (Enter still makes a new line).
export default function SnippetTextarea({ value, onValueChange, onKeyDown, onBlur, className, ...rest }: Props) {
  const snippets = useSnippets()
  const ref = useRef<HTMLTextAreaElement>(null)
  const listId = useId()
  const [slash, setSlash] = useState<SlashQuery | null>(null)
  const [active, setActive] = useState(0)
  // Escape hides the menu until the user types again.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)

  const matches: Snippet[] = slash && dismissedAt !== slash.start ? matchSnippets(snippets, slash.query) : []
  const open = matches.length > 0

  function refresh(target: HTMLTextAreaElement) {
    if (target.selectionStart !== target.selectionEnd) { setSlash(null); return }
    const next = activeSlashQuery(target.value, target.selectionStart)
    setSlash(next)
    setActive(0)
    if (!next) setDismissedAt(null)
  }

  function choose(snippet: Snippet) {
    const target = ref.current
    if (!target || !slash) return
    const next = insertSnippet(value, target.selectionStart, slash.start, snippet.body)
    onValueChange(next.value)
    setSlash(null)
    requestAnimationFrame(() => {
      target.focus()
      target.setSelectionRange(next.cursor, next.cursor)
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (open) {
      if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => (i + 1) % matches.length); return }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => (i - 1 + matches.length) % matches.length); return }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        event.stopPropagation()
        choose(matches[Math.min(active, matches.length - 1)])
        return
      }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setDismissedAt(slash?.start ?? null); return }
    }
    onKeyDown?.(event)
  }

  return (
    <div className="relative">
      <textarea
        {...rest}
        ref={ref}
        value={value}
        className={className}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onChange={event => { onValueChange(event.target.value); refresh(event.target) }}
        onKeyDown={handleKeyDown}
        onKeyUp={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') refresh(event.currentTarget) }}
        onClick={event => refresh(event.currentTarget)}
        onBlur={event => { setSlash(null); onBlur?.(event) }}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-raised)] shadow-lg">
          <p className="border-b border-[var(--border-subtle)] px-3 py-1.5 text-[11px] text-[var(--text-muted)]">Snippets - Enter or Tab to insert, Esc to close</p>
          <ul id={listId} role="listbox" aria-label="Matching snippets" className="max-h-56 overflow-y-auto py-1">
            {matches.map((snippet, index) => (
              <li
                key={snippet.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                // mousedown (not click) so the textarea keeps focus and its cursor.
                onMouseDown={event => { event.preventDefault(); choose(snippet) }}
                onMouseEnter={() => setActive(index)}
                className={`cursor-pointer px-3 py-2 text-sm ${index === active ? 'bg-[var(--bg-hover)]' : ''}`}
              >
                <span className="font-mono text-xs font-semibold text-[var(--accent-text)]">/{snippet.shortcut}</span>
                <span className="ml-2 line-clamp-1 text-xs text-[var(--text-secondary)]">{snippet.body}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
