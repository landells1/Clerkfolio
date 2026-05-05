# Clerkfolio — HANDOVER

> One-page brief so any Claude Code or Codex session can be productive within a minute. Read this first; only dive into `AGENTS.md` / `.claude/CLAUDE.md` if you need deeper context. Last refreshed by full-codebase audit on **2026-05-05**.

---

## 1. Project summary

**Clerkfolio** is a UK medical professional portfolio and tracker spanning medical school → foundation training → higher specialty applications. Live at **clerkfolio.co.uk**.

Users:
- Log **clinical cases** (personal, anonymised diary).
- Build a **portfolio** of achievements (audits/QIP, teaching, conferences, publications, leadership, prizes, procedures, reflections, custom).
- Track **specialty application scores** against official 2026-cycle person specs.
- Track **ARCP** capabilities (FY1/FY2 only — personal organisation, **not a Horus replacement**).
- Manage a **Timeline** (auto-loaded specialty deadlines + user goals).
- **Share & Export** — PDF, CSV, JSON, tokenised public links with optional PIN.

It is **not** a sign-off, supervisor approval, or compliance tool. It is purely for personal tracking, reflection, and portfolio building.

### Hard product constraints (never break)
- No advice, predictions, or competitive benchmarks. Show users their own collated data only. Liability risk.
- No supervisor signoff or external verification flows. Do not compete with Horus.
- Supabase **eu-west-2 (London)** only. UK data hosting.
- No patient demographics. Cases are anonymised.
- RLS on every table keyed on `auth.uid() = user_id`.
- Soft deletes only. `deleted_at` filtered in app code, not RLS. Hard delete only on user action (account delete, trash purge after 30 days).
- Never auto-delete user data on subscription downgrade. Block new uploads when over quota; existing data stays accessible.
- Cron routes call `validateCronSecret(req)` from `lib/cron.ts`.
- All state-changing API routes call `validateOrigin(req)` from `lib/csrf.ts`.

---

## 2. Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15.5 App Router · TypeScript strict |
| Styling | Tailwind 3.4 · dark theme · primary `#1B6FD9` |
| Auth + DB | Supabase (Postgres + Auth + Storage) — project `dldhnstjngendpcywthv`, eu-west-2 |
| PDF | `@react-pdf/renderer` |
| Email | Resend → `admin@clerkfolio.co.uk` |
| Billing | Stripe £10/year Pro |
| Hosting | Vercel (`lhr1` region, crons configured in `vercel.json`) |
| Analytics | `@vercel/analytics` |

Node target: 20.x. `npm` for installs. `tsc --noEmit` passes clean as of this commit.

---

## 3. Project structure

