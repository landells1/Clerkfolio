// Colour theme: cream (default) | dark (opt-in).
//
// The active theme is expressed as a `data-theme` attribute on <html>:
//   cream → no attribute (it is :root)
//   dark  → data-theme="dark"
//
// A no-flash inline script in app/layout.tsx reads `cf-theme` from localStorage
// and stamps the attribute before first paint. This module is the runtime API
// used by the Settings toggle and the PreferencesApplier.

export type Theme = 'cream' | 'dark'

export const THEME_STORAGE_KEY = 'cf-theme'
export const DEFAULT_THEME: Theme = 'cream'

export function isTheme(value: unknown): value is Theme {
  return value === 'cream' || value === 'dark'
}

/** The theme currently stamped on the document (defaults to cream). */
export function getActiveTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'cream'
}

/** The theme saved in localStorage, or null when nothing has been chosen. */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(raw) ? raw : null
  } catch {
    return null
  }
}

/** Apply a theme to the document and remember it locally (no server write). */
export function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    // Keep the address-bar / PWA chrome colour in step with the canvas.
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B0B0C' : '#EDE8D0')
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* private mode / storage disabled — the attribute is still applied */
  }
}
