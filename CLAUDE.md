# Clerkfolio Agent Memory

Last reviewed: 2026-05-26 by Codex after settings and QOL remediation work.
Use this as a compact map, not as the source of truth. Verify details with `rg`, local files, tests, and connectors before changing behavior.

## What This File Is

- Repo memory for agent sessions working in `C:\Users\SRL20\Documents\Clerkfolio`.
- Claude Code may read `CLAUDE.md`. Codex does not automatically treat this as persistent memory unless it is explicitly opened in the session; Codex typically relies on its session context and repo instruction files such as `AGENTS.md` when present.
- Current git state at review: `main` tracking `origin/main`; `CLAUDE.md` is tracked and should be kept current when agent-visible architecture or operational facts change.

## Project Snapshot

- Product: Clerkfolio, a UK doctor / medical student portfolio app.
- Live site: `https://clerkfolio.co.uk`.
- GitHub: `https://github.com/landells1/Clerkfolio`.
- Stack: Next.js App Router 16.2.x (webpack build), React 18.3.x, strict TypeScript, Tailwind, Supabase SSR/JS, Stripe, Resend, Sentry, Vercel Analytics, Upstash-backed rate limits, `@react-pdf/renderer`, `pdf-lib`, `jszip`.
- Node engine: `24.x`.

## Commands

```bash
npm run build
npm run typecheck
npm run lint
npm run test
npm run e2e
npm run scan:secrets
```

Notes: `npm run build` is the main compile gate. Hooks inject placeholder public env vars for build verification. CI has lint/typecheck/build/unit/e2e jobs; E2E self-skips when required secrets are absent.

## Non-Negotiables

- Medical portfolio product: do not add flows that invite or store patient identifiers. Preserve anonymisation warnings.
- Never expose service role, Stripe secrets, Resend keys, webhook secrets, token/API-key hashes, IP hashes, or free-text clinical notes to browsers, logs, exports that should not contain them, share pages, or client components.
- RLS is a core boundary. Service-role Supabase is only for trusted server contexts after auth/owner/origin/rate checks.
- Entitlements must be enforced server-side, not only hidden in UI.
- Stripe is currently treated as sandbox/test mode unless explicitly told otherwise.
- Supabase leaked password protection is disabled because it requires Supabase Pro; this is a known accepted limitation for now.
- Do not remove the PDF bundling workarounds in `next.config.mjs` without deployed-style PDF export verification.

## Repo Map

- `app/`: App Router pages, layouts, metadata routes, and API routes.
- `app/(auth)/`: signup, login, reset/update password.
- `app/(dashboard)/`: authenticated surfaces: dashboard, portfolio, cases, logs, specialties, ARCP, timeline, import/export, trash, settings, upgrade.
- `app/(marketing)/_components/landing/`: landing page and mock UI.
- `components/`: feature and shared UI.
- `lib/`: domain logic, Supabase/Stripe clients, entitlements, imports/exports, specialty scoring, PDFs, security helpers.
- `supabase/migrations/`: recent audit/remediation migrations and intentionally curated follow-up migrations. This folder is not a complete historical schema dump; some database changes were applied automatically/directly and may not be represented as full create-table history.
- `tests/`: Vitest unit tests. `e2e/`: Playwright flows.

## Environment

Documented in `.env.example`: Supabase public URL/anon key/service role, Resend, `CRON_SECRET`, `SHARE_IP_HASH_SALT`, Upstash Redis REST URL/token, `NEXT_PUBLIC_APP_URL`, Stripe secret/price/webhook secret, Sentry DSNs/auth/org/project/env.