```
app/
  (auth)/                    login, signup (?ref= referral), reset-password, update-password
  (dashboard)/               authenticated pages — single layout for sidebar + onboarding redirect
    dashboard/               merged dashboard + insights (collapsible sections)
    portfolio/               9 categories + theme view; create / edit / view / history
    cases/                   anonymised clinical diary; create / edit / view / history
    specialties/             scoring UI (1 free, unlimited Pro)
    arcp/                    capability tracking (visible only for FY1/FY2 in nav)
    timeline/                goals + deadlines (calendar default + list view)
    export/                  PDF / CSV / JSON / share-link hub
    settings/                profile, password, storage, billing, notifications, templates, referrals, shared-links
    trash/                   soft-delete recycle bin (linked from settings)
    upgrade/                 Pro upsell page
    import/                  Horus CSV bulk import (Pro)
  (marketing)/               public landing page + components/mocks
  onboarding/                4-step wizard (server posts to /api/onboarding/complete)
  share/[token]/             public share view (PIN-gated optional)
  privacy/ terms/ contact/   legal + contact (always accessible per middleware)
  r/[code]/                  short referral redirect → /signup?ref=
  api/
    auth/callback/           OAuth code exchange + referral link
    onboarding/complete/     profile + specialty apps + auto-deadlines
    account/{delete,export}/ GDPR delete + ZIP backup
    arcp/links/              ARCP capability ↔ portfolio entry linking
    calendar/{feed-token,feed/[token]}/  iCal feed + token rotation
    cron/{notifications,purge-deleted,expire-share-links,purge-audit-log}/  Vercel cron (CRON_SECRET)
    export/                  PDF / CSV / JSON (subscription gated)
    feedback/                Resend email
    history/restore/         Restore entry from snapshot
    import/horus/            Bulk import (Pro)
    referrals/ensure-code/   Generate referral code
    share/{,access}/         Share-link CRUD + public access (PIN, rate limit, auto-revoke)
    stripe/{checkout,portal,webhook}/  Billing
    student-email/{send-verification,confirm}/  .ac.uk verification
    templates/               Template CRUD ⚠ missing validateOrigin (audit S2)
    upload/{authorize,verify}/  MIME + magic byte validation

components/
  arcp/ cases/ dashboard/ history/ import/ legal/ portfolio/ share/ shared/ specialties/
  timeline/ trash/ ui/ upgrade/
  sidebar.tsx                desktop nav (career-stage adaptive)
  print-header.tsx           shared print stylesheet header

lib/
  cron.ts                    validateCronSecret
  csrf.ts                    validateOrigin (allowlisted origins + referer fallback)
  monitoring.ts              JSON error logger (placeholder for Sentry)
  subscription.ts            fetchSubscriptionInfo() → tier+usage+limits
  stripe.ts                  Stripe client + STRIPE_PRICE_ID
  institutional-email.ts     .ac.uk + NHS email validators
  marketing/pricing.ts       feature copy for landing page (drift-prone with subscription.ts)
  notifications/email-templates.ts  HTML+text email templates (notification + auto-revoke)
  pdf/portfolio-pdf.tsx      react-pdf component
  referrals/{codes,rewards}.ts  referral code gen + reward grant logic
  share/pin.ts               scrypt PIN hash + token gen
  specialties/               30+ specialty configs + index + deadlines + types
  types/                     portfolio.ts cases.ts arcp.ts templates.ts
  upload/magic-bytes.ts      file-signature validation
  utils/                     completeness.ts dates.ts

supabase/
  migrations/                dated migrations 2026_04_28 onward
  functions/scan-evidence/   ClamAV / magic-byte Edge Function
  schema-stage*.sql          progressive snapshots; canonical = highest-numbered
  migration-fix-*, migration-security-*  one-off hardening

middleware.ts                CSP + security headers + auth-gate + onboarding-gate
next.config.mjs              experimental.serverActions allowedOrigins
vercel.json                  region lhr1 + 4 crons
```

---

## 4. Free vs Pro tier

| Capability | Free (default) | Student (verified .ac.uk) | Foundation (FY1/FY2 verified NHS email) | Pro (£10/yr) |
|---|---|---|---|---|
| Storage | 100 MB | 1 GB | 100 MB | 5 GB |
| PDF exports | 1 lifetime | 1 lifetime | 1 lifetime | unlimited |
| Share links | 1 lifetime | 1 lifetime | 1 lifetime | unlimited |
| Specialties tracked | 1 | 1 | 1 | unlimited |
| Bulk import (Horus CSV) | — | — | — | yes |
| File uploads | yes (within quota) | yes | yes | yes |
| All Cases / Portfolio / ARCP / Timeline / Settings | full | full | full | full |
| Granular email preferences | basic on/off | basic | basic | granular |

Source of truth at runtime: `lib/subscription.ts` → `fetchSubscriptionInfo()` → calls Supabase RPC `get_profile_entitlements(p_user_id)` → returns `{ tier, isPro, isStudent, usage, limits }`. Always gate UI on `limits.canExportPdf`, `limits.canCreateShareLink`, `limits.canTrackAnotherSpecialty`, `limits.canBulkImport`, `limits.canUploadFiles`.

**Referrals**: 1 month Pro for both parties when referee verifies institutional email + completes onboarding. Stacks. Capped at 5 rewarded referrals per referrer per rolling year.

The old time-based trial has been **removed** — Free accounts get fixed lifetime allowances instead.

---

## 5. Current state

