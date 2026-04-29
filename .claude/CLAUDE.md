# Clerkfolio — Project Context for Claude

> **V2 work in progress.** Read `HANDOVER_V2.md` at repo root for the comprehensive V2 implementation plan from the April 2026 grill-me session. That document is the source of truth — read it before structural changes. This file covers the persistent project context that survives V2.

## Session start — always do this first
1. Run `git log --oneline -5` and `git status` to see what may have changed since the last session (Codex or other tools may have pushed commits).
2. If there are uncommitted changes, ask the user before proceeding.

## After completing any changes — always do this
1. `git add` the changed files (be specific — no `git add -A` without checking first).
2. Commit with a short descriptive message.
3. `git push origin main` (or the current branch).
Do this without being asked, every time. If the push fails (e.g. remote has new commits from Codex), pull with rebase first (`git pull --rebase`), resolve any conflicts, then push.

## What This App Is
Clerkfolio is a UK medical portfolio tracker spanning medical school → foundation training → higher specialty training applications. Users:
- Log **clinical cases** (personal diary — interesting patients seen)
- Build a **portfolio** of achievements (audits, teaching, publications, prizes, procedures, etc.)
- Track **specialty application scores** against official person specs
- Track **ARCP** capabilities (Foundation Programme; personal organisation only — not a Horus replacement)
- Manage **Timeline** (auto-populated specialty deadlines + user goals)
- **Share & Export** — PDF, CSV, JSON, tokenised public links with optional PIN

## Hard constraints
- **No advice or predictions** — show only the user's own collated data. Liability risk.
- **Not a Horus replacement** — no supervisor signoff, no formal submission flows.
- **Supabase London region only** (eu-west-2).
- **No patient demographics** — cases anonymised.
- **RLS on every table** keyed on `auth.uid() = user_id`.
- **Soft deletes only** — `deleted_at` filtered in app code, not RLS.
- **Auto-push to GitHub** after every task.

## Tech Stack
- **Next.js 14 App Router** — server components by default, `'use client'` only where needed
- **TypeScript** throughout
- **Tailwind CSS** — dark theme, primary colour `#1B6FD9` (blue), background `#0B0B0C` / `#141416`
- **Supabase** — Postgres + auth + RLS + storage (evidence files)
- **react-pdf** — PDF generation in API route (`app/api/export/route.ts`)
- **Resend** — transactional emails (notifications + feedback)
- **Stripe** — £10/year Pro subscription

## Subscription model (V2)
- **Free**: 100MB storage. Free allowance: 1 PDF, 1 share link, 1 specialty.
- **Pro**: £10/year. 5GB storage. Unlimited.
- **Student**: verified `.ac.uk` email. 1GB storage. Same feature limits as Free; moves to Foundation after graduation / FY career stage.
- **Referrals**: 1 month Pro for both on referee onboarding completion.

Time-based trial is **removed**. Gate via `lib/subscription.ts` → `fetchSubscriptionInfo()` returning `{ tier, isPro, isStudent, usage, limits }` from Supabase `get_profile_entitlements()`.

## Tag Landscape — three distinct concepts
| Type | Field | Where | Source |
|---|---|---|---|
| Linked specialties | `specialty_tags[]` | Cases + Portfolio | User's tracked `specialty_applications` only |
| Competency themes | `interview_themes[]` | Cases + Portfolio | Preset 8 + per-user `custom_competency_themes` |
| Clinical area | `clinical_domain` | Cases only | Free text + `CLINICAL_DOMAINS` suggestions |

Never blur these in UI. Always label distinctly.

## Specialty keys vs display names
- `specialty_applications.specialty_key` (slug, e.g. `imt_2026`)
- `specialty_tags[]`: array of slugs
- `clinical_domain` on cases: plain English display (e.g. `"Cardiology"`)
- **Always format** keys before displaying: `getSpecialtyConfig(key)?.name ?? key`
- Source of truth: `lib/specialties/index.ts` → `SPECIALTY_CONFIGS`

