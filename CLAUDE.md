# Clerkfolio Agent Memory
Never take credit for any coding. do not say edited or assisted by claude. remove all credit from your side. 
Last reviewed: 2026-06-22 by Claude during the staged pre-release review (build/infra, public/legal, full product, non-functional, email/upload/download flows). Prior: 2026-05-26 by Codex after settings and QOL remediation work.
Use this as a compact map, not as the source of truth. Verify details with `rg`, local files, tests, and connectors before changing behavior.

Pre-release review (2026-06-22) confirmed: build green (287/287 tests, clean typecheck/lint), production = reviewed commit `3b48934`, RLS on all 25 public tables, no schema drift, no new advisors, GDPR export leaks nothing, entitlement gating enforced server-side everywhere. Two HIGH issues found: legal-page company/ICO disclosure gap, and a calendar-feed bug (see Known Gotchas). Full findings: `C:\Users\SRL20\Documents\Clerkfolio_Review_Findings.md`.

Security & architecture audit (2026-07-02, report: `C:\Users\SRL20\Documents\AUDIT_REPORT.md`, baseline `fa96be5`): 0 Critical, 1 High, 4 Medium, 8 Low, 10 Info; authz/secrets/injection/crypto/headers all clean. **All High + Medium + Low fixes plus the actionable Info items (I-1 `scan:secrets:all`, I-5 startup env check, I-6 parser tests+comment, I-7 arcp error shape) were implemented and shipped the same day** (326 tests green). Key behaviour changes are folded into the relevant sections below. Deliberately NOT fixed: I-2/I-3/I-4 (ESLint 9 / eslint-config-next / resend version bumps — the known deferred-migrations backlog), I-8/I-9/I-10 (accepted/informational).

**Now in the pre-launch IMPLEMENTATION phase (started 2026-06-23).** All 47 review findings have agreed dispositions (the "Stage-13 owner decision log" in the findings file is the authoritative spec). Fixes are being built in batches per `C:\Users\SRL20\Documents\Clerkfolio_Build_Prompt.md`. **Several architecture facts described below are scheduled to change — verify against the findings file's decision log before relying on the current description of: tiers/entitlements, the public API, completeness scoring, the specialty tagger, the demo seed, and the calendar feed.** See "Pre-Launch Implementation Phase" below for the incoming changes and their owning batch.

## What This File Is

- Repo memory for agent sessions working in `C:\Users\SRL20\Documents\Clerkfolio`.
- Claude Code may read `CLAUDE.md`. Codex does not automatically treat this as persistent memory unless it is explicitly opened in the session; Codex typically relies on its session context and repo instruction files such as `AGENTS.md` when present.
- Current git state at review: `main` tracking `origin/main`; `CLAUDE.md` is tracked and should be kept current when agent-visible architecture or operational facts change.

## Pre-Launch Implementation Phase

