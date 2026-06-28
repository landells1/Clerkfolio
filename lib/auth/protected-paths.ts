// Single source of truth for the authenticated page prefixes the app serves.
//
// Two callers consume this list and MUST agree, or deep-links break:
//  - middleware (`isKnownProtectedPage`): an unauthenticated hit on one of these
//    is redirected to `/login?next=<path>` instead of falling through to a 404.
//  - the login page (`safeNextPath`): decides which `?next=` targets are safe to
//    honour after a successful login.
//
// F-009: these were two hand-maintained lists that drifted - middleware
// redirected `/arcp`, `/logs` (and now `/help`) to login with a `next=`, but the
// login allowlist omitted them, so the user was silently dropped on `/dashboard`
// instead of the page they asked for. Importing one constant in both places
// makes that drift impossible.
export const PROTECTED_PAGE_PREFIXES = [
  '/dashboard',
  '/portfolio',
  '/cases',
  '/logs',
  '/specialties',
  '/arcp',
  '/timeline',
  '/export',
  '/settings',
  '/trash',
  '/upgrade',
  '/import',
  '/help',
  '/onboarding',
] as const

// True when `pathname` is one of the protected pages or a sub-path of one
// (exact match or a `/prefix/...` child). Matching semantics are identical for
// both callers so the redirect target and the post-login allowlist can never
// disagree.
export function isProtectedPagePath(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
