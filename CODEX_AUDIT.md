# Codex Audit — Stages 11, 12, 13

This document covers every file created or modified across three build stages. Review each file listed against the intent described. The app is a Next.js 14 App Router project using Supabase, TypeScript, and Tailwind CSS.

---

## Stage 11 — Entry Experience (Part 1)

### New database objects
**`supabase/schema-stage11.sql`**
- Creates `entry_templates` table: `id, user_id, name, category, template_data jsonb, is_curated bool, created_at`
- RLS: users can SELECT curated templates OR their own; INSERT/UPDATE/DELETE own only
- Seeds 24 curated templates across all portfolio categories
- Adds columns to `portfolio_entries`: `reflection_type text`, `reflection_framework text`, `interview_themes text[]`
- Adds `completeness_score int2` to `portfolio_entries` and `cases`

### New components
**`components/portfolio/template-picker-modal.tsx`**
- Modal listing curated + personal templates filtered by category
- Clicking a template populates the entry form fields via `onSelect` callback
- "Save as template" button on entry detail page calls insert into `entry_templates`

**`components/portfolio/reflection-framework-selector.tsx`**
- Dropdown: None / Gibbs' Cycle / Rolfe (What, So What, Now What) / STARR / SBAR
- Serialises selected framework into `reflection_framework` column

**`components/portfolio/interview-theme-tagger.tsx`**
- Multi-select for 8 fixed interview themes (Leadership, Teaching, Communication, etc.)
- Stored as `interview_themes text[]` on portfolio entries and cases

**`components/portfolio/completeness-indicator.tsx`**
- Small green/amber dot + optional score chip
- Green = has specialty tags + notes; amber = missing one; shown on entry cards and case cards

**`components/portfolio/bulk-action-bar.tsx`**
- Floating bar that appears when items are selected
- Actions: Add specialty tag, Add to export selection, Move to trash
- Escape key closes; "X selected" count shown

**`app/(dashboard)/settings/templates/page.tsx`**
- Lists user's personal saved templates
- Delete button per template (soft: removes from DB)

**`app/api/portfolio/bulk/route.ts`**
- POST: bulk-tag selected entry IDs with a specialty key
- DELETE: bulk soft-delete (sets `deleted_at`) for selected entry IDs
- Both validate `user_id` ownership before acting

### Modified files
**`components/portfolio/entry-form.tsx`**
- Added template picker button at top of form
- Added reflection framework selector (shown for `reflection` category)
- Added interview theme tagger
- Completeness score calculated client-side and saved on submit

**`components/portfolio/portfolio-list-client.tsx`** — major rewrite
- Removed "Select" toggle button
- Each card row has `w-10` reserved checkbox column always present
- Checkbox: `opacity-0 group-hover/row:opacity-100 transition-opacity` — appears on hover
- Transparent `absolute inset-0 z-10 cursor-pointer` overlay blocks Link navigation in select mode
- Checkbox sits at `z-20` above the overlay
- `toggleEntry()` sets `selectMode(true)` automatically
- `useEffect` exits select mode when `selected.size === 0`
- `BulkActionBar` rendered when `selected.size > 0`

**`components/cases/cases-list-client.tsx`**
- Same Gmail-style checkbox pattern as portfolio list (identical implementation)

**`components/portfolio/entry-card.tsx`**
- `CompletenessIndicator` added to card footer

**`app/(dashboard)/settings/page.tsx`**
- "My templates" section added with link to `/settings/templates`

**`components/sidebar.tsx`**
- Logbook nav item removed (data preserved in DB, just no nav link)
- Interview Prep nav item added

**`app/api/feedback/route.ts`**
- `new Resend(...)` moved from module level into the POST handler body to prevent build-time crash when `RESEND_API_KEY` env var is absent

---

## Stage 12 — Application Calendar, ARCP, Cycle Migration, Shareable Links (Part 2)