### Working & shipped
- Auth (email/password) + onboarding wizard + career-stage selection.
- Cases & portfolio CRUD with file evidence (whitelisted MIME + magic-byte check + ClamAV scan).
- 30+ specialty configs with domain scoring + 2026-cycle deadlines + radar/bar visualisation.
- ARCP capability seed + portfolio-entry linking.
- Timeline with calendar default + iCal feed + Goals.
- Trash with 30-day auto-purge cron.
- Share links: token, PIN, rate limit, auto-revoke at 100 views/hour, expiry email.
- PDF / CSV / JSON export with subscription gating.
- Stripe £10/yr Pro subscription + customer portal.
- Resend transactional email + daily notifications cron.
- 5-letter referral codes + cross-account verification gating.
- Marketing landing page with product mocks.
- All Vercel-region setup, security headers, CSP, cron secrets.

### Known broken / incomplete (see Stage 1 audit below)
- `app/api/templates/*` missing `validateOrigin` → CSRF risk on template CRUD.
- `lib/referrals/codes.ts` uses `Math.random()` (non-CSPRNG) for referral codes.
- Stripe webhook silently 200s on customer mismatch — should 4xx so Stripe retries.
- Cron `purge-deleted` does not cascade to `evidence_files` rows or storage objects → orphan leak.
- `evidence_files` lacks UPDATE RLS policy (scan status writes via service role only).
- `entry_revisions` RLS allows DELETE — supposed to be immutable history.
- Schema drift: `profiles.career_stage` constraint in `schema.sql` predates the Y1/Y2/.../POST_FY taxonomy.
- `lib/utils/completeness.ts` rejects `proc_count: 0` (valid value).
- HEIC magic-byte check uses `String.fromCharCode` (mojibakes); should compare hex.
- Several tier-gate checks treat `subInfo` as non-null during initial render.
- Many cosmetic a11y issues (alt text, aria-labels, contrast on muted-text token).
- `HANDOVER_V2.md` is referenced in `.claude/CLAUDE.md` and `SESSION_START.md` but does not exist (this file replaces it).

Full 60+ item findings list in §7.

---

## 6. Key conventions

### Routing & data
- Server Components by default. Use `'use client'` only where browser APIs are required.
- `lib/supabase/server.ts` → `createClient()` (RLS) and `createServiceClient()` (service role; webhook/cron/admin only).
- `lib/supabase/client.ts` → browser client.
- Form pattern: controlled state in client component; submit calls Supabase directly. API routes only for PDF, Stripe, Resend, file uploads, security-sensitive ops.
- Soft delete filtering is **app-level**: every list query needs `.is('deleted_at', null)` except the `trash` page.

### Sorting
| Surface | Order |
|---|---|
| Cases | `pinned DESC, created_at DESC` (journal-style) |
| Portfolio | `pinned DESC, date DESC, created_at DESC` |
| Timeline | `due_date ASC` |
| Pagination | 20 per page, `?page=` URL param |

### Tag landscape — three concepts, never conflate
| Type | Field | Where | Source |
|---|---|---|---|
| Linked specialties | `specialty_tags[]` | Cases + Portfolio | User's tracked `specialty_applications` only |
| Competency themes | `interview_themes[]` | Cases + Portfolio | Preset 8 + per-user `custom_competency_themes` |
| Clinical area | `clinical_domain` (string) / `clinical_domains[]` | Cases only | Free text + `CLINICAL_DOMAINS` suggestions |

Always format specialty keys before display: `getSpecialtyConfig('imt_2026')?.name ?? key`. Source: `lib/specialties/index.ts`.

### Categories (portfolio)
`audit_qip`, `teaching`, `conference`, `publication`, `leadership`, `prize`, `procedure`, `reflection`, `custom`. Defined in `lib/types/portfolio.ts`.

### Sidebar nav order
Dashboard → Portfolio → Cases → Specialties → ARCP (FY1/FY2 only) → Timeline → Share & Export → Settings.

Career-stage adaptive: ARCP hidden for med students (Y1–Y6) and post-FY users.

### File uploads — required path
1. Client calls `POST /api/upload/authorize` (whitelist + size + per-tier quota).
2. Client uploads via Supabase Storage SDK to `evidence/<userId>/<entryType>/<entryId>/<ts>-<safeName>`.
3. Client inserts `evidence_files` row with `scan_status = 'pending'`.
4. Edge Function `scan-evidence` validates magic bytes + (if configured) ClamAV INSTREAM, sets `scan_status = clean | quarantined`.
5. Fallback `POST /api/upload/verify` (server-side magic-bytes only) if Edge Function fails.
6. Whitelist: PDF, DOC, DOCX, XLSX, PPTX, TXT, PNG, JPEG, HEIC, HEIF. Per-file 50 MB.

