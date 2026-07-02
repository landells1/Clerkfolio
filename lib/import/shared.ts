// Shared budget and insert-shaping helpers for the three bulk-import routes
// (/api/import/{csv,json,horus}). Previously copy-pasted per route, which made
// it easy to change the shared rate budget or insert shaping in one place and
// miss the others. The per-format column allowlists rightly stay per-route.

// 5 imports per hour — each batch can be hundreds of rows, so this caps well
// above realistic usage while keeping a runaway client bounded.
export const IMPORT_RATE_MAX = 5
export const IMPORT_RATE_WINDOW_SECONDS = 60 * 60

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Copy only allowlisted columns from an imported row onto a fresh insert
 * object owned by the importing user. Allowlists are preferred over a
 * denylist so newly added internal-only columns can't be set by a crafted
 * import file.
 */
export function copyInsertable(row: Record<string, unknown>, userId: string, allowed: Set<string>) {
  const next: Record<string, unknown> = { user_id: userId }
  Object.entries(row).forEach(([key, value]) => {
    if (allowed.has(key)) next[key] = value
  })
  return next
}