### New database objects
**`supabase/schema-stage12.sql`**
- `deadlines`: adds `source_specialty_key text`, `is_auto boolean default false`
- `specialty_applications`: adds `is_active boolean default true`, `archived_at timestamptz`
- Creates `arcp_capabilities`: `id, capability_key unique, name, description, category, sort_order`
- RLS on `arcp_capabilities`: enabled; SELECT policy for `auth.role() = 'authenticated'`; no write policies (admin-seeded only)
- Creates `arcp_entry_links`: `id, user_id, capability_key, entry_id, entry_type, notes, created_at`; unique on `(user_id, capability_key, entry_id, entry_type)`
- RLS on `arcp_entry_links`: all operations where `user_id = auth.uid()`
- Creates `share_links`: `id, user_id, token unique default encode(gen_random_bytes(32),'hex'), specialty_key, expires_at default now()+30days, revoked bool default false, created_at`
- RLS on `share_links`: all operations where `user_id = auth.uid()`
- Seeds 17 ARCP capabilities across 4 categories (clinical, safety, professional, development) from UKFPO Foundation Programme Curriculum 2021

### New type files
**`lib/types/arcp.ts`**
- `ARCPCategory` type union
- `ARCP_CATEGORY_LABELS` record
- `ARCPCapability` type
- `ARCPEntryLink` type

### New pages
**`app/(dashboard)/arcp/page.tsx`** (server component)
- Fetches all `arcp_capabilities` ordered by `sort_order`
- Fetches user's `arcp_entry_links`
- Passes both to `ARCPPageClient`

**`app/share/[token]/page.tsx`** (public, no auth, outside dashboard group)
- `export const dynamic = 'force-dynamic'` — prevents static prerender
- Looks up `share_links` by token without auth; 404 if not found, revoked, or expired
- Fetches `specialty_applications` + `specialty_entry_links` for that user
- Resolves entry titles from `portfolio_entries` and `cases`
- Renders clean read-only domain-by-domain evidence view
- "Built with Clinidex" footer

**`app/(dashboard)/settings/shared-links/page.tsx`**
- Lists all active (non-revoked) share links for the current user
- Shows specialty name, URL (monospace), days remaining badge
- Copy to clipboard, Preview (new tab), Revoke buttons per link

### New components
**`components/arcp/arcp-page-client.tsx`**
- Progress bar: capabilities evidenced / total
- Groups capabilities by `CATEGORY_ORDER` = `['clinical', 'safety', 'professional', 'development']`
- Renders `<CapabilityRow>` per capability

**`components/arcp/capability-row.tsx`**
- Expandable row; green dot indicator when has linked evidence
- "Link evidence" button opens `LinkARCPEvidenceModal`
- On expand: fetches entry details (title, date, type) for all linked IDs
- "Unlink" button deletes the `arcp_entry_links` row

**`components/arcp/link-arcp-evidence-modal.tsx`**
- Debounced search (300ms) across `portfolio_entries` + `cases` simultaneously
- Clicking a result: immediately inserts `arcp_entry_links` row; calls `onLinked`
- Shows type badge (Portfolio / Case), title, date

### New API routes
**`app/api/share/route.ts`**
- `GET`: returns all non-revoked share links for authenticated user
- `POST`: validates user tracks the `specialty_key`, inserts `share_links` row, returns `{id, token, specialty_key, expires_at, created_at}`
- `DELETE ?id=<linkId>`: sets `revoked = true` (ownership-checked via `user_id`)

### Modified files
**`lib/specialties/types.ts`**
- Added `ApplicationWindow` type: `{ opensDate: string; closesDate: string; source: string }`
- Added `applicationWindow?: ApplicationWindow` to `SpecialtyConfig` (no dates populated yet — infrastructure only, verified dates needed from NHS England)
- Added `supersededBy?: string` to `SpecialtyConfig`
- Added `is_active: boolean` and `archived_at: string | null` to `SpecialtyApplication`

**`components/sidebar.tsx`**
- ARCP nav item added after Specialties