### Auto-push workflow
The user runs Claude Code and Codex interchangeably. GitHub is shared state.
- **Session start**: `git log --oneline -5` and `git status`. If uncommitted changes are present, ask before touching anything.
- **After every change**: `git add <specific files>` (no `-A`), commit with a short imperative message, `git push origin main`. If push fails: `git pull --rebase`, resolve, push.

---

## 7. Stage 1 — full bug/security findings (status: pending unless noted)

### Critical
| # | File:line | Issue | Status |
|---|---|---|---|
| S1 | `lib/referrals/codes.ts:13` | `Math.random()` for referral codes — replace with `crypto.randomInt`. | pending |
| S2 | `app/api/templates/route.ts:5,33,52` | All three handlers skip `validateOrigin` — CSRF risk. | pending |
| S3 | `app/api/stripe/webhook/route.ts:55` | Customer-mismatch path silently returns 200; should 4xx so Stripe retries. | pending |
| S4 | `app/api/share/access/route.ts:122–141` | Auto-revoke email send not wrapped in try/catch (CODEX_TASKS Task 1). | verify |
| S5 | `lib/notifications/email-templates.ts:28` | `item.link` interpolated raw into href — assert `startsWith('/')`. | pending |
| S6 | `lib/subscription.ts:60–66` | `mapEntitlements` defaults `canX` to `true` when row fields are NULL — fail-open. Default to `false`. | pending |
| S7 | `app/api/onboarding/complete/route.ts:74–82` | TOCTOU on specialty insert — use `.upsert({ onConflict, ignoreDuplicates: true })`. | pending |
| S10 | `app/api/cron/purge-deleted/route.ts:14–17` | Doesn't cascade to `evidence_files` or storage objects — orphan leak. | pending |
| S11 | `app/api/share/access/route.ts:34` | No IP-keyed rate limit before token lookup — DB amplification. | pending |
| S12 | `lib/upload/magic-bytes.ts:14` and `supabase/functions/scan-evidence/index.ts:42` | HEIC check uses ASCII coercion — should use hex `66747970`. | pending |
| S13 | `app/api/account/delete/route.ts:39–48` | `storage.remove(paths)` un-chunked — fails for >1000 files. | pending |
| S14 | `app/api/import/horus/route.ts:11` | PII patterns over- and under-protective. | pending |

### High
| # | File:line | Issue |
|---|---|---|
| H1 | `lib/utils/completeness.ts:30` | `value > 0` rejects valid `proc_count: 0`. |
| H2 | `app/(dashboard)/cases/[id]/page.tsx:29` + `portfolio/[id]/page.tsx:46` | Evidence queries lack explicit `user_id` + `entry_type` filters. |
| H3 | `app/(dashboard)/dashboard/page.tsx` | Cases query selects only `clinical_domains[]`; legacy `clinical_domain` rows render as untagged. |
| H4 | `components/dashboard/quick-add-modal.tsx` | Duplicate-check fires on every keystroke without debounce/abort. |
| H5 | `components/dashboard/quick-add-modal.tsx` | Quick-add case insert misses `completeness_score`. |
| H6 | `components/cases/case-form.tsx:177` | Revision insert error silently swallowed. |
| H7 | `components/portfolio/entry-form.tsx:396`, `case-form.tsx:111` | `pruneRevisions` delete missing `eq('user_id', ...)`. |
| H8 | `app/api/history/restore/route.ts:73` | Snapshot merge fails when columns dropped — needs allowlist. |
| H9 | `app/api/calendar/feed/[token]/route.ts` | No rate limit / poll cap on calendar feeds. |
| H10 | `lib/specialties/deadlines.ts` | 2026 cycle dates hardcoded; need stale-cycle warning. |
| H11 | `components/timeline/timeline-client.tsx:155` | `addEvent` confuses specialty `id` and `key`. |
| H12 | `components/dashboard/onboarding-checklist.tsx` | Async update inside setTimeout, no error handling. |
| H13 | `lib/utils/dates.ts:1` | `relativeDate` parses noon UTC; works for UK only. Comment risk. |
| H15 | `components/sidebar.tsx:154–157` | `isMac` hydration mismatch flicker. |
| H16 | `components/share/public-share-client.tsx:33` | Renders raw `themeSlug`; server should send `themeLabel`. |
| H17 | `app/(dashboard)/export/page.tsx:360,485` | Tier-gate disabled checks crash if `subInfo` is null. |
| H18 | `app/(dashboard)/import/page.tsx:42` | Same null-`subInfo` bug. |
| H19 | `app/api/share/route.ts:107–125` | Counter increment after insert leaves a window where Free can over-create. Move to DB trigger. |
| H20 | `app/api/feedback/route.ts:22–36` | In-memory rate limiter is per-lambda (effectively absent on Vercel). |

