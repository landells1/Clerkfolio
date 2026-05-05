# Clerkfolio — Session Start Context

**Last full audit:** 2026-05-05 by Claude Code (claude-opus-4-7) — see `HANDOVER.md` for findings + status. Critical fixes from this audit landed in commit on 2026-05-05.

## First thing every session
```bash
git log --oneline -5
git status
```
If uncommitted changes exist, ask the user before touching anything.

## After every change
```bash
git add <specific files>
git commit -m "short descriptive message"
git push origin main
# If push fails: git pull --rebase && git push
```

---

## Project identity
- **What:** UK medical portfolio tracker (med school → FY → specialty applications)
- **Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Storage) · Stripe · Resend
- **Hosting:** Vercel (Next.js) · Supabase project ID: `dldhnstjngendpcywthv` (eu-west-2, ACTIVE_HEALTHY)
- **Repo remote:** confirm with `git remote -v`

## Source-of-truth docs (read before structural changes)
| File | Purpose |
|---|---|
| `HANDOVER.md` | Single jumping-off point — refreshed by full audits |
| `.claude/CLAUDE.md` | Persistent project context, hard constraints, patterns |
| `AGENTS.md` | Codex / agentic work tracking (gitignored, local-only) |

---

## Tech stack quick-ref

### Supabase clients
- `lib/supabase/server.ts` → `createClient()` (SSR, user-scoped RLS) · `createServiceClient()` (bypasses RLS — webhooks, cron, admin)
- `lib/supabase/client.ts` → browser client

### Subscription gating
- Always call `fetchSubscriptionInfo(supabase, userId)` from `lib/subscription.ts`
- Source: Supabase RPC `get_profile_entitlements(p_user_id)`
- Returns `{ tier, isPro, isStudent, usage, limits }` — `limits.*` are the gate flags

### Auth callback flow
`/auth/callback` → `exchangeCodeForSession` → optional referral link → redirect to `/onboarding` (or `?next=`)

### CSRF protection
All state-changing API routes call `validateOrigin(req)` from `lib/csrf.ts` as first check.

### File uploads
- Whitelist in `app/api/upload/authorize/route.ts`
- Magic byte validation: `lib/upload/magic-bytes.ts` → `hasValidMagicBytes()`
- ClamAV scan: `supabase/functions/scan-evidence` Edge Function; status in `evidence_files.scan_status`

---

## Database — live table list (public schema, 2026-04-29)
All tables have RLS enabled.

| Table | RLS policies |
|---|---|
| `profiles` | SELECT/INSERT/UPDATE own row |
| `cases` | SELECT/INSERT/UPDATE/DELETE own rows |
| `portfolio_entries` | SELECT/INSERT/UPDATE/DELETE own rows |
| `specialty_applications` | ALL own rows |
| `specialty_entry_links` | SELECT/INSERT/UPDATE/DELETE own (via application_id join) |
| `arcp_capabilities` | SELECT authenticated only (read-only seed data) |
| `arcp_entry_links` | SELECT/INSERT/UPDATE/DELETE own rows |
| `deadlines` | SELECT/INSERT/UPDATE/DELETE own rows |
| `goals` | ALL own rows |
| `evidence_files` | SELECT/INSERT/DELETE own rows (**no UPDATE policy** — scan status is service-role only) |
| `entry_revisions` | ALL own rows |
| `share_links` | ALL own rows |
| `share_views` | SELECT own (via share_link join) |
| `share_access_attempts` | SELECT own (via share_link join) |
| `audit_log` | SELECT own (inserts are service-role only) |
| `custom_competency_themes` | ALL own rows |
| `referrals` | SELECT own (referrer_id OR referred_id) |
| `notifications` | ALL own rows |
| `templates` | SELECT own + curated (user_id IS NULL); INSERT/UPDATE/DELETE own |
| `student_email_verification_tokens` | **Zero policies** — service-role only access (intentional) |

> **Note:** `entry_templates` mentioned in old docs is wrong. The actual table name is `templates`.

### Key constraints
- `specialty_applications`: UNIQUE (user_id, specialty_key)
- `arcp_entry_links`: UNIQUE (user_id, capability_key, entry_id, entry_type)
- `deadlines`: partial UNIQUE on (user_id, source_specialty_key, title, due_date) WHERE is_auto = true
- `profiles`: UNIQUE referral_code (partial, NOT NULL), UNIQUE stripe_customer_id, UNIQUE stripe_subscription_id
- `share_links`: UNIQUE token