**`components/specialties/add-specialty-modal.tsx`**
- After inserting a specialty application, checks `config?.applicationWindow`
- If present, inserts two `deadlines` rows with `is_auto: true` and `source_specialty_key: key`

**`components/specialties/specialty-card.tsx`**
- `handleRemove`: after deleting app + links, also deletes auto-deadlines matching `source_specialty_key` + `is_auto = true`

**`components/dashboard/deadlines-widget.tsx`**
- `Deadline` type updated: adds `is_auto?: boolean`, `source_specialty_key?: string | null`
- Auto deadlines: `cursor-default`, no edit handler, no complete/delete buttons, shows "auto" badge with calendar icon
- Manual deadlines: unchanged

**`components/deadlines/deadlines-page-client.tsx`**
- `Deadline` type updated (same as widget)
- Splits deadlines into `autoDeadlines` and `manualUpcoming`
- New "Application windows" section above Overdue/Upcoming with blue accent
- `Section` component updated to accept `'red' | 'blue'` accent

**`components/specialties/specialties-shell.tsx`**
- Fixed duplicate import (`getSpecialtyConfig` appeared twice; consolidated to single `import { getSpecialtyConfig, SPECIALTY_CONFIGS }`)
- Tab type extended: `'my_specialties' | 'compare' | 'archive'`
- `activeApplications = applications.filter(a => a.is_active !== false)`
- `archivedApplications = applications.filter(a => a.is_active === false)`
- `handleArchiveApplication(oldAppId, newApp)`: marks old app inactive in state, adds new app
- Archive tab: read-only cards showing archived applications
- `NewCycleBanner` component (inline): dismissible; checks if `config.supersededBy` exists and user isn't already tracking the new cycle; on "Start new cycle" inserts new app row + sets old `is_active=false, archived_at=now()`
- `CompareView` now receives `activeApplications` instead of all applications
- `isPro` passed through to `SpecialtyDetail`

**`components/specialties/specialty-detail.tsx`**
- Added `useEffect` import
- Added `isPro?: boolean` to Props
- Added `showShareModal` state
- Added "Share" button in header top-right (only rendered when `isPro = true`)
- Added `ShareModal` inline component (at bottom of file):
  - On open: fetches existing share links via `GET /api/share`, finds one matching `specialty_key`
  - No existing link: info bullets + "Generate link" button → `POST /api/share`
  - Existing link: URL display box, expiry date, Copy / Preview / Revoke actions
  - Footer link to `/settings/shared-links`

**`app/(dashboard)/settings/page.tsx`**
- "Shared links" section added (link to `/settings/shared-links`)

**`app/(dashboard)/dashboard/page.tsx`**
- Inline `SpecialtyApplication` object literal on line ~179: added `is_active: true, archived_at: null` to satisfy updated type

---

## Stage 13 — Mobile, Onboarding, Horus Import, GDPR Export, Notifications (Part 3)

### New database objects
**`supabase/schema-stage13.sql`**
- `profiles`: adds `onboarding_checklist_dismissed boolean default false`
- `profiles`: adds `onboarding_checklist_completed_items text[] default '{}'`
- `profiles`: adds `email_reminders_enabled boolean default false`
- Creates `notifications` table: `id, user_id, type (check constraint: deadline_due|share_link_expiring|application_window_open), title, body, link, read bool default false, created_at`
- RLS on `notifications`: all operations where `user_id = auth.uid()`
- Index: `notifications_user_unread` on `(user_id, read, created_at desc) WHERE read = false`

### New components
**`components/dashboard/onboarding-checklist.tsx`**
- Props: `userId`, `completedItems: string[]`, `accountCreatedAt`
- 5 hardcoded items: portfolio entry, add specialty, set deadline, log case, try export
- Each item: checkbox (manual toggle) + label + arrow link to destination
- Ticking updates `onboarding_checklist_completed_items[]` in profiles via Supabase
- All 5 ticked: 3-second celebration state → auto-dismiss (sets `onboarding_checklist_dismissed = true`)
- X button: dismisses immediately regardless of completion
- Collapsible (click header); progress bar in header
- Hidden if `onboarding_checklist_dismissed = true` OR (account > 30 days AND all done)

