// Slash-shortcut matching for the snippet menu (components/ui/snippet-textarea).
//
// Typing "/" at the start of the text or after whitespace, followed by part of
// a shortcut, opens a menu of the user's matching snippets; Enter, Tab or a
// click inserts the highlighted one in place of the typed "/shortcut". The
// slash must start a word so "and/or" or "24/7" never trigger it.

export type Snippet = { id: string; shortcut: string; body: string }

const SLASH_SHORTCUT = /(?:^|\s)(\/([a-z0-9_-]*))$/i

export type SlashQuery = { query: string; start: number }

/** The "/query" being typed immediately before the cursor, if any. */
export function activeSlashQuery(text: string, cursor: number): SlashQuery | null {
  const before = text.slice(0, cursor)
  const match = before.match(SLASH_SHORTCUT)
  if (!match || match.index === undefined) return null
  // match.index points at the leading whitespace when present.
  const start = match.index + match[0].length - match[1].length
  return { query: match[2].toLowerCase(), start }
}

/**
 * Snippets whose shortcut starts with the query (case-insensitive), exact
 * match first, then alphabetical. An empty query ("/" alone) lists them all.
 */
export function matchSnippets(snippets: Snippet[], query: string, limit = 6): Snippet[] {
  const needle = query.toLowerCase()
  return snippets
    .filter(snippet => snippet.shortcut.toLowerCase().startsWith(needle))
    .sort((a, b) => {
      const exactA = a.shortcut.toLowerCase() === needle ? 0 : 1
      const exactB = b.shortcut.toLowerCase() === needle ? 0 : 1
      return exactA - exactB || a.shortcut.localeCompare(b.shortcut)
    })
    .slice(0, limit)
}

/** Replace the "/query" that starts at `start` (up to the cursor) with the body. */
export function insertSnippet(text: string, cursor: number, start: number, body: string): { value: string; cursor: number } {
  const value = `${text.slice(0, start)}${body}${text.slice(cursor)}`
  return { value, cursor: start + body.length }
}