### Known DB issues (pending fix)
- `specialty_entry_links` RLS still allows `entry_type = 'case'` — V2 intent is portfolio only; needs CHECK constraint + RLS update
- `profiles` has duplicate redundant indexes: `profiles_referral_code_key` (superseded by partial unique), `profiles_stripe_customer_idx` (superseded by unique), `profiles_stripe_sub_idx` (superseded by unique)

---

## API routes map (25 routes)
```
/auth/callback                    GET  OAuth exchange + referral link
/api/onboarding/complete          POST Profile + specialty apps + deadlines setup
/api/account/delete               POST GDPR delete (Stripe cancel + storage + auth)
/api/account/export               POST Full data ZIP export
/api/arcp/links                   POST/DELETE Link/unlink portfolio entry ↔ ARCP capability
/api/calendar/feed-token          POST Generate/rotate iCal feed token
/api/calendar/feed/[token]        GET  iCalendar .ics feed
/api/cron/expire-share-links      GET  Auto-revoke expired share links (CRON_SECRET)
/api/cron/notifications           GET  Email notifications cron (CRON_SECRET)
/api/cron/purge-audit-log         GET  Delete audit_log > 1 year (CRON_SECRET)
/api/cron/purge-deleted           GET  Hard-delete soft-deleted entries > 30d (CRON_SECRET)
/api/export                       POST PDF/CSV/JSON export (subscription gated)
/api/feedback                     POST User feedback form → Resend email
/api/history/restore              POST Restore entry from revision snapshot
/api/import/horus                 POST Bulk import from Horus CSV (Pro only)
/api/share                        GET/POST/PATCH/DELETE Share link management
/api/share/access                 POST Verify token+PIN, return entries (public)
/api/stripe/checkout              POST Create Stripe checkout session
/api/stripe/portal                POST Stripe billing portal redirect
/api/stripe/webhook               POST Handle Stripe events (no auth check — sig verified)
/api/student-email/send-verification POST Send verification email
/api/student-email/confirm        GET  Verify token → set tier
/api/referrals/ensure-code        POST Generate referral code if missing
/api/templates                    POST/DELETE/PATCH Template CRUD
/api/upload/authorize             POST MIME + quota pre-flight check
/api/upload/verify                POST Magic byte validation
```

---

## Known open issues (post-audit 2026-05-05)
The 2026-05-05 audit landed fixes for: `validateOrigin` on `/api/templates` (CSRF), Stripe webhook customer-mismatch (now 409 retry), `Math.random` → `crypto.randomInt` for referral codes, sanitised `item.link` in notification email template, fail-closed `subscription.ts`, onboarding TOCTOU upsert, share-token format prefilter, HEIC magic-byte hex check in scan-evidence Edge Function, chunked storage delete in account-delete, Horus PII patterns tightened, `purge-deleted` cron now cascades to evidence files + storage, completeness `>= 0`, evidence-file query filters, quick-add `completeness_score`, evidence preview `alt`, contact-modal Escape + aria, `engines` + `typecheck` script + `forceConsistentCasingInFileNames`, secret-scanner Stripe regex, and an SQL migration `2026_05_05_audit_rls_hardening.sql` (NOT YET APPLIED to live Supabase — apply via dashboard or `supabase db push`).

Still open (see `HANDOVER.md` §7 for the full prioritised list):
- Calendar feed has no rate-limit / poll cap.
- `app/api/feedback` rate-limiter is per-lambda — replace with Upstash for real protection.
- `entry_revisions` 50-cap enforcement remains client-side; needs server-side trigger or pruning function before the user-DELETE policy can be tightened.
- `share_links.revoked` boolean duplicates `revoked_at IS NOT NULL` — drop the bool in a follow-up.
- `schema.sql` career-stage constraint is stale; rely on migrations until consolidated.
- `audit_log` partitioning + scheduled `pg_cron` purge.

---

## Environment variables required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
CRON_SECRET                  # min 32 chars
SHARE_IP_HASH_SALT
STRIPE_SECRET_KEY
STRIPE_PRICE_ID
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
NODE_ENV
```

## Design tokens (Tailwind dark theme)
- Backgrounds: `#0B0B0C` → `#0E0E10` (sidebar) → `#141416` (cards)
- Primary blue: `#1B6FD9` / hover `#155BB0`
- Text primary: `#F5F5F2` · secondary: `rgba(245,245,242,0.55)` · muted: `rgba(245,245,242,0.35)`
- Borders: `border-white/[0.08]` standard · `border-white/[0.06]` subtle
- Inputs: `bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors`