**`components/import/horus-import-wizard.tsx`** (`'use client'`, uses `papaparse`)
- Step 1 — Upload: drag-and-drop or file input; validates `.csv`; detects Horus format by checking for date + type + title column groups; shows setup instructions
- Step 2 — Preview: full table of parsed rows with per-row checkboxes; select all/none; warning count for unrecognised types; skippable row count
- Step 3 — Configure: specialty tags text input (comma-separated keys); duplicate handling radio (skip / import anyway)
- Step 4 — Done: shows `created / skipped / blocked` counts; blocked rows explained; links to portfolio
- Column mapping: `date`, `type→category`, `title/subject`, `supervisor`, `grade→supervision_level`, `comments→notes`, `clinical setting` appended to notes
- Type mapping: CBD/Mini-CEX/ACAT → `reflection`; DOP → `procedure`; Teaching → `teaching`; Audit → `audit_qip`; else → `custom`

### New API routes
**`app/api/import/horus/route.ts`**
- POST, authenticated
- Server-side PII scan on title + notes + supervisor fields: rejects rows matching NHS number pattern (`\d{3}\s?\d{3}\s?\d{4}`), DD/MM/YYYY DOB pattern, ward/bay/bed references, patient names with title prefix
- Blocked rows increment `blocked` counter; not inserted
- Date normalisation: DD/MM/YYYY → YYYY-MM-DD; ISO passthrough; fallback to `new Date(raw)` parse; defaults to today
- Duplicate check (when `dupHandling = 'skip'`): fetches existing `(title.toLowerCase(), date)` pairs for the user; skips matches
- Bulk insert into `portfolio_entries`; returns `{ created, skipped, blocked }`