### Medium
M1 referral regex now validated (CODEX_TASKS Task 5 ✅).  
M2 No Stripe `event.id` idempotency table.  
M3 Scrypt key length implicit.  
M4 `marketing/pricing.ts` ↔ `subscription.ts` drift.  
M5 `share_links.revoked` (bool) duplicates `revoked_at IS NOT NULL` — drop bool.  
M6 `schema.sql` career-stage constraint stale; rely on migrations.  
M7 `entry_revisions` 50-cap not enforced at DB.  
M8 `audit_log` lacks partitioning.  
M9 `evidence_files` missing `(user_id, scan_status)` index.  
M10 `arcp_capabilities` missing INSERT/UPDATE/DELETE deny policies.  
M11 `share_views` and `share_access_attempts` missing explicit deny-write policies.  
M12 `entry_revisions` policy is `for all` — restrict to SELECT only.  
M13 `evidence_files` missing UPDATE policy.  
M15 `next.config.mjs` server-action allowlist excludes preview deployments.  
M16 No sitemap / robots / OG image for marketing site.  
M17 No alert wiring for cron failures.  
M18 No `engines` field in `package.json`.  
M19 `lib/types/cases.ts` keeps both `clinical_domain` and `clinical_domains[]`.  
M20 `lib/types/portfolio.ts:NewPortfolioEntry` omits `interview_themes`.  
M21 `lib/specialties/types.ts` `entry_type` union still includes `'case'`.  
M22 `scripts/scan-secrets.mjs` Stripe regex too narrow.  
M23 `components/legal/contact-modal.tsx` close button no `aria-label` / Escape handling.  
M24 Image previews use empty `alt`.  
M25 `components/share/public-share-client.tsx:51` no try/catch around fetch.  
M26 Stale `test.txt` placeholder file.  
M27 `HANDOVER_V2.md` referenced but missing — replaced by this file.  
M28 `app/(dashboard)/settings/notifications/page.tsx:35` uses `.single()` — should be `.maybeSingle()`.  
M29 `rgba(245,245,242,0.35)` muted text fails WCAG AA contrast.  
M30 Verify `app/page.tsx` and `app/(marketing)/` don't double-render landing.

### Low
L1 Marketing mocks placeholder text drift risk.  
L2 Missing AbortController cleanup in async useEffects.  
L3 ESLint a11y rules may be relaxed under `eslint-config-next`.  
L4 `tsconfig.json` lacks `forceConsistentCasingInFileNames`.  
L5 No `typecheck` npm script.  
L6 `createClient` re-instantiated per render in many components.  
L7 No tests anywhere.  
L8 `error.tsx` doesn't ship errors to a monitor.  
L9 `faq.tsx` collapsible accessibility.  
L10 `global-search.tsx` keyboard nav verification.  
L11 No cross-config sanity check for specialty `domains` totals.  
L12 PDF date formatting uses local timezone.  
L13 Verify `app/contact/page.tsx` posts to `/api/feedback`.

Full prose with rationale is in the audit conversation that produced this document.

---

## 8. Stage 2 — prioritised feature backlog

Top of backlog, in order of impact-vs-effort:

1. **Daily reflection nudge with one-tap log** (F1) — biggest engagement driver. Free.
2. **Weekly digest email** (F2) — low effort, recurring touchpoint. Free.
3. **Cmd-K launcher** (F7) — power-user moat. Free.
4. **Empty-state CTAs + inline category guides** (U4, U5) — onboarding lift. Free.
5. **PDF templates** (P1) — clearest Pro upsell. Pro.
6. **Bulk operations on entries** (P2) — Pro upsell + accelerator.
7. **Granular share-link controls** (P3) — Pro upsell + safety.
8. **CV / personal statement generator** (E1, E2) — moves Pro from "nice-to-have" to "must-have" in application season.
9. **Mandatory training tracker** (N5) — sticky utility surface for FY+. Free.
10. **WBA tracker dedicated view** (N2) — clear Foundation fit. Free.
11. **Saved searches + boolean syntax** (T1, T2) — power users. Mixed.
12. **Per-rotation summary prompt** (F6) — Foundation lifecycle hook. Free.
13. **PWA install + offline read** (U9, M4) — mobile usage. Free.
14. **2FA / TOTP** (P10) — trust + Pro.
15. **Audit log surfaced in UI** (L3) — table exists, UI deferred.

Full ~80-item brainstorm in the audit conversation; the categories were:
A engagement & retention · B Pro upsell hooks · C new sections/modules · D search/filter/tags · E dashboard/visualisations · F onboarding/UX · G a11y/polish · H notifications/integrations · I export/import · J pricing/upsell hooks · K mobile · L trust/safety/legal.

---

## 9. Environment variables

Required (no values, just names):

```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase anon key (public)
SUPABASE_SERVICE_ROLE_KEY         # Supabase service role (RLS bypass — server only)
RESEND_API_KEY                    # Transactional email
CRON_SECRET                       # ≥32 chars; sent as Authorization: Bearer ... by Vercel cron
SHARE_IP_HASH_SALT                # Independent salt for share_views.ip_hash
NEXT_PUBLIC_APP_URL               # Canonical, e.g. https://clerkfolio.co.uk
STRIPE_SECRET_KEY
STRIPE_PRICE_ID                   # The £10/yr Pro price
STRIPE_WEBHOOK_SECRET
NODE_ENV                          # production | development
# Optional
NEXT_PUBLIC_SITE_URL              # Falls back to NEXT_PUBLIC_APP_URL or hardcoded clerkfolio.co.uk
CLAMAV_TCP_HOST                   # Edge Function — if absent, MIME-only fallback
CLAMAV_TCP_PORT                   # Default 3310
VERCEL_URL                        # Auto-set on Vercel
```

---

## 10. Next steps (work in this order)

1. **Stage 1 critical fixes** (S1–S14). Pair with new tests (currently zero in the repo).
2. **Re-run a focused security audit** after S2 + S5 + S6 + S10 land — these are the highest-leverage.
3. **Drop `HANDOVER_V2.md` references** in `.claude/CLAUDE.md` and `SESSION_START.md` (point at this file instead). Already partially done in this commit.
4. **Add npm `typecheck` script** + `engines` + a single GitHub Actions workflow to enforce them on PRs.
5. **Stage 2 quick wins**: weekly digest email (F2), Cmd-K launcher (F7), per-rotation prompt (F6), empty-state CTAs (U4).
6. **Stage 2 Pro hooks**: PDF templates (P1), CV/personal-statement generator (E1, E2), bulk operations (P2).
7. **Schema cleanup**: drop `share_links.revoked` boolean, finalise career-stage constraint, add `(user_id, scan_status)` index, add `entry_revisions` 50-cap trigger.
8. **Surface audit log to user** (L3) — table exists, UI deferred. Pro feature.
9. **Mobile pass**: bottom-sheet quick-add (M2), PWA install + service worker (U9, M4), camera capture (M5).
10. **Marketing site polish**: sitemap, robots, OG image, contrast pass.

Don't start work outside this list without checking whether it conflicts with the in-flight S/H items above. Always commit + push after each task.

---

*Generated 2026-05-05 by full-codebase audit. The companion documents (`AGENTS.md`, `.claude/CLAUDE.md`, `SESSION_START.md`, `CODEX_TASKS.md`) remain authoritative for their narrower scopes; this file is the single jumping-off point. Update this file when the state of play changes materially.*