## Specialty scoring
- Each `SpecialtyConfig` has `domains[]`, each domain has `maxPoints`, `scoringRule`, `band` (essential/desirable), optional `isEvidenceOnly`, `isCheckbox`, `isSelfAssessed`
- Links stored in `specialty_entry_links` via `SpecialtyEntryLink` type
- **V2 change**: `entry_type` constrained to `'portfolio'` only — cases removed from specialty evidence linking. ARCP same.

## Database Tables (post-V2)
| Table | Purpose |
|---|---|
| `profiles` | `first_name`, `last_name`, `career_stage`, `tier`, `student_email_verified`, `student_graduation_date`, `referral_code`, `referred_by`, `pro_features_used` (jsonb), `notification_preferences` (jsonb) |
| `cases` | Clinical diary: `title`, `date`, `clinical_domain`, `specialty_tags[]`, `notes`, `pinned`, `deleted_at`, `interview_themes[]`, `completeness_score` |
| `portfolio_entries` | Achievements: `category`, `title`, `date`, `specialty_tags[]`, `interview_themes[]`, `pinned`, `deleted_at`, `completeness_score` + many category-specific fields |
| `specialty_applications` | `user_id`, `specialty_key`, `cycle_year`, `bonus_claimed`, `is_active` |
| `specialty_entry_links` | `application_id`, `entry_id`, `entry_type='portfolio'`, `domain_key`, `band_label`, `points_claimed`, `is_checkbox` |
| `arcp_capabilities` | Seeded curriculum (FP2021 default; `curriculum_version` column for versioning) |
| `arcp_entry_links` | `user_id`, `capability_key`, `entry_id`, `entry_type='portfolio'`, `notes` |
| `deadlines` | `title`, `due_date`, `source_specialty_key`, `is_auto`, `completed` |
| `goals` | `category`, `target_count`, `due_date`, `specialty_application_id` (optional FK) |
| `evidence_files` | `entry_id`, `entry_type`, `file_path`, `mime_type`, `file_size`, `scan_status` (pending/scanning/clean/quarantined) |
| `share_links` | `token`, `scope` (specialty/theme/full), `theme_slug`, `pin_hash`, `expires_at`, `view_count`, `revoked_at` |
| `share_views` | `share_link_id`, `ip_hash`, `viewed_at` |
| `entry_revisions` | `entry_id`, `entry_type`, `snapshot` (jsonb), `created_at` — capped at 50 per entry |
| `audit_log` | `user_id`, `action`, `metadata`, `created_at` — service role inserts only, 1-year auto-purge |
| `custom_competency_themes` | User-defined themes; deletion cascades to `interview_themes[]` arrays |
| `referrals` | `referrer_id`, `referred_id`, `status`, `reward_granted_at` |
| `entry_templates` | Curated (~9 trimmed) + user templates |
| `notifications` | In-app secondary log of email-sent notifications |

## RLS Policy
SELECT policies check **only** `auth.uid() = user_id` — no `deleted_at IS NULL` filter. Soft-delete filtering is in app code (`.is('deleted_at', null)`). Trash page explicitly queries deleted rows.

## Sorting Conventions
- **Cases**: `order('pinned', false)` → `order('created_at', false)` (journal-style; newest first)
- **Portfolio**: `order('pinned', false)` → `order('date', false)` → `order('created_at', false)`
- **Timeline**: by `due_date ASC`
- Pagination: 20 items per page, `page` URL param

## Portfolio Categories
`audit_qip`, `teaching`, `conference`, `publication`, `leadership`, `prize`, `procedure`, `reflection`, `custom`
Defined in `lib/types/portfolio.ts` → `CATEGORIES` and `CATEGORY_COLOURS`