**`app/api/account/export/route.ts`**
- POST, authenticated, uses `jszip`
- Fetches in parallel: profile, portfolio_entries, cases, deadlines, goals, specialty_applications, specialty_entry_links (filtered to user's app IDs), arcp_entry_links, entry_templates, evidence_files
- Assembles ZIP folder `clinidex-export-{date}/` with JSON files for each table
- Downloads evidence files from Supabase Storage bucket `evidence` into `evidence/{entry_id}/{filename}` subfolders; failed downloads skipped silently
- Generates ZIP as `ArrayBuffer` (jszip `type: 'arraybuffer'`); returns as `application/zip` with `Content-Disposition: attachment`

**`app/api/cron/notifications/route.ts`**
- GET, protected by `Authorization: Bearer {CRON_SECRET}` header check
- Uses service-role Supabase client (reads across all users)
- `maxDuration = 30`
- Generates `deadline_due` notifications for deadlines due within 2 days (not completed)
- Generates `share_link_expiring` notifications for share links expiring within 2 days
- Deduplicates: checks `notifications` table for same `(user_id, type, link)` created today
- Inserts only new notifications
- Email reminders: for Pro users (`subscription_status = 'active'`) with `email_reminders_enabled = true` — sends one consolidated Resend email per user listing all new notifications; uses `supabase.auth.admin.getUserById` to get email address

### Modified files
**`components/sidebar.tsx`** — significant additions
- `BOTTOM_NAV_ITEMS` constant: 5 items (Dashboard/Home, Portfolio, Cases, ARCP, Export) with 20px icons
- Mobile bottom nav bar: `fixed bottom-0 left-0 right-0 z-30 h-16 lg:hidden` with items from `BOTTOM_NAV_ITEMS`; active item highlighted in `#1B6FD9`
- Mobile header: hamburger button now has `min-w-[44px] min-h-[44px]` tap target; right side replaced `<div className="w-8" />` with `<NotificationBellMobile />`
- `NotificationBellSidebar`: renders in desktop sidebar nav section (after Search hint)
- `NotificationBell` shared component: fetches unread count from `notifications` table on mount; badge shows count (capped display at "9+"); clicking opens dropdown panel
- Dropdown: "Mark all read" button; list of unread notifications with type icon, title, body, relative timestamp; clicking marks as read and navigates to `link`; `NotifIcon` component per type; `timeAgo()` helper
- `useUnreadCount()` hook: simple `useEffect` fetch of unread count
- All notification logic is self-contained at bottom of sidebar.tsx — no separate file

**`app/(dashboard)/layout.tsx`**
- `<main>` classes: added `pb-16 lg:pb-0` for bottom nav clearance on mobile

**`components/ui/fab.tsx`**
- Position changed: `bottom-[4.5rem] right-5` on mobile (sits above 64px bottom nav + 8px gap); `lg:bottom-8 lg:right-8` unchanged

**`app/(dashboard)/dashboard/page.tsx`**
- Profile select now includes `onboarding_checklist_dismissed, onboarding_checklist_completed_items`
- `OnboardingChecklist` imported and rendered between page header and stat row
- Only shown when `profile.onboarding_checklist_dismissed` is falsy
- Stat row: `grid-cols-2 sm:grid-cols-3` (was `grid-cols-3`) — 2-column on mobile

**`app/(dashboard)/import/page.tsx`**
- Complete rewrite: stub replaced with `<HorusImportWizard />` and a back-navigation header

**`app/(dashboard)/settings/page.tsx`**
- Added `exportLoading`, `emailReminders`, `savingReminders` state
- Profile fetch now includes `email_reminders_enabled`
- `handleDataExport()`: POST to `/api/account/export`, creates object URL, triggers `<a>` download, revokes URL
- `handleToggleReminders(val)`: updates `email_reminders_enabled` in profiles; only callable if `subInfo?.isPro`
- New "Notifications" section: email reminders toggle (Pro-gated; disabled visually + pointer for non-Pro)
- New "Export your data" section: GDPR export button with loading state; explanatory text

**`package.json` + `package-lock.json`**
- Added: `papaparse`, `@types/papaparse`, `jszip`, `@types/jszip`

**`vercel.json`**
- Added `crons` array: `{ path: "/api/cron/notifications", schedule: "0 8 * * *" }` (daily 08:00 UTC)

---

## Environment variables required (Vercel)
| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | Already set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client | Already set |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron route | Already set |
| `RESEND_API_KEY` | Feedback + cron email | Already set |
| `CRON_SECRET` | `/api/cron/notifications` auth | **Needs adding** — any random 32+ char string; Vercel passes it automatically to cron jobs as `Authorization: Bearer <CRON_SECRET>` |

## Manual DB steps required
Run each SQL file in the Supabase SQL editor in order:
1. `supabase/schema-stage12.sql` — arcp tables, share_links, deadlines + specialty_applications columns
2. `supabase/schema-stage13.sql` — notifications table, profile checklist + reminder columns

---

## Key design decisions for auditors
- **No patient data**: Horus import API scans for NHS numbers, DOB patterns, ward references before inserting. Blocked rows are reported to the user but never saved.
- **No "ready" verdicts**: UI shows evidence counts and progress; no language saying a user is ready for an application.
- **Soft deletes only**: all queries filter `deleted_at IS NULL`; hard deletes are never performed in application code.
- **RLS enforced everywhere**: every new table has RLS enabled. `arcp_capabilities` is read-only for authenticated users (no write policies = API blocked). `notifications` and `share_links` and `arcp_entry_links` are user-scoped.
- **Share links are token-based**: the public `/share/[token]` page requires no auth — the 64-char hex token is the secret. Expiry and revocation are checked server-side on every request (`force-dynamic`).
- **Pro gating**: Share button on specialty detail, email reminders toggle — both check `isPro`/`subInfo.isPro` before enabling. ARCP page, onboarding checklist, Horus import, GDPR export are all free.
- **UK data residency**: `vercel.json` sets `"regions": ["lhr1"]`. No external data processors introduced.