Building the decided fixes in batches (`Clerkfolio_Build_Prompt.md`); spec = the findings-file decision log. Pushing `main` deploys production, so default to a **branch per batch + Vercel preview verification + owner-gated merge** (override only if told). Pre-merge gate = **all four**: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test` (lint AND build both required — Next 16's build no longer runs ESLint). One shared Supabase (no preview DB): schema changes are migrations, additive/backward-compatible, coordinated with the deploy. Codex also commits here — `git status --short` + `git log` at session start.

**Incoming architecture changes (update the relevant sections as each lands; until then the descriptions below are the *current* state):**
- **Tiers/entitlements (Batch 1): ✅ SHIPPED 2026-06-23** — see the rewritten "Tiers And Entitlements" section below. (base + additive grants, base-ten units, +500 institutional, +250@5, free/pro + verification flag, FY1/2 = career stage only, referral overhaul + vesting cron + notifications + `referral_funnel` view + storage meter.)
- **Public API (Batch 5): ✅ REMOVED 2026-06-26** — see the rewritten "Public API" section below. `/settings/api`, the whole `app/api/v1` tree (`/api/v1/me/*`), `/api/settings/api-keys`, `lib/public-api.ts`, `lib/api-keys.ts`, the settings-hub "API access" link, the middleware `/api/v1/me/` allowlist entry, and the `requireDistributed`/`isPublicApiOnline()` rate-limit branches are all gone. The `api_keys` table is left **dormant** (the GDPR export still reads it). **F-047 (provision EU Upstash) remains owner action** (zero code change).
- **Completeness scoring (Batch 3): ✅ REMOVED 2026-06-23** — the auto green/amber/red signal is gone everywhere (entry-card dots, the "Green only" filter, the min/max sliders, the saved-search `complete:`/`min:`/`max:` grammar [now recognised no-ops in `lib/search/parser.ts`], the public-API field, the csv/json/horus import compute, and the digest "Completeness mix" line). Replaced by a **user-set importance Low/Med/High** (`lib/types/importance.ts` + `components/portfolio/importance-select.tsx`) on **both** `portfolio_entries` and `cases` (migration `2026_06_23_entry_importance.sql`, nullable `importance` text + CHECK). The `completeness_score` columns are left **dormant** (no reader remains; `lib/utils/completeness.ts` now only exports `missingCompletenessFields`, which still powers the neutral "Missing &lt;field&gt;" list filter). Importance shows on both detail pages, a card pill, and a list filter on /portfolio + /cases.
- **Specialty tagger (Batch 3 + Batch 4): ✅ DONE.** Batch 3 standardised `specialty_tags` → "Linked specialties" (case detail, quick-add, landing mock, `specialty-tag-select` doc comment) and dropped the case-form competency-theme picker (F-017). **Batch 4 (F-046) retired `interview_ready_for` ("Marked ready for") app-wide** — the entry-form control, entry-card badge, detail display, the portfolio "ready" filter, the bulk "Mark IMT-ready" action, the export-targeter union, the public-API columns, the `formatInterviewReady`/`INTERVIEW_READY_LABELS` helpers, and the `interview_ready_for` field on the `PortfolioEntry`/`Case` types are all removed. The DB column is left **dormant** (no reader/writer; import allowlists never accepted it). Net model = two clean ideas: (1) link specialties to an entry (one universal tagger → export/share/filter); (2) track & score a specialty (domain-level points, `specialty_applications`/`specialty_entry_links`, unchanged).
- **Demo seed (Batch 2): ✅ SHIPPED 2026-06-23** (migration `2026_06_23_demo_seed_idempotent.sql`) — `ensureDemoStarterPack` now runs once from `/api/onboarding/complete` (off the dashboard render hot-path, F-031) and is idempotent against the partial unique demo indexes (`{portfolio_entries,cases}_one_active_demo_per_user`, `WHERE is_demo AND deleted_at IS NULL`); the seed insert treats 23505 as a no-op. The dashboard's headline progress surfaces (stat tiles, heatmap, coverage, clinical-area radar, time-since, trends, calendar, rotations, career-welcome `caseCount`, the Trends/Portfolio section gates) now read demo-excluded `realEntries`/`realCases` (F-022); the demo banner + recent-activity feed still surface demos so the user can find/edit them.
- **Calendar feed (Batch 6): ✅ FIXED 2026-06-28** — see the Known Gotchas entry (F-020 select fixed + fail-loud).
- **Account/auth/data flows (Batch 6): ✅ SHIPPED 2026-06-28** — F-037 email-change flow + recycled-institutional-email ledger, F-038 password audit + alert email on both paths, F-009 shared protected-paths allowlist, F-027 share consolidation. See the rewritten Auth/Tiers/Sharing sections + migration `batch6_email_change_institutional_and_notifications`.
- **Legal & site content (Batch 8): ✅ SHIPPED 2026-06-28** — see the rewritten "Legal Entity & Site Content" section below. F-006 sole-trader legal pass (Clerkfolio is a **sole trader, NOT a Ltd** — all "Clerkfolio Ltd / registered in England and Wales" wording removed from privacy/terms/dpa/footer; new single-source `lib/legal/entity.ts` holds proprietor-name / address-for-service / ICO-reference placeholders that render only when filled; 5 `REVIEW: lawyer` markers cleared; referral-program T&C added to terms; stale tier/completeness/"referral Pro" legal copy corrected to the Batch-1/3 reality), F-012 DPA §9 deletion wording softened to match Privacy retention/§12, F-011 all advertised **contact addresses consolidated onto `admin@`** (`noreply@`/digest `hello@` From: senders left alone), F-007 `app/opengraph-image.tsx` share card + root `alternates.canonical`, F-047 Subprocessors Upstash line present + wording de-"public-API"-ed.
- **Import/export + sharing (Batch 4 ✅ rename / Batch 6 ✅ share consolidation):** Batch 4 (F-039) renamed the `/export` page "Export & share" → **"Import & export"** (sidebar, command palette, help, landing mocks all updated), added an **Import tab** (Horus/CSV/JSON launcher), a **`g i` "Import portfolio"** command, and an "Import existing portfolio" CTA on the empty portfolio state; the `/import` landing reads as a general importer (Horus prominent). **Batch 6 (F-027): share management is now one surface** — the **Import & export → Share** tab carries the full action set (Copy / Preview / Renew / Revoke); `/settings/shared-links` is a permanent server redirect to `/export?tab=share`; the settings hub link, the specialty-detail "manage all links" link, and the share auto-revoke email all point there.

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
npm run scan:secrets:all
```

Notes: `npm run build` is the main compile gate. Hooks inject placeholder public env vars for build verification. CI has lint/typecheck/build/unit/e2e jobs; E2E self-skips when required secrets are absent. `scan:secrets` only diff-scans git-STAGED files (pre-commit hook design) — a clean run on a clean tree certifies nothing; use `scan:secrets:all` to scan every tracked file when auditing.

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

`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` enable **cluster-wide** sliding-window rate limiting. Without them every `checkRateLimit` caller falls back to a per-instance (per-lambda) in-memory bucket — weaker, but it **fails soft**. There is no longer a fail-closed path: the public API (the only `requireDistributed` caller) was removed in Batch 5. **F-047 (owner action):** provision an EU-region Upstash Redis in the prod Vercel project to move all limiters off the per-instance fallback — zero code change.

`next.config.mjs` derives `NEXT_PUBLIC_SENTRY_ENVIRONMENT` from Vercel's `VERCEL_ENV` at build time. Do not configure the client environment as the literal string `$VERCEL_ENV`.

`instrumentation.ts` runs a **warn-only** startup presence check for the required-secrets set (`lib/env-check.ts`, audit I-5): in Vercel production only, missing vars are `console.error`ed by name at boot instead of surfacing when a user first hits the degraded route. It must never throw (builds run on placeholder public vars; a lambda that crashes on boot is worse than the degraded behaviour) — keep it warn-only, and add new required secrets to `REQUIRED_PRODUCTION_ENV_VARS`.

## Live Supabase State

Verified read-only with connector on 2026-05-24 for `entry_revisions`; broader table list below should be re-checked before schema work.

- Project ref/name: `dldhnstjngendpcywthv` / Clerkfolio.
- Region/status: `eu-west-2`, `ACTIVE_HEALTHY`.
- DB: Postgres 17.6.1.
- All public tables reported by connector have RLS enabled.
- Public tables previously verified: `profiles`, `portfolio_entries`, `cases`, `deadlines`, `evidence_files`, `goals`, `specialty_applications`, `specialty_entry_links`, `templates`, `arcp_capabilities`, `arcp_entry_links`, `share_links`, `notifications`, `custom_competency_themes`, `audit_log`, `share_views`, `referrals`, `share_access_attempts`, `student_email_verification_tokens`, `snippets`, `personal_log`, `saved_searches`, `api_keys`, `session_fingerprints`, `stripe_webhook_events`, `consumed_institutional_emails` (Batch 6 — RLS-on/no-policy = service-role only; flagged INFO by the RLS-no-policy advisor, intentional).
- `entry_revisions` is intentionally absent as of 2026-05-24. Commit `fcb4f0a` (`fix: ISSUE-011 remove version history`) removed the history UI/API and added `supabase/migrations/2026_05_23_drop_entry_revisions.sql`. Do not recreate it for old test expectations unless version history is explicitly re-scoped as a new feature.
- Edge Function: `scan-evidence`, active, JWT verification enabled.
- Storage bucket `evidence`: private, 50 MB file cap. Bucket allows PDF, JPEG/JPG, PNG, HEIC/HEIF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT.
- App-side upload allowlist in `lib/supabase/storage.ts` is narrower: PDF, DOC/DOCX, XLSX, PPTX, TXT, PNG, JPEG, HEIC/HEIF. Reconcile intentionally before changing bucket or app MIME behavior.

Advisor notes verified 2026-05-20:

- Security warnings: leaked password protection disabled; SECURITY DEFINER functions executable from exposed schema.
- (Update 2026-06-22: the security advisor no longer surfaces `audit_auth_email_change()` / `enforce_specialty_track_cap()` as anon-executable — a positive delta from the 2026-05-20 baseline. The 5 `authenticated_security_definer_function_executable` advisors (`claim_free_pdf_export`, `ensure_profile_for_current_user`, `get_profile_entitlements`, `increment_pro_feature_usage`, `rename_user_tag`) and leaked-password-protection-disabled remain — all previously accepted. Still validate body/grants before changing any SECURITY DEFINER function.)
- (Update 2026-06-28, Batch 6: one new **INFO** advisor — `rls_enabled_no_policy` on `consumed_institutional_emails` (intentional service-role-only table). No new WARN; the new `handle_institutional_email_on_auth_change` trigger fn had its anon/authenticated EXECUTE revoked so it is NOT flagged.)
- Authenticated can execute `claim_free_pdf_export(uuid)`, `ensure_profile_for_current_user()`, `get_profile_entitlements(uuid)`, `increment_pro_feature_usage(uuid,text)`, `rename_user_tag(text,text,text)`, plus the anon-executable functions above. Some are intentional app RPCs; do not blanket-revoke without checking call sites and auth checks.
- Performance advisor reports unused indexes on low-traffic tables. Treat as informational, not automatic cleanup.

## Database Functions And Migrations

Important local migrations:

- `2026_05_15_audit_remediation.sql`: atomic free PDF claim, notification RLS repair, share link hardening.
- `2026_05_16_grant_authenticated_rpcs.sql`: restores grants for user-callable RPCs.
- `2026_05_18_audit_remediation.sql`: profile write guard, signup/profile self-healing, share link RLS, specialty cap, institutional email confirmation.
- `2026_05_18_audit_remediation_phase2.sql`: removes direct storage upload policy, orphan upload cleanup, audit auth email trigger.
- Later local migrations include phase 3/4 audit hardening, active share-link entitlement tracking, and the intentional `entry_revisions` removal. Treat migrations as change history, not as a complete database schema source.
- `2026_06_23_referrals_entitlements_overhaul.sql` (Batch 1): adds `referrals.activated_at` + `profiles.referral_badges`, extends `guard_profile_writes` to protect `referral_badges`, rewrites `get_profile_entitlements` (base+additive, base-ten, 16 cols incl. `referral_count`; DROP+CREATE then `revoke from public/anon` + `grant to authenticated` to restore the authenticated-only posture), and adds the `referral_funnel` view (SECURITY INVOKER).
- `2026_06_23_entitlements_revision_pro_buy_only.sql` (Batch 1 revision, same day): CREATE OR REPLACE `get_profile_entitlements` so `pro_access = tier='pro'` only (Pro buy-only) and the verified bonus is **+400** (was +500); CREATE OR REPLACE `guard_profile_writes` **without** the foundation-gift block; data: null out the dead `referral_pro_until`/`referral_milestones` (also drops the test accounts' legacy referral Pro).
- `2026_06_23_demo_seed_idempotent.sql` (Batch 2): de-duplicates existing active demo rows (keep earliest per user) then adds partial unique indexes `portfolio_entries_one_active_demo_per_user` / `cases_one_active_demo_per_user` (`WHERE is_demo AND deleted_at IS NULL`) so the F-014 seed race can never create a second active demo row. Additive/backward-compatible; no new advisors.
- `2026_06_23_entry_importance.sql` (Batch 3, F-016): adds nullable `importance text CHECK (importance in ('low','medium','high'))` to `portfolio_entries` and `cases` (the user-set rating that replaces the removed completeness signal). Additive/backward-compatible; advisors unchanged (only the 5 pre-existing SECURITY DEFINER + leaked-password warns). The `completeness_score` columns are intentionally left in place (dormant, no reader).
- `2026_06_26_session_fingerprint_idempotent_insert.sql` (Batch 5, F-021): adds `record_active_session_fingerprint(uuid,text,text,text)` — a **SECURITY INVOKER** helper doing `INSERT … ON CONFLICT (user_id, ip_hash, user_agent, COALESCE(session_id,'')) WHERE revoked_at IS NULL DO NOTHING` so the middleware's concurrent active-fingerprint inserts converge as a silent no-op instead of logging `duplicate key` ERRORs (the partial *expression* index can't be targeted by supabase-js `.upsert()`, hence the RPC). EXECUTE revoked from anon/authenticated, granted to `service_role` only (the middleware's caller). Additive; advisors unchanged (no new SECURITY DEFINER warning — it's INVOKER + service_role-only).
- `batch6_email_change_institutional_and_notifications` (Batch 6, 2026-06-28): (1) **drops the stale `notifications_type_check`** — it was missing `referral_reward`/`referral_badge`/`billing`/`payment_failed`/`student_verification_expiring`/`mandatory_training_expiring`/`password_changed`, so those rows silently failed the CHECK (latent F-036 bug); `type` is app-controlled and the read path tolerates any string, so the faulty write-guard is removed rather than chased. (2) adds **`consumed_institutional_emails`** (email_hash PK, user_id FK ON DELETE SET NULL; RLS on, no policies = service-role only) + backfills it from currently-verified institutional emails. (3) CREATE OR REPLACE **`confirm_student_email_token`** adds the recycled-email guard + ledger write (signature unchanged). (4) adds **`handle_institutional_email_on_auth_change()`** + its `AFTER UPDATE OF email ON auth.users` trigger (re-derives institutional verification on a primary-email change). Follow-up migration `batch6_lock_down_institutional_trigger_fn` REVOKEs EXECUTE on the trigger fn from PUBLIC/anon/authenticated (postgres+service_role only) to clear the anon/authenticated SECURITY DEFINER advisor — match this for any future auth.users trigger fn. Advisors after: only a NEW **INFO** `rls_enabled_no_policy` on `consumed_institutional_emails` (intentional — RLS-on + no-policy = deny-all; service-role bypasses), no new WARN.

High-value functions: `claim_free_pdf_export`, `get_profile_entitlements`, `increment_pro_feature_usage`, `guard_profile_writes`, `handle_new_user`, `ensure_profile_for_current_user`, `confirm_student_email_token` (Batch 6: + recycled-email ledger guard/write), `enforce_specialty_track_cap`, `audit_auth_email_change`, `handle_institutional_email_on_auth_change` (Batch 6; SECURITY DEFINER trigger fn, EXECUTE = postgres+service_role only), `rename_user_tag`, `record_active_session_fingerprint` (Batch 5; INVOKER, service_role-only).

## Auth And Middleware

`middleware.ts` applies security headers/CSP, rewrites `*.clerkfolio.site` to showcase pages, rewrites stale `POST /onboarding` to `/api/onboarding/complete`, refreshes Supabase SSR sessions, records `session_fingerprints` with service role when configured, redirects protected routes to login, enforces onboarding, and protects `/update-password` with the HTTP-only `cf_recovery` cookie.

Auth notes:

- `/auth/callback` handles Supabase confirmation/recovery and sets `cf_recovery` only for password reset flow.
- Login/reset messaging is generic to reduce enumeration.
- `/api/auth/preflight` rate-limits signup/login/reset but direct Supabase Auth limits still matter. Login keys include both network IP and a SHA-256 hash of normalized email to avoid hospital/university shared-network lockout.
- `/api/account/password` verifies the existing password, updates through admin auth, creates a fresh current SSR session with the new password, and requests revocation of other sessions. Do not replace this with a bare admin update. **Both** password-change paths now write an audit row **and** fire a "your password was changed" alert (in-app notification + email) via `notifyPasswordChanged` (`lib/notifications/password-changed.ts`, F-038): in-app change = `password_changed` audit + notify; the reset-link path (`/update-password` → `POST /api/account/password-reset-complete`) = `password_reset` audit + notify.
- **Email change (F-037):** `POST /api/account/email` gates an email change behind a current-password reauth, then calls `supabase.auth.updateUser({ email })` to send Supabase's confirmation link. The login email only changes when the link is confirmed; that swap (on `auth.users.email`) fires two `AFTER UPDATE OF email` triggers — `audit_auth_email_change` (`auth_email_changed` audit row, hashed emails) and `handle_institutional_email_on_auth_change` (re-derives institutional verification, below). `email_change` is re-enabled in `/auth/confirm`'s `ALLOWED_OTP_TYPES`; the confirm page routes email_change to `/settings?email=changed` and does NOT call the institutional-claim route (the trigger handles it). The settings Email field is now editable via a "Change email" panel (new email + current password). The outcome is correct regardless of the Supabase email-template style, because the side-effects are trigger-driven, not confirm-page-driven.
- **Recycled-institutional-email ledger (F-037):** `consumed_institutional_emails` (email_hash = unsalted sha256 of lower(email)) permanently binds every verified institutional email to the first account that verified it. A released/recycled `.ac.uk` or NHS address can never be re-verified by a different account (a null `user_id` after account deletion = permanently locked). The guard is enforced in `confirm_student_email_token` (SQL), `claimVerifiedInstitutionalAuthEmail` + `/api/student-email/send-verification` (TS via `lib/institutional-email-ledger.ts`), and the email-change trigger. All three verification write-paths also insert into the ledger on success.
- **Protected-page allowlist is one shared constant (F-009):** `lib/auth/protected-paths.ts` (`PROTECTED_PAGE_PREFIXES` / `isProtectedPagePath`) is imported by BOTH `middleware.ts` (`isKnownProtectedPage`) and the login page (`safeNextPath`) so a deep-link middleware bounces to `/login?next=` (incl. `/arcp`, `/logs`, `/help`) is honoured after login instead of being dropped to `/dashboard`. Add new authenticated page prefixes there, not in two places. `/pricing` and `/faq` now route logged-in users to `/upgrade` / `/help` instead of a dead `/dashboard#…` anchor.
- Sidebar logout attempts global sign-out; if Supabase global revocation fails upstream, it still performs best-effort local sign-out and redirects with an explicit warning.
- Confirmed `.ac.uk`/NHS signup addresses are claimed through `lib/institutional-auth-email.ts` from both PKCE callback and token-hash OTP confirmation paths, then tier is re-derived by `recompute_profile_tier`. Do not restore a second same-inbox verification step.
- Password-reset confirmation warns before replacing an existing browser session; keep that explicit account-switch acknowledgement in recovery flows.
- The onboarding screen has a "Not you? Sign out" control in its header (global sign-out with local fallback, same pattern as the sidebar) so a user who auto-logged-in after confirming the wrong account is not trapped by the onboarding redirect. It also clears the `clerkfolio-onboarding-draft` localStorage key on sign-out.
- Avoid `user_metadata` for authorization. It is user-editable; use DB/app metadata for authz decisions.

## Tiers And Entitlements

**Reworked in Batch 1 (2026-06-23; migrations `2026_06_23_referrals_entitlements_overhaul.sql` then `2026_06_23_entitlements_revision_pro_buy_only.sql`).** Entitlements are **base + additive grants** in `get_profile_entitlements`, **base-ten units (1 GB = 1000 MB)**. Entitlement tiers collapse to **free vs pro**; `SubscriptionInfo.tier` (`lib/subscription.ts`) is `'free' | 'pro'` and means the **billing tier** (`'pro'` ⇔ a real Stripe subscription).

- **Storage numbers live in ONE place: `lib/entitlements/limits.ts`** (BASE 100, VERIFIED_BONUS 400, PRO 5000, REFERRAL_STORAGE_BONUS 250 @ 5). The RPC mirrors these literals in SQL (keep in sync); all UI/marketing copy **computes** from the constants — do not hardcode storage strings.
- **Pro is BUY-ONLY.** `pro_access` (effective Pro) = `profiles.tier='pro'` (Stripe) **only** — referrals and the (now-removed) foundation gift grant **no Pro**. `planProvenance()` is just stripe (→ "Manage billing") vs free (→ "Upgrade"); there is no referral/gift Pro state. `referral_pro_until` is dead (cleared; no writers remain).
- Pricing source: `lib/marketing/pricing.ts` (Free / **Verified** / Pro), storage strings computed from `limits.ts`. Pro is GBP 9.99/year.
- **Storage quota = base + additive:** `(pro ? 5000 : 100)` **+400** if institutionally verified **+250** at ≥5 rewarded referrals. Examples: free 100; verified 500; verified + 5 referrals 750; Pro 5000; Pro + verified 5400; Pro + verified + 5 ref 5650. `storage_used_mb` is base-ten (`bytes / 1e6`); `/api/upload/authorize` compares base-ten.
- **`is_student`** (RPC) / **`isVerified`** (SubscriptionInfo) = institutionally verified via **either** route (`.ac.uk` student OR NHS doctor), keyed off the verified-email flag — NOT the old `student`/`foundation` tier label. One verified email slot per account ⇒ one +400.
- **PDF / share allowance** for free users = `1 + rewardedReferralCount` each (derived in the RPC; +1 per rewarded referral, unbounded). Pro = unlimited.
- `profiles.tier` still physically stores `student`/`foundation`/`free`/`pro` (written by `recompute_profile_tier`/`confirm_student_email_token`, unchanged) but those labels **no longer drive entitlements**. **FY1/FY2 is a career stage** (drives ARCP/onboarding), not an entitlement tier. (The 90-day foundation-gift was removed from `guard_profile_writes`.)
- `lib/subscription.ts` calls `get_profile_entitlements` (16 cols incl. `referral_count`) and fail-closes gated booleans on RPC/null drift.
- Institutional email domains include `.ac.uk`, `nhs.net`, `hscni.net`, `.nhs.uk`, `.nhs.scot`, `.wales.nhs.uk`.
- **Referral overhaul (F-002):** rewards accrue to the **referrer** only. Lifecycle `pending → activated → completed` in `referrals` (+ `activated_at`): attribution at signup; **activation** when the referred completes onboarding + ≥1 real (non-demo) case/entry AND the **referrer is institution-verified** (referred need NOT be); reward **vests 7 days** after activation via the `referral-vesting` cron, which awards recognition badges (`profiles.referral_badges`: connector/advocate/champion/ambassador + time-limited founding_sharer) and fires notifications + email. **No Pro is granted** — the reward currencies are the +1 PDF/+1 share per referral and the +250 MB at 5, both **derived in the RPC** (not stored counters). Single source: `lib/referrals/constants.ts` (ladder, `FOUNDING_SHARER_WINDOW_END` placeholder — owner sets at launch). `referral_funnel` VIEW = owner growth-attribution (signups→activation→reward→14d retention). Over-quota policy: **never delete data; a full quota blocks new uploads only, existing files stay readable** (storage meter `components/upgrade/storage-meter.tsx`, F-040).
- Generic reward/account notification plumbing: `lib/notifications/create.ts` (`createNotification` = in-app row + optional Resend email via `noreply@`; `transactionalEmail` template). Batch 6's F-038 password-change email reuses this.

## Stripe

Files: `lib/stripe.ts`, `app/api/stripe/checkout/route.ts`, `portal/route.ts`, `webhook/route.ts`.

- Stripe SDK: `stripe` v22.x; API version in code: `2026-05-27.dahlia`.
- `lib/stripe.ts` exports `getStripe()` (lazy singleton), not a module-scope client: stripe v17+ throws on a missing secret key at construction, which breaks `next build` page-data collection where only placeholder public env vars exist. Do not revert to `export const stripe = new Stripe(...)`.
- Checkout/portal validate origin and use `NEXT_PUBLIC_APP_URL` for redirects; never trust request origin for billing redirect URLs.
- Checkout creates/reuses customers, subscription checkout, promotion codes allowed.
- Webhook verifies signature and uses `stripe_webhook_events` for idempotency.
- Paid access is `active`, `trialing`, or `past_due`. On downgrade (subscription deleted or updated to non-paid), the webhook writes a non-pro tier and then calls `recompute_profile_tier` to restore `student`/`foundation` for users who still qualify - the RPC deliberately never demotes `pro`, so the webhook owns that transition. Keep `recompute_profile_tier` as the only deriver of non-pro tiers; do not hardcode tier values in new write paths.
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

Do not reintroduce direct user storage INSERTs. Clean signed downloads only (`scan_status='clean'`). Storage caps are **base + additive** (see "Tiers And Entitlements"; numbers live in `lib/entitlements/limits.ts`): free 100 MB, verified 500 MB, Pro 5000 MB (+250 @ 5 referrals), base-ten; max file 50 MB.

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
- Audit trail: create emits `share_link_generated`, access emits `share_link_viewed`, revoke (`DELETE /api/share`) emits `share_link_revoked` (service-role insert, gated on a real owner-scoped active-link revoke via `.eq('revoked', false)` so repeat/no-op revokes don't duplicate rows), and expiry extension (`PATCH /api/share`) emits `share_link_extended` - extensions are unlimited by design (owner's own link), so the audit row is what keeps the trail honest about a link's true lifetime.
- `/api/share/access` also has an endpoint-wide per-IP limiter (`share-probe`, 30/min via `checkRateLimit`) BEFORE any DB work - the DB-backed limits only count rows written on PIN failure/success, so the PIN-required probe (token, no pin) was otherwise unmetered.
- Webhooks must pass public-host SSRF checks at create and send time, no redirects, 3s timeout.
- Public share output is noindex/nocache and can redact notes/reflections/tags.
- **One share-management surface (Batch 6, F-027):** the **Import & export → Share** tab (`/export?tab=share`) is canonical — Copy / Preview / Renew / Revoke. `/settings/shared-links` is a permanent server redirect to it (no second surface to drift). The export page reads `?tab=` to deep-link the Share tab.

## Import And Export

The `/export` page is titled **"Import & export"** (Batch 4, F-039) with four tabs: **Import** (a launcher linking to `/import`, `/import/csv`, `/import/json` — Horus prominent), **Application PDF**, **Data backup**, **Share links**. Import is also reachable via the `g i` command-palette command, the empty-portfolio "Import existing portfolio" CTA, and the renamed sidebar entry. `/import` is the general-importer landing (Horus wizard default; CSV/JSON sub-flows). Bulk import is Pro (gated server-side in the import routes).

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
- Shared import boilerplate lives in `lib/import/shared.ts` (audit L-7): `IMPORT_RATE_MAX`/`IMPORT_RATE_WINDOW_SECONDS`, `isRecord`, `copyInsertable`. Change the shared budget/shaping there, not per-route; the per-format column allowlists rightly stay in each route.
- JSON import (audit M-3): the four table inserts are independent calls, not a transaction. ALL four tables (incl. deadlines + goals) are deduped against existing rows so retry-after-partial-failure never double-inserts, and any insert failure returns per-table `results` (inserted count + error) instead of a bare 500.
- Horus date parsing (audit M-4): the free-text date fallback reads the calendar date back with LOCAL getters, never `toISOString()` — the UTC round-trip rolls dates back a day on any non-UTC runtime (masked today only by Vercel's TZ=UTC).

## Specialties And ARCP

- Specialty configs live in `lib/specialties/*.ts`, gathered by `lib/specialties/index.ts`; types in `lib/specialties/types.ts`; deadlines in `deadlines.ts`.
- **Scope is ST1/CT1 entry-level only (2026-07 decision)**: Clerkfolio's users are FY1/FY2 doctors applying to entry-level specialty training, not post-core-training higher specialty (ST3/ST4). The 6 higher-specialty configs (Plastic Surgery ST3, Cardiology ST4, T&O ST3, Dermatology ST3, EM ST4, General Surgery ST3) were removed; `tests/lib/specialties/config-invariants.test.ts` pins a denylist so they can't silently reappear. `TrainingLevel`/`trainingLevel` was removed from the type/config shape since every remaining config is entry-level.
- Current config set (21) covers 2026 IMT, Ophthalmology, ACCS EM/AM/Anaes, CST, Core Psych, GP, Paeds, Radiology, Anaesthetics, O&G, Public Health, Histopathology, Neurosurgery, Cardiothoracic, OMFS, Child & Adolescent Psych, CSRH, Psych Learning Disability, PH+GP dual.
- **Selection-process taxonomy (2026-07)**: `SpecialtyConfig.selectionProcess` (optional, additive) captures *how* a specialty actually shortlists/scores candidates - `SelectionProcessFamily` (`self_assessment_points` / `assessor_scored_written` / `portfolio_graded_interview` / `msra_interview` / `msra_only` / `multi_stage_selection_centre`), an ordered `stages` array (with optional `weightPct`/`weightLabel` - never fabricate a weight that isn't officially published), and an optional `recruitmentOffice` (e.g. RCPCH, ANRO, GP National Recruitment Office, IMT Recruitment) when the scoring body differs from the generic NHS person-spec cited in `source`. This is presentation/context only - it does not change `scoringType`/`isEvidenceBased()` or the scoring math. Rendered via `components/specialties/selection-process-strip.tsx` (compact on cards + the add-specialty modal, full on the detail page) and surfaced as a family label in both compare views. `add-specialty-modal.tsx` groups available specialties by family instead of the old entry/higher split.
- Scoring supports `points` and `evidence`; domain rules include `highest`, `cumulative_capped`, checkbox, and self-assessed. Bonus points only count when `bonus_claimed`.
- Recruitment dates are time-sensitive; verify official sources before updating 2026 deadlines.
- ARCP capabilities are stored in `arcp_capabilities`; FY1/FY2 users see ARCP nav; links attach portfolio entries to capability keys. ARCP visibility is gated to `FY1`/`FY2` consistently across the sidebar (`getNavItemsForStage`), the command palette (`commandsForStage` in `global-search.tsx`), and the `/arcp` page itself (which renders "ARCP not available" for other stages). Keep these three in sync.
- The ARCP links API (`/api/arcp/links`) deliberately does NOT check career stage server-side: ARCP is a visibility-only feature over the user's own data with no entitlement value, and a user transitioning stage keeps their existing links. The FY1/FY2 gate is intentionally UI-only - do not re-flag this in audits, and do not treat it as the pattern for entitlement-bearing features.
- `SpecialtyConfig.totalMax` is the official DOMAIN maximum (e.g. IMT "maximum of 30 points across the domains"); commitment bonuses (`bonusOptions`) sit ON TOP of it. Display sites show `calculateDomainsScore()` against `totalMax` with the bonus as a separate "+N" chip - never divide `calculateTotalScore()` (domains + bonus) by `totalMax`, which reads "35/30 pts (117%)". `tests/lib/specialties/config-invariants.test.ts` pins this and other config invariants for all configs.

## Cron

Configured in `vercel.json`, region `lhr1`:

- Daily: notifications 09:00, streak-cache 02:00, purge-deleted 02:00, expire-share-links 01:00, purge-orphan-uploads 03:15, referral-vesting 08:00.
- Weekly: weekly-digest Saturday 09:00, purge-audit-log Sunday 03:00, purge-stale-tokens Sunday 04:00.
- Monthly/yearly: monthly-digest day 1 09:00, year-in-review Jan 2 09:00.

All cron routes should call `validateCronSecret` before service-role work.
Missed `expire-share-links` invocations observed on 2026-05-25 prompted a Vercel runtime/dashboard investigation. Update 2026-06-22: a successful run is confirmed in the api logs (PATCH `share_links … revoked_at is null` → 204 at ~2026-06-20 01:54 UTC, i.e. ~54 min after its 01:00 slot — Vercel scheduler drift, not a miss). Not currently reproducing; keep monitoring, and do not alter schedules without evidence from platform logs.

## Public API (REMOVED pre-launch — Batch 5, F-026)

The read-only public developer API was **removed entirely on 2026-06-26**. It had shipped visibly-broken (HTTP 503 at launch because Upstash was unconfigured) and wasn't needed for users, so the decision was to delete it rather than provision Upstash for it. Gone: `/settings/api`, the whole `app/api/v1` tree (`/api/v1/me/{portfolio,cases,deadlines,goals,specialties}`), `/api/settings/api-keys`, `lib/public-api.ts`, `lib/api-keys.ts`, the settings-hub "API access" link, and the middleware `/api/v1/me/` allowlist entry. The `requireDistributed`/`isPublicApiOnline()` rate-limit branches went with it (the public API was their only caller; `lib/rate-limit.ts` keeps a now-vestigial `unavailable` field that the export/feedback/calendar routes still read — always falsy → 429).

- The `api_keys` **table is left dormant** (not dropped) — no reader/writer remains except the GDPR account-export (`POST /api/account/export`), which still includes a user's own key metadata for Art. 20 completeness (`hash` excluded). Any pre-launch test keys are inert.
- Do not reintroduce a public API without re-provisioning cluster-wide rate limiting (Upstash) first.

## Privacy And Account Lifecycle

- GDPR export ZIP includes profile, portfolio, cases, deadlines, goals, specialties, ARCP links, templates, clean evidence, personal logs, audit, share links, notifications, revisions, custom themes, snippets, searches, sessions without IP hash, referrals, API key metadata.
- GDPR export evidence failures are never silent (audit M-1): the download loop runs BEFORE the manifest is built, `manifest.contents.evidence_files` counts files actually written into the ZIP (not the pre-download budget), download failures are listed in `evidence/FAILED.txt` + a manifest note (over-size-cap skips stay in `SKIPPED.txt`). Keep the manifest honest if the download flow changes. Malformed JSON bodies get a 400 via the standard `badJson` (L-8); a fully EMPTY body still means "defaults" because the settings page POSTs with no body.
- Account deletion requires exact `DELETE` + current-password reauth, attempts Stripe cancel-at-period-end first, swallows only Stripe `resource_missing`, chunks evidence storage deletes, then deletes Supabase auth user.
- Account deletion fails LOUD on billing risk (audit H-1): a live `stripe_subscription_id` with **no `STRIPE_SECRET_KEY` configured** blocks deletion with the same 422 as a Stripe API failure — never let deletion proceed past an uncancellable subscription (silent billing orphan, no DB pointer left). A mid-sequence storage-removal failure returns a distinct "partial deletion" message (Stripe cancel already committed, auth user survives; retry is safe/idempotent) so support can recognise the half-deleted state.
- Offline cache/service worker are cleared on logout.

## Legal Entity & Site Content

**Reworked in Batch 8 (2026-06-28; F-006/F-012/F-011/F-007/F-047 rider).**

- **Clerkfolio is a sole trader, NOT an incorporated company.** All "Clerkfolio Ltd / registered in England and Wales" wording was removed from `app/privacy`, `app/terms`, `app/dpa`, and `components/legal/legal-footer.tsx`. **Do not reintroduce "Ltd"** (Companies Act 2006 s.65 prohibits it without incorporating).
- **Single source of legal-entity disclosure: `lib/legal/entity.ts`** (`LEGAL_ENTITY`). Holds `operatingName`, and **owner-fill placeholders** `proprietorName` / `addressForService` / `icoReference` (each renders **only when non-empty**, so blanks are omitted — no `[placeholder]` text reaches users), plus `contactEmail` (`admin@`). **Owner must fill the three placeholders before public launch** (Business Names proprietor name + address for service; ICO data-protection registration reference). The privacy + DPA pages read these conditionally.
- **All four `REVIEW: lawyer` markers cleared** (privacy ICO/address, dpa entity, terms refund + liability). The clauses stand; a solicitor sign-off remains an **owner action** — clearing the markers does not substitute for it.
- **Referral-program T&C** added to `app/terms` ("Referrals and rewards": rewards have no cash value, non-transferable, may be revoked for abuse). Stale legal copy was corrected to the live model: the Terms plan table is now **Free / Verified / Pro** computed from `lib/entitlements/limits.ts` (no more "Student 1 GB / Foundation / referral Pro"), and "completeness" → "importance".
- **DPA §9** deletion wording softened (F-012) to match the Privacy retention section + DPA §12 (live systems promptly; backups purged ≤30 days; legally-required records kept) — no more "immediately and permanently removes all".
- **One advertised contact address: `admin@clerkfolio.co.uk`** (F-011). The crash page (`global-error.tsx`), account-deletion failure messages (`api/account/delete`), the security page + `/.well-known/security.txt` + privacy vuln line (was `security@`), and the subprocessors page (was `subprocessor-changes@`) all point at `admin@`. **`noreply@` (feedback/student/share From: sender) and the digest/notification `hello@` From: senders are sending identities — leave them.**
- **Share card: `app/opengraph-image.tsx`** (F-007) — a Next `ImageResponse`/Satori card reusing the brand logo's inline-SVG (bar-chart + check) + "Clerkfolio" wordmark on the `#0B0B0C` card (1200×630). Next auto-wires `og:image` + `twitter:image` from the file convention (previously `twitter:card=summary_large_image` had no image). Root metadata (`app/layout.tsx`) now sets `alternates.canonical: '/'`.
- **F-047 (owner action, still owed):** provision EU Upstash. The Subprocessors/privacy/dpa/security Upstash copy no longer says "public API endpoints" (the public API was removed in Batch 5) — it now reads "API and authentication endpoints".

## Security Patterns To Preserve

- Validate origin on mutating routes using `validateOrigin`.
- Use `safeJsonBody` / `badJson` where body shape matters.
- Client components call `/api/*` through `apiFetch` (`lib/api-fetch.ts`), never bare `fetch` - a bare fetch rejects on network failure and strands the pending flag ("Generating…") until reload. `apiFetch` never throws; `status === null` means network failure (use `NETWORK_ERROR_MESSAGE`), `parse: 'none'` keeps the body unread for blob downloads.
- Extract caller IPs with `requestIp` (`lib/request-ip.ts`) - the single source of truth; do not hand-roll `x-forwarded-for` parsing in routes.
- Use allowlists for import/write columns.
- Keep service-role work behind auth/owner/origin/rate checks.
- Keep RLS narrow and table-specific; remember UPDATE also needs SELECT visibility.
- For SECURITY DEFINER functions in exposed schema, inspect grants and auth checks before changing.
- Never log patient-like text, full tokens, IPs, customer IDs, secrets, or clinical notes.
- Keep share webhook SSRF guards and no-redirect fetch behavior.
- `console.error` with `err instanceof Error ? err.message : 'unknown'`, never the raw error object (audit L-1): SDK/fetch errors can carry `.config`/`.request`/`.response` embedding the original payload (emails, share tokens) into platform logs.
- Client components with overlapping async requests (mount + resubmit, debounced search) need a generation counter so stale completions no-op instead of last-write-wins (audit L-3/L-4 pattern: `public-share-client.tsx`, `global-search.tsx`).

## Testing Guidance

Existing coverage includes unit tests for CSRF, rate limit fallback/headers, subscription entitlement mapping/fail-closed behavior, specialty scoring, share PIN/token hashing, institutional email validation, and referral rewards. Playwright covers signup/onboarding/first entry, password reset, Stripe checkout test mode, PDF quota, PIN share links, and GDPR export/account delete.

Use focused tests by blast radius:

- Pure logic: Vitest under `tests/lib`.
- UI/dashboard workflows: Playwright.
- Supabase schema/RLS: migration plus connector/advisor verification.
- Stripe: test mode only; verify checkout, signature, idempotency.
- PDF/export: local build plus deployed/Vercel-like file tracing when possible.
- Upload/share: test bypass, lockout, expiry, revocation, redaction, SSRF, cleanup.

Known test gotcha: check `e2e/fixtures/global-setup.ts` before relying on cleanup; old references to `share_access_logs` would be stale because live schema uses `share_access_attempts`. (Verified 2026-06-22: the live file already uses `share_access_attempts` with an explanatory comment — this gotcha is resolved, kept as a guard against regressions.)

## UI Conventions

Dense, professional medical dashboard. **Two themes via CSS custom properties (cream default · dark opt-in) — see "Theming" below.** Brand blue `#1B6FD9`. Use existing `components/ui`, feature folders, dashboard providers, sidebar/mobile nav/FAB/command palette patterns. Avoid patient-identifiable example copy.

## Theming (cream default · dark opt-in)

Added in the colour-scheme migration (2026-06-29; from the Claude Design "Clerkfolio Theme Handover" bundle). **Cream is the default theme for everyone (app + marketing); dark is opt-in from Settings → Appearance.** Driven entirely by CSS custom properties — **never hard-code a raw colour again; always use a token.**

- **Token source of truth: `app/globals.css`.** `:root` holds the CREAM palette (default); `html[data-theme="dark"]` overrides every token with the CURRENT dark values (transcribed so dark is visually unchanged). Roles: `--bg-canvas/surface/raised/sidebar/sunken/hover/active`, `--bg-overlay-{faint,soft,strong}` (was translucent-white elevation), `--border-{subtle,default,strong}`, `--text-{primary,secondary,muted,faint,on-accent,inverse}`, `--bg-inverse` (intentionally inverted light buttons), `--accent[-hover/-bright/-text/-soft/-soft-text]`, `--info-*`, `--success/-warning/-danger`, `--shadow-{sm,md,lg}`, `--accent-gradient`/`--danger-gradient` (display-headline bg-clip-text), and the category set `--cat-{blue,green,amber,rose,violet,cyan,pink,red,teal,indigo,fuchsia,neutral}[-soft/-border/-text/-dot]`.
- **Tailwind tokens (`tailwind.config.ts`) now resolve to these vars** (`surface-*`, `ink[-soft/-dim]`, `fg-{1..4}`, `accent`, `border-{subtle,default,strong}`, `pill-*`, `boxShadow card/elevated/modal`). So `bg-surface-2`, `text-ink`, `border-default`, etc. flip automatically. NOTE: most are plain `var()` colours → **Tailwind opacity modifiers (`/50`) don't work on them**; use a dedicated token or `bg-[var(--…)]`. **EXCEPTION — the brand accent supports opacity** (see next bullet).
- **Brand accent is single-source via an RGB-channel token (2026-06-30).** `--accent-rgb` in `:root`/globals.css is the ONE place the brand accent lives; `--accent`/`--blue`/`--focus-ring`/`--nav-active-*` derive from it (`rgb(var(--accent-rgb))`) and the Tailwind `accent` DEFAULT is `rgb(var(--accent-rgb) / <alpha-value>)`, so `bg-accent`, `bg-accent/15`, `border-accent/40`, `text-accent/80` all work and trace to that one line. The codemod (`48dc628`) swept all 153 `*-[#1B6FD9]` arbitrary values → `*-accent`. **NEW accent tints MUST use `bg-accent/NN`, NOT `bg-[#1B6FD9]/NN`.**
  - **The two themes now use DIFFERENT accent hues (`71f8909`, blue-free cream — owner choice):** cream `:root` `--accent-rgb: 138 90 43` (#8A5A2B **warm bronze**); dark keeps `--accent-rgb` blue (inherited/overridden to 27 111 217). The cream accent family (`--accent-text/-soft/-soft-text/-bright/-hover`, `--info-*` panel, `--accent-gradient`) was retuned to bronze; dark block untouched. **Intentionally KEPT blue in BOTH themes (NOT brand accent — do not "fix"):** the decorative category palette (`--cat-*`, incl. `--cat-blue`; `category-tile-grid` Reflection; `stat-tile` `blue` variant) and the specialty **radar data-viz** (`specialty-radar.tsx`/`specialty-detail.tsx` bare `#1B6FD9`/`rgba(27,111,217,…)`), plus brand chrome: the **sidebar/marketing logo SVG**, favicon/`icon*`/`opengraph-image` server routes (browser-tab/social, theme-independent), email-template HTML, the PDF renderer, and standalone `global-error`/`/r/[code]`. Everything else brand-accent flows through `--accent-rgb` (incl. SVG icon strokes now via inline `style={{ stroke: 'var(--accent)' }}`, and the error/404/contact primary buttons via `var(--button-primary-bg/-text)`).
- **Raw literals were swept to `bg-[var(--token)]`/`text-[var(--token)]` etc.** via a channel-aware codemod (text vs surface vs border). The category pill system routes through `colourClasses()` in `lib/specialties/colours.ts` (now emits `var(--cat-*)`). `text-white` (on blue fills) and `bg-black/XX` (modal scrims) were intentionally LEFT — they read on both themes.
- **No-flash init:** an inline `<head>` script in `app/layout.tsx` stamps `data-theme="dark"` from `localStorage['cf-theme']` before first paint (cream = no attribute). The forced `<html className="dark">` is gone. `lib/theme.ts` is the runtime API (`applyTheme`/`getStoredTheme`/`Theme`).
- **Persistence:** the Settings → Appearance toggle applies instantly and saves `theme` into the existing `profiles.display_prefs` JSON (NO migration — same column as accessibility prefs) so it follows the user across devices; `components/accessibility/preferences-applier.tsx` reconciles the saved choice on load. High-contrast mode (`globals.css`) is now theme-aware (dark → black/white, cream → stark warm).
- **Intentionally literal (can't use vars):** server-rendered image routes (`app/icon*`, `apple-icon`, `opengraph-image`), `app/global-error.tsx` + `app/r/[code]` standalone HTML (set to cream literals), transactional PDF/email routes, the brand logo SVG + marketing window-chrome bezel (brand/device chrome, theme-independent by design), and the Settings theme-preview swatches.
- **Primary/CTA buttons are ink-on-cream in cream theme (2026-06-30 owner override of the handover doc's "blue buttons in both themes" rule and the Batch-7 white-on-blue rule above).** `--button-primary-bg/-bg-hover/-text` (`globals.css`): cream = dark ink fill (`#26241E`) + cream text (`#F5F1E1`); dark theme is unchanged brand blue + white. Applies to ~81 solid CTA buttons (Save/Quick log/Log case/etc., matched by `bg-[var(--accent)]` or `bg-blue-500` co-occurring with `text-white` in the same className) plus the FAB (`components/ui/fab.tsx`, inline SVG so not class-matched). Brand blue is NOT removed elsewhere — links (`--accent-text`), focus rings, category dots, soft accent-tinted badges/chips/banners (`bg-[#1B6FD9]/NN` style) all stay blue in both themes; only solid-fill primary-action buttons flip. New primary buttons must use `bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)]`, not `bg-[var(--accent)] text-white`.
- **A few persistent (non-hover) border-only blue card accents were muted on cream** (Settings "Career stage"/"Referral code" cards, the Horus-import highlight card, the three import-landing "Bulk import is Pro" cards, the sidebar "you are here" left-border + tint via new `--nav-active-border`/`--nav-active-bg`): the literal opacity that read as a subtle tint on the old near-black canvas reads as a vivid ring on cream. Dark theme keeps the original values exactly. Hover-only blue border states (e.g. `hover:border-[#1B6FD9]/40`) and the loading-spinner ring were left alone — only persistently-visible accents were softened.

**Design system (Batch 7, 2026-06-28 — design/branding/a11y pass; F-010/F-033/F-034/F-013/F-008):**
- **One primary colour: brand blue `#1B6FD9`. Teal is retired** — the Tailwind `accent` token (`tailwind.config.ts`) now *equals* brand blue (was teal `oklch(0.82 0.13 195)`), so every `text-accent`/`bg-accent` renders blue; the 404/error system pages (`not-found.tsx`, `error.tsx`) and the landing hero/footer italic gradients were de-tealed to a blue gradient (`oklch(.. 250)`). Don't reintroduce teal as a primary/accent colour (the multi-colour `pill-*` category palette, incl. `pill-teal`, is a separate decorative system and is unaffected).
- **Primary buttons are white-on-blue, always.** Dark text/glyphs on blue (`text-[#0B0B0C]`/`text-surface-0` on `bg-[#1B6FD9]`/`bg-blue-500`) failed WCAG AA (4.05:1); ~80 buttons/pills/chips app-wide + the FAB glyph were flipped to `text-white`. New blue buttons must use white text. (Dark text on light/emerald backgrounds, e.g. the CV-download `bg-[#F5F5F2]` button and emerald "done" chips, is correct and was left alone.) **SUPERSEDED for primary/CTA buttons specifically by the cream-theme migration below — primary buttons are now ink-on-cream in cream theme, brand-blue in dark theme.** This rule still governs dark theme and any non-button blue usage (links, focus rings, category dots, soft accent tints) in both themes.
- **High-contrast mode actually lifts muted text now.** `body.theme-high-contrast` (`globals.css`) raises the `ink`/`fg` muted tiers and every `text-[rgba(245,245,242,…)]` grey to `rgba(255,255,255,0.92)` (icons inheriting `currentColor` follow). It's no longer panels/borders only — keep new muted-text utilities within those token families so the toggle keeps working.
- **Modals use `useFocusTrap` (`lib/hooks/use-focus-trap.ts`).** The command palette (`global-search.tsx`), feedback modal and notifications dropdown (`sidebar.tsx`) are `role="dialog" aria-modal="true"` + label, trap Tab, restore focus on close (Esc closes via the hook's `onEscape`; the palette keeps its own Esc/arrow handler). The palette input is a labelled `role="combobox"` with `aria-activedescendant` over a `role="listbox"` of `role="option"` results. Give any new modal the same treatment + `tabIndex={-1}` on the dialog root (also opts it into the mobile `[role="dialog"]` max-height rule).
- **Public nav** (`landing/nav.tsx`): no `v0.1`/beta badge (F-013); the desktop link row is `lg:flex` (not `md:`) so it can't collide with "Log in" in the 768–1023px tablet band (F-008). The **broad mobile/responsive sweep remains deferred** (owner) — a known post-launch gap, not a launch gate.

Optional Vercel Analytics is off by default and configured from the footer `Analytics preferences` control; do not restore a first-visit blocking consent modal while only essential storage loads by default.

Sentry (error/performance monitoring) is classed as strictly-necessary diagnostics (legitimate interest), runs always-on (not behind the Analytics-preferences toggle), and uses no session replay, no default PII, and no cookies (`instrumentation-client.ts` scrubs events; EU `de` ingest region). It is disclosed on the Subprocessors page and in a dedicated cookie-policy section. Keep that disclosure accurate if the Sentry config or consent model changes.

## Known Gotchas

- `CLAUDE.md` is tracked; `.claude/`, `HANDOVER.md`, and `/docs/` are ignored.
- Supabase live schema is the source of truth when local migrations and `CLAUDE.md` disagree. The local `supabase/migrations` folder does not contain every historical schema creation statement.
- Windows console may display UTF-8 comments as mojibake; do not rewrite source just for display artifacts.
- `next.config.mjs` has long PDF tracing includes and `serverExternalPackages` for React/PDF compatibility. Ugly but intentional.
- `lib/pdf/portfolio-pdf-runtime.cjs` is dynamically loaded; static tracing will miss it without explicit includes.
- Upstash missing in production means a per-instance (per-lambda) in-memory rate-limit fallback for **all** routes — weaker than cluster-wide but it fails soft. (The HTTP 503 fail-closed public API-key path was removed with the public API in Batch 5; F-047 tracks provisioning EU Upstash.)
- Student email verification sends email before writing token/profile sent timestamp to avoid pending-with-no-email states.
- Share link creation and notifications insert use service role by design after checks.
- Session fingerprint maintenance is service-role in middleware; revoke route uses service role after owner check. Maintenance (lookup, revocation check, last_seen_at write) is throttled to once per 5 minutes per session via the HTTP-only `cf_fp_seen` cookie, so session revocation takes effect within 5 minutes rather than instantly - an accepted latency trade-off; do not "fix" it back to per-request. The active-fingerprint INSERT goes through the idempotent `record_active_session_fingerprint` RPC (`ON CONFLICT … DO NOTHING`) so concurrent first-requests converge silently instead of logging duplicate-key ERRORs (F-021); don't revert it to a bare `.insert()`.
- Do not reintroduce segment `loading.tsx` boundaries beneath authenticated settings routes without hard-navigation testing; the prior streaming boundary stranded settings payloads behind a permanent skeleton.
- (Batch 6, 2026-06-28 — F-020 FIXED) `GET /api/calendar/feed/[token]/route.ts` previously selected a non-existent `deadlines.updated_at`, so the query errored and the route silently returned 200 with only config deadlines — dropping every user-created Timeline deadline from the ICS. The select is now `id, title, due_date, details, location, source_specialty_key` (exactly what the `VEVENT` builder + auto-dedupe use) and the route **fails loud (500)** on any deadlines/goals/specialties/profile query error instead of partial-200, so a future schema drift is caught rather than silently dropping events. Don't re-add unused columns to that select.
- (Batch 5, 2026-06-26 — F-026 done / F-047 owner-pending) The public developer API was **removed** (no `/settings/api`, no `/api/v1/me/*` — see the "Public API (REMOVED…)" section). The separate **F-047** hardening — provision an **EU-region Upstash** so the general UI rate-limiters move off the per-instance in-memory fallback to cluster-wide limiting — is **still owed (owner Vercel/Marketplace action; zero code change)**. Reword to "Upstash provisioned" once it lands. (Batch 8 done: the Subprocessors page lists Upstash and the legal copy no longer says "public API endpoints".)

## Change Playbook

Before editing: read this file, run `git status --short`, use `rg` for existing patterns, and check recent audit migrations/comments around non-obvious design.

Feature work: update server enforcement first, then UI, shared types/helpers, and focused tests. Schema changes should be migrations, not ad hoc production edits.

High-risk work (security/billing/auth/share/upload/export): assume browser bypass attempts, keep service-role guarded, avoid sensitive logs, and verify with tests or connector queries.

Specialty criteria/deadlines: verify official sources before editing, keep `source`/`sourceLabel` accurate, update scoring tests if helper behavior changes.

PDF work: preserve runtime loader/tracing unless replacing the whole approach; test export locally and, if possible, in deployed-like conditions.