## Sidebar Nav Order (post-V2)
Dashboard → Portfolio → Cases → Specialties → ARCP (FY1/FY2 only) → Timeline → Share & Export → Settings (bottom)
Removed: Logbook, Insights, Goals, Deadlines, Interview Prep, Trash (Trash now in Settings).

Career-stage adaptive: ARCP hidden for med students (Y1-Y6) and post-FY users.

## Mobile
Bottom nav bar replaces sidebar under `md` breakpoint. 5 items: Dashboard, Portfolio, Cases (centre + button), Timeline, Settings. Quick-add FAB persists. All forms single-column; modals full-screen on mobile.

## File uploads
- Whitelist: PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG, JPEG, HEIC
- Magic byte validation in `app/api/upload/authorize/route.ts` (use `file-type` package)
- ClamAV scan via `supabase/functions/scan-evidence` Edge Function; status in `evidence_files.scan_status`
- Quota: 100MB free/foundation, 1GB student, 5GB Pro/referral Pro. `get_profile_entitlements()` is the source of truth; DB trigger and app both call it.

## Component Patterns

### Fetching tracked specialties (server pages)
```tsx
const { data: trackedSpecialties } = await supabase
  .from('specialty_applications').select('specialty_key,id').eq('user_id', user!.id).eq('is_active', true)
const specialtyKeys = trackedSpecialties?.map(s => s.specialty_key) ?? []
```

### Formatting a specialty key
```tsx
import { getSpecialtyConfig } from '@/lib/specialties'
getSpecialtyConfig('imt_2026')?.name  // → "IMT"
```

### SpecialtyTagSelect (linked specialties)
```tsx
<SpecialtyTagSelect
  value={specialtyTags}
  onChange={setSpecialtyTags}
  userInterests={specialtyKeys}
  trackedOnly  // restrict to user's tracked programmes; format keys to labels
/>
```

### Subscription gating
```tsx
import { fetchSubscriptionInfo } from '@/lib/subscription'
const sub = await fetchSubscriptionInfo(supabase, userId)
if (!sub.limits.canExportPdf) {
  return <UpgradeCard feature="PDF export" />
}
```

### Draft auto-save (cases create form)
Key: `clerkfolio-case-draft` in `sessionStorage`. Expires 24h. Saves `title`, `date`, `clinicalDomain`, `specialtyTags`. Notes intentionally excluded.

## Design System
- Background layers: `#0B0B0C` (deepest) → `#0E0E10` (sidebar) → `#141416` (cards)
- Primary blue: `#1B6FD9` / hover `#155BB0`
- Text: `#F5F5F2` (primary) → `rgba(245,245,242,0.55)` (secondary) → `rgba(245,245,242,0.35)` (muted)
- Borders: `border-white/[0.08]` standard, `border-white/[0.06]` subtle dividers
- Rounded: `rounded-xl` buttons, `rounded-2xl` cards
- Inputs: `bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors`
- Print stylesheet (V2): light theme on print only, in `app/globals.css` under `@media print`

## Known Decisions & Gotchas
- Logbook is **removed** in V2 (was a stub). All `logbook_*` tables/files/nav entries dropped.
- Insights page **merged into Dashboard** in V2 with collapsible sections.
- Goals + Deadlines **merged into Timeline** with calendar default.
- Interview Prep page **folded into Portfolio** as a Themes view-toggle.
- Specialty radar uses horizontal bar chart (not SVG spider — text cutoff with long names)
- Duplicate entries: `created_at` tiebreaker ensures copy appears above original
- After logging a case, redirect goes to `/cases` list (not the individual case)
- Cases sort defaults to `created_at` not `date` (so newest-added is always first — journal feel)
- `specialty_interests` was removed from `profiles`; use `specialty_applications` for application tag logic
- `interview_themes[]` array can hold preset slugs OR custom theme slugs (slugs unique per user across both)
- Cases removed from `specialty_entry_links` and `arcp_entry_links` — portfolio entries only as evidence