`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are required before exposing the public API in production. Without them, general UI endpoints can still use per-instance in-memory limiting, but API-key authentication deliberately fails closed with HTTP 503 because a 60/min public limit cannot be enforced cluster-wide.

`next.config.mjs` derives `NEXT_PUBLIC_SENTRY_ENVIRONMENT` from Vercel's `VERCEL_ENV` at build time. Do not configure the client environment as the literal string `$VERCEL_ENV`.

## Live Supabase State

Verified read-only with connector on 2026-05-24 for `entry_revisions`; broader table list below should be re-checked before schema work.

- Project ref/name: `dldhnstjngendpcywthv` / Clerkfolio.
- Region/status: `eu-west-2`, `ACTIVE_HEALTHY`.
- DB: Postgres 17.6.1.
- All public tables reported by connector have RLS enabled.
- Public tables previously verified: `profiles`, `portfolio_entries`, `cases`, `deadlines`, `evidence_files`, `goals`, `specialty_applications`, `specialty_entry_links`, `templates`, `arcp_capabilities`, `arcp_entry_links`, `share_links`, `notifications`, `custom_competency_themes`, `audit_log`, `share_views`, `referrals`, `share_access_attempts`, `student_email_verification_tokens`, `snippets`, `personal_log`, `saved_searches`, `api_keys`, `session_fingerprints`, `stripe_webhook_events`.
- `entry_revisions` is intentionally absent as of 2026-05-24. Commit `fcb4f0a` (`fix: ISSUE-011 remove version history`) removed the history UI/API and added `supabase/migrations/2026_05_23_drop_entry_revisions.sql`. Do not recreate it for old test expectations unless version history is explicitly re-scoped as a new feature.
- Edge Function: `scan-evidence`, active, JWT verification enabled.
- Storage bucket `evidence`: private, 50 MB file cap. Bucket allows PDF, JPEG/JPG, PNG, HEIC/HEIF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT.
- App-side upload allowlist in `lib/supabase/storage.ts` is narrower: PDF, DOC/DOCX, XLSX, PPTX, TXT, PNG, JPEG, HEIC/HEIF. Reconcile intentionally before changing bucket or app MIME behavior.

Advisor notes verified 2026-05-20:

- Security warnings: leaked password protection disabled; SECURITY DEFINER functions executable from exposed schema.
- Anon can execute `audit_auth_email_change()` and `enforce_specialty_track_cap()` per advisor/function privilege query. Validate body/grants before changing.
- Authenticated can execute `claim_free_pdf_export(uuid)`, `ensure_profile_for_current_user()`, `get_profile_entitlements(uuid)`, `increment_pro_feature_usage(uuid,text)`, `rename_user_tag(text,text,text)`, plus the anon-executable functions above. Some are intentional app RPCs; do not blanket-revoke without checking call sites and auth checks.
- Performance advisor reports unused indexes on low-traffic tables. Treat as informational, not automatic cleanup.

## Database Functions And Migrations

Important local migrations:

- `2026_05_15_audit_remediation.sql`: atomic free PDF claim, notification RLS repair, share link hardening.
- `2026_05_16_grant_authenticated_rpcs.sql`: restores grants for user-callable RPCs.
- `2026_05_18_audit_remediation.sql`: profile write guard, signup/profile self-healing, share link RLS, specialty cap, institutional email confirmation.
- `2026_05_18_audit_remediation_phase2.sql`: removes direct storage upload policy, orphan upload cleanup, audit auth email trigger.
- Later local migrations include phase 3/4 audit hardening, active share-link entitlement tracking, and the intentional `entry_revisions` removal. Treat migrations as change history, not as a complete database schema source.

High-value functions: `claim_free_pdf_export`, `get_profile_entitlements`, `increment_pro_feature_usage`, `guard_profile_writes`, `handle_new_user`, `ensure_profile_for_current_user`, `confirm_student_email_token`, `enforce_specialty_track_cap`, `audit_auth_email_change`, `rename_user_tag`.

## Auth And Middleware

`middleware.ts` applies security headers/CSP, rewrites `*.clerkfolio.site` to showcase pages, rewrites stale `POST /onboarding` to `/api/onboarding/complete`, refreshes Supabase SSR sessions, records `session_fingerprints` with service role when configured, redirects protected routes to login, enforces onboarding, and protects `/update-password` with the HTTP-only `cf_recovery` cookie.

Auth notes:

- `/auth/callback` handles Supabase confirmation/recovery and sets `cf_recovery` only for password reset flow.
- Login/reset messaging is generic to reduce enumeration.
- `/api/auth/preflight` rate-limits signup/login/reset but direct Supabase Auth limits still matter. Login keys include both network IP and a SHA-256 hash of normalized email to avoid hospital/university shared-network lockout.
- `/api/account/password` verifies the existing password, updates through admin auth, creates a fresh current SSR session with the new password, and requests revocation of other sessions. Do not replace this with a bare admin update.
- Sidebar logout attempts global sign-out; if Supabase global revocation fails upstream, it still performs best-effort local sign-out and redirects with an explicit warning.
- Confirmed `.ac.uk`/NHS signup addresses are claimed through `lib/institutional-auth-email.ts` from both PKCE callback and token-hash OTP confirmation paths, then tier is re-derived by `recompute_profile_tier`. Do not restore a second same-inbox verification step.
- Password-reset confirmation warns before replacing an existing browser session; keep that explicit account-switch acknowledgement in recovery flows.
- The onboarding screen has a "Not you? Sign out" control in its header (global sign-out with local fallback, same pattern as the sidebar) so a user who auto-logged-in after confirming the wrong account is not trapped by the onboarding redirect. It also clears the `clerkfolio-onboarding-draft` localStorage key on sign-out.
- Avoid `user_metadata` for authorization. It is user-editable; use DB/app metadata for authz decisions.

## Tiers And Entitlements

Tier type: `free | student | foundation | pro`.

- Pricing source: `lib/marketing/pricing.ts`.
- Pro is GBP 9.99/year.
- Free: 100 MB storage, 1 lifetime PDF export, 1 share link, 1 tracked specialty.
- Student: verified `.ac.uk`, 1 GB storage, otherwise mostly free limits.
- Pro: 5 GB storage, unlimited PDF/share/specialty tracking, bulk import.
- `lib/subscription.ts` calls `get_profile_entitlements` and fail-closes gated booleans on RPC/null drift.
- Institutional email domains include `.ac.uk`, `nhs.net`, `hscni.net`, `.nhs.uk`, `.nhs.scot`, `.wales.nhs.uk`.
- Referral rewards require current institutional verification for both parties, grant 30 days Pro-equivalent, and cap at 5 rewards per rolling 365 days. Medical-student to FY transition can grant a one-shot 90-day foundation gift.

## Stripe

Files: `lib/stripe.ts`, `app/api/stripe/checkout/route.ts`, `portal/route.ts`, `webhook/route.ts`.

- Stripe API version in code: `2026-04-22.dahlia`.
- Checkout/portal validate origin and use `NEXT_PUBLIC_APP_URL` for redirects; never trust request origin for billing redirect URLs.
- Checkout creates/reuses customers, subscription checkout, promotion codes allowed.
- Webhook verifies signature and uses `stripe_webhook_events` for idempotency.
- Paid access is `active`, `trialing`, or `past_due`; deleted subscription downgrades to free.
- Activation, scheduled cancellation, and completed cancellation create `subscription_changed` audit rows and billing notifications. Payment failed creates audit log + notification; refund/dispute creates audit log rows.
- Keep webhook/platform logs free of customer IDs and PII.

## Evidence Uploads

Canonical flow in `lib/supabase/storage.ts`, `/api/upload/authorize`, `/api/upload/verify`, `/api/cron/purge-orphan-uploads`:

0. The browser rejects unsupported extension/MIME combinations before adding files to staging (it does not stage rejected files); this is UX protection only. Drag-and-drop is scoped to the `EvidenceUpload` dropzone (with a drag-over highlight); the surrounding entry/case form swallows stray drops so the browser does not navigate away and unvalidated files are not staged.
1. Browser asks `/api/upload/authorize`.
2. Server checks auth, owner, MIME, size, quota and pre-creates `evidence_files` with `scan_status='pending'`.
3. Server returns a one-time Supabase signed upload URL.
4. Browser PUTs bytes, then calls `/api/upload/verify`.
5. Server downloads prefix, magic-byte checks, marks `clean` or `quarantined`.
6. The client attempts Edge Function `scan-evidence` first and uses `/api/upload/verify` as fallback. Current production finalisation records `scan_provider='mime_only'`: that means MIME/signature validation, not antivirus scanning.
7. Orphan cron purges stale pending rows/storage after 24h.

Do not reintroduce direct user storage INSERTs. Clean signed downloads only (`scan_status='clean'`). Storage caps: Free 100 MB, Student 1 GB, Pro 5 GB, max file 50 MB.

The entry/case **edit** forms list already-attached evidence (`EvidenceFiles` with `canDelete`) above the dropzone, with a per-file inline two-step remove backed by `deleteEvidenceFile` (owner-checked hard delete of the storage object + `evidence_files` row). After a save that uploads files, the user is sent to the detail page with `?uploaded=N`, which shows an explicit success banner; the success toast also states the file count.

## Sharing

Files: `/api/share`, `/api/share/access`, `/share/[token]`, `lib/share/pin.ts`, `lib/share/ssrf.ts`.

- Scopes: `specialty`, `theme`, `full`. Expiry must be future and <= 90 days.
- All scopes share portfolio entries only; cases are never included in any share (the access route only ever queries `portfolio_entries`). The create form and public page label the full scope "Full portfolio (entries only)" and disclose "Cases are never shared." Do not add cases to share output (clinical-narrative non-negotiable).
- Specialty-scoped creation accepts active tracked specialties only; portfolio tags are valid export filters but not valid specialty share scopes.
- Creation uses user-bound checks first, then service-role insert because user INSERT is intentionally blocked by RLS.
- Free users get 1 active share link; route has compensating race check and increments usage only after link survives.
- Tokens: app uses 48 hex; access route accepts 48 or 64 hex for DB/default compatibility.
- Optional PIN: 4-8 digits, scrypt hash with encoded params; legacy hash format still verifies.
- Access route uses service role, hashed IP with `SHARE_IP_HASH_SALT`, share-wide wrong-PIN lockout (5 failures/15 min), per-IP attempt limit (5/min), 100 views/hour auto-revoke with optional owner email.
- Webhooks must pass public-host SSRF checks at create and send time, no redirects, 3s timeout.
- Public share output is noindex/nocache and can redact notes/reflections/tags.

## Import And Export

Exports:

- `/api/export`: selected portfolio/cases as PDF/CSV/JSON; PDF currently requires at least one portfolio entry.
- `/api/export/cv`, `/api/export/pdf-append`, `/api/export/year-review`, `/api/export/markdown`, `/api/export/evidence`, `/api/account/export`.
- PDF free quota is claimed only after successful render via `claim_free_pdf_export`; CSV/JSON are not blocked by PDF quota.
- Export UI refreshes entitlement/usage state after PDF-producing operations so displayed free quota is current.
- CSV prefixes formula-leading chars to prevent spreadsheet execution. Preserve this.
- PDF runtime uses `lib/pdf/portfolio-pdf-runtime.cjs` via dynamic loader; `next.config.mjs` and `vercel.json` include tracing workarounds for Vercel lambdas.
- Do not log free-text export content; Sentry captures scrubbed metadata where needed.

Imports:

- `/api/import/csv`, `/api/import/json`, `/api/import/horus`.
- Bulk import requires Pro, is rate-limited, has file/row caps, allowlisted columns, duplicate handling.

## Specialties And ARCP

- Specialty configs live in `lib/specialties/*.ts`, gathered by `lib/specialties/index.ts`; types in `lib/specialties/types.ts`; deadlines in `deadlines.ts`.
- Current config set covers 2026 IMT, Ophthalmology, ACCS EM/AM/Anaes, CST, Core Psych, GP, Paeds, Radiology, Anaesthetics, O&G, Public Health, Histopathology, Neurosurgery, Cardiothoracic, OMFS, Child & Adolescent Psych, CSRH, Psych Learning Disability, PH+GP dual, Plastic Surgery, Cardiology, T&O, Dermatology, EM ST4, General Surgery ST3.
- Scoring supports `points` and `evidence`; domain rules include `highest`, `cumulative_capped`, checkbox, and self-assessed. Bonus points only count when `bonus_claimed`.
- Recruitment dates are time-sensitive; verify official sources before updating 2026 deadlines.
- ARCP capabilities are stored in `arcp_capabilities`; FY1/FY2 users see ARCP nav; links attach portfolio entries to capability keys.

## Cron

Configured in `vercel.json`, region `lhr1`:

- Daily: notifications 09:00, streak-cache 02:00, purge-deleted 02:00, expire-share-links 01:00, purge-orphan-uploads 03:15.
- Weekly: weekly-digest Saturday 09:00, purge-audit-log Sunday 03:00, purge-stale-tokens Sunday 04:00.
- Monthly/yearly: monthly-digest day 1 09:00, year-in-review Jan 2 09:00.

All cron routes should call `validateCronSecret` before service-role work.
Missed `expire-share-links` invocations observed on 2026-05-25 remain a Vercel runtime/dashboard investigation; do not alter schedules without evidence from platform logs.

## Public API

Files: `lib/api-keys.ts`, `lib/public-api.ts`, `/api/v1/me/*`, `/api/settings/api-keys`.

- API keys are `cfk_` plus base64url token; only prefix is shown/stored for display.
- SHA-256 token hash is stored for lookup; this is correct for high-entropy API keys.
- Current scope model is read-only `read`.
- Auth is Bearer token; API-key auth is per-IP rate-limited at 60/min through distributed Upstash limiting in production. If Upstash is absent in production, public API authentication returns HTTP 503 rather than accepting unenforceably limited traffic.
- Public API uses service role but always scopes queries to authenticated key owner.

## Privacy And Account Lifecycle

- GDPR export ZIP includes profile, portfolio, cases, deadlines, goals, specialties, ARCP links, templates, clean evidence, personal logs, audit, share links, notifications, revisions, custom themes, snippets, searches, sessions without IP hash, referrals, API key metadata.
- Account deletion requires exact `DELETE`, attempts Stripe cancel-at-period-end first, swallows only Stripe `resource_missing`, chunks evidence storage deletes, then deletes Supabase auth user.
- Offline cache/service worker are cleared on logout.

## Security Patterns To Preserve

- Validate origin on mutating routes using `validateOrigin`.
- Use `safeJsonBody` / `badJson` where body shape matters.
- Use allowlists for import/write columns.
- Keep service-role work behind auth/owner/origin/rate checks.
- Keep RLS narrow and table-specific; remember UPDATE also needs SELECT visibility.
- For SECURITY DEFINER functions in exposed schema, inspect grants and auth checks before changing.
- Never log patient-like text, full tokens, IPs, customer IDs, secrets, or clinical notes.
- Keep share webhook SSRF guards and no-redirect fetch behavior.

## Testing Guidance

Existing coverage includes unit tests for CSRF, rate limit fallback/headers, subscription entitlement mapping/fail-closed behavior, specialty scoring, share PIN/token hashing, institutional email validation, and referral rewards. Playwright covers signup/onboarding/first entry, password reset, Stripe checkout test mode, PDF quota, PIN share links, and GDPR export/account delete.

Use focused tests by blast radius:

- Pure logic: Vitest under `tests/lib`.
- UI/dashboard workflows: Playwright.
- Supabase schema/RLS: migration plus connector/advisor verification.
- Stripe: test mode only; verify checkout, signature, idempotency.
- PDF/export: local build plus deployed/Vercel-like file tracing when possible.
- Upload/share: test bypass, lockout, expiry, revocation, redaction, SSRF, cleanup.

Known test gotcha: check `e2e/fixtures/global-setup.ts` before relying on cleanup; old references to `share_access_logs` would be stale if present because live schema uses `share_access_attempts`.

## UI Conventions

Dark, dense, professional medical dashboard. Primary background around `#0B0B0C`, elevated panels around `#141416`, brand blue `#1B6FD9`. Use existing `components/ui`, feature folders, dashboard providers, sidebar/mobile nav/FAB/command palette patterns. Avoid patient-identifiable example copy.

Optional Vercel Analytics is off by default and configured from the footer `Analytics preferences` control; do not restore a first-visit blocking consent modal while only essential storage loads by default.

## Known Gotchas

- `CLAUDE.md` is tracked; `.claude/`, `HANDOVER.md`, and `/docs/` are ignored.
- Supabase live schema is the source of truth when local migrations and `CLAUDE.md` disagree. The local `supabase/migrations` folder does not contain every historical schema creation statement.
- Windows console may display UTF-8 comments as mojibake; do not rewrite source just for display artifacts.
- `next.config.mjs` has long PDF tracing includes and `serverExternalPackages` for React/PDF compatibility. Ugly but intentional.
- `lib/pdf/portfolio-pdf-runtime.cjs` is dynamically loaded; static tracing will miss it without explicit includes.
- Upstash missing in production means per-instance fallback for UI routes and HTTP 503 fail-closed behavior for public API-key routes.
- Student email verification sends email before writing token/profile sent timestamp to avoid pending-with-no-email states.
- Share link creation and notifications insert use service role by design after checks.
- Session fingerprint maintenance is service-role in middleware; revoke route uses service role after owner check.
- Do not reintroduce segment `loading.tsx` boundaries beneath authenticated settings routes without hard-navigation testing; the prior streaming boundary stranded settings payloads behind a permanent skeleton.

## Change Playbook

Before editing: read this file, run `git status --short`, use `rg` for existing patterns, and check recent audit migrations/comments around non-obvious design.

Feature work: update server enforcement first, then UI, shared types/helpers, and focused tests. Schema changes should be migrations, not ad hoc production edits.

High-risk work (security/billing/auth/share/upload/export): assume browser bypass attempts, keep service-role guarded, avoid sensitive logs, and verify with tests or connector queries.

Specialty criteria/deadlines: verify official sources before editing, keep `source`/`sourceLabel` accurate, update scoring tests if helper behavior changes.

PDF work: preserve runtime loader/tracing unless replacing the whole approach; test export locally and, if possible, in deployed-like conditions.
