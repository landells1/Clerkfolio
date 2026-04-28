# Clinidex V2 — Implementation Handover

**Source:** 30-question grill-me session, 2026-04-28. This is the single source of truth for v2 work. Both Claude Code and Codex must read this before touching anything.

---

## 1. Hard constraints (do not violate)

1. **No advice, predictions, or competitive benchmarks.** Show users their own collated data only. Never tell them whether they're "on track," "competitive," or what they "need." Liability risk.
2. **Not a Horus replacement.** ARCP in Clinidex is purely for personal organisation. No supervisor signoff, no formal submission flows, no integration with NHS ePortfolio. Do not build features that compete with Horus.
3. **No patient demographics ever.** Cases must remain anonymised. No name/DOB/MRN/identifier fields.
4. **Supabase London region only** (eu-west-2). UK GDPR + marketing requirement.
5. **RLS on every new table.** All new tables enforce `auth.uid() = user_id` for user data, with explicit policies.
6. **Soft deletes only for user content.** `deleted_at` filtering in app code, not RLS. Hard delete only on explicit user action (account deletion, trash empty after 30 days).
7. **Never auto-delete user data on subscription downgrade.** Block new uploads, never destroy existing.
8. **Auto-push workflow.** After every completed task that edits files: `git add` (specific files), commit, `git push origin main`. If push fails: `git pull --rebase`, resolve, push.

---

## 2. New tier model — replaces existing 6-month trial

### Three tiers

| Tier | Who | Storage | Pro features |
|---|---|---|---|
| **Free** | Default for FY1+ | 100MB | None (use limits below) |
| **Pro** | £10/year | 5GB | Full unlimited access |
| **Student** | Verified medical students (`.ac.uk` email at signup) | 5GB | Full unlimited access (free) |

### Free tier "try Pro" usage limits (lifetime, not time-windowed)

The 14-day/6-month time-based trial is **removed entirely**. Replaced with usage-based free Pro experiences:

- 1 PDF export (lifetime)
- 1 shareable link (lifetime)
- 1 specialty tracked simultaneously (always — not lifetime)

### Student tier rules

- Detected at signup if email matches `.ac.uk` (case-insensitive). Stored as `profiles.student_email_verified = true`.
- Career stage must be one of `Y1, Y2, Y3, Y4, Y5, Y6`.
- When student progresses career stage to `FY1+`, get **3-month grace period** with full Pro retained, then revert to Free unless they pay.

### Referrals

- Each user has a unique `referral_code` (6-byte hex, generated at signup).
- Public signup URL: `/signup?ref=CODE`.
- When a referred user **completes onboarding** (not just signs up — anti-gaming): both referrer and referee get **1 month Pro** added (`pro_features_used.referral_pro_until`).
- Stacks: 12 successful referrals = 12 months of Pro.

### Free → Pro features (gated)

- Specialty tracker beyond 1 tracked specialty
- PDF export beyond first one
- Shareable links beyond first one
- Granular email preferences (Free gets a single on/off toggle)
- Bulk import (CSV, Horus)
- Advanced storage (>100MB)

### Free tier (always free, no usage limit)

- All Cases functionality
- All Portfolio functionality (entries, templates, themes, reflection frameworks)
- ARCP tracking (full)
- Dashboard (merged with old Insights)
- Timeline (Goals + Deadlines, calendar view)
- Tag management, settings, tutorial
- Personal data backup (CSV/JSON of own data — they own it, GDPR right)
- Single email reminder on/off toggle

---

## 3. Database schema changes (Claude Code task #1)

Create migration file `supabase/migrations/2026_04_28_v2_foundations.sql`. Schema changes below are the complete spec.

### New tables

```sql
-- Custom competency themes (user-defined, reusable)
create table custom_competency_themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);
alter table custom_competency_themes enable row level security;
create policy "manage own custom themes" on custom_competency_themes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Entry revisions (version history)
create table entry_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null,
  entry_type text not null check (entry_type in ('portfolio','case')),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table entry_revisions enable row level security;
create policy "manage own revisions" on entry_revisions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index entry_revisions_entry_idx on entry_revisions (entry_id, entry_type, created_at desc);

-- Audit log (lightweight; service role inserts only)
do $$ begin
  create type audit_action as enum (
    'login', 'share_link_generated', 'share_link_viewed', 'data_export', 'account_deleted', 'subscription_changed'
  );
exception when duplicate_object then null; end $$;

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action audit_action not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table audit_log enable row level security;
create policy "read own audit" on audit_log for select using (auth.uid() = user_id);
-- No insert policy: insertion via service role only

-- Share views (track public link visits)
create table share_views (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references share_links(id) on delete cascade,
  ip_hash text,
  viewed_at timestamptz not null default now()
);
alter table share_views enable row level security;
create policy "read own share views" on share_views for select
  using (exists (select 1 from share_links sl where sl.id = share_link_id and sl.user_id = auth.uid()));

-- Referrals
create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','completed','revoked')),
  reward_granted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (referred_id)
);
alter table referrals enable row level security;
create policy "read own referrals" on referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id);
```

### Modifications to existing tables

```sql
-- profiles: tier, referral, usage tracking, granular notification prefs, student verification
alter table profiles
  add column tier text not null default 'free' check (tier in ('free','pro','student')),
  add column student_email_verified boolean not null default false,
  add column referral_code text unique,
  add column referred_by uuid references auth.users(id) on delete set null,
  add column pro_features_used jsonb not null default '{"pdf_exports_used":0,"share_links_used":0,"referral_pro_until":null}'::jsonb,
  add column notification_preferences jsonb not null default '{"deadlines":true,"share_link_expiring":true,"activity_nudge":false,"application_window":true}'::jsonb,
  add column student_grace_until timestamptz;
-- Backfill referral_code for existing users
update profiles set referral_code = encode(gen_random_bytes(6), 'hex') where referral_code is null;
-- Migrate old email_reminders_enabled into new notification_preferences
update profiles set notification_preferences = jsonb_set(
  notification_preferences,
  '{deadlines}',
  to_jsonb(coalesce(email_reminders_enabled, false))
);
alter table profiles drop column email_reminders_enabled;
-- subscription_status, subscription_period_end, trial_started_at can stay (Stripe-fed) but trial_started_at no longer drives gating
alter table profiles alter column trial_started_at drop not null;

-- share_links: scope, theme, pin, view_count, revoked_at
alter table share_links
  add column scope text not null default 'specialty' check (scope in ('specialty','theme','full')),
  add column theme_slug text,
  add column pin_hash text,
  add column view_count int not null default 0,
  add column revoked_at timestamptz;
-- expiry now user-chosen; allow nullable expires_at (or keep default 30d, let UI override)

-- evidence_files: virus scan status
alter table evidence_files
  add column scan_status text not null default 'pending' check (scan_status in ('pending','scanning','clean','quarantined')),
  add column scan_completed_at timestamptz;

-- goals: optional link to a specialty application
alter table goals
  add column specialty_application_id uuid references specialty_applications(id) on delete set null;

-- specialty_entry_links: portfolio only (cases removed)
delete from specialty_entry_links where entry_type = 'case';
alter table specialty_entry_links drop constraint if exists specialty_entry_links_entry_type_check;
alter table specialty_entry_links add constraint specialty_entry_links_entry_type_check check (entry_type = 'portfolio');

-- arcp_entry_links: portfolio only (cases removed)
delete from arcp_entry_links where entry_type = 'case';
alter table arcp_entry_links drop constraint if exists arcp_entry_links_entry_type_check;
alter table arcp_entry_links add constraint arcp_entry_links_entry_type_check check (entry_type = 'portfolio');

-- Drop vestigial logbook table
drop table if exists logbook_entries cascade;
```

### Cron jobs (set up in Supabase scheduled functions)

```sql
-- Daily: purge soft-deleted entries older than 30 days
delete from cases where deleted_at < now() - interval '30 days';
delete from portfolio_entries where deleted_at < now() - interval '30 days';

-- Weekly: purge audit logs older than 1 year
delete from audit_log where created_at < now() - interval '1 year';

-- Daily: revoke share links past expires_at; null out pin_hash on revoke
update share_links set revoked_at = now() where expires_at < now() and revoked_at is null;
```

---

## 4. Tag system rationalisation (Claude Code task #2)

Three distinct tag types, each with explicit UI labelling. Never present them generically as "tags."

| Type | Field | Where | Source |
|---|---|---|---|
| **Linked specialties** | `specialty_tags[] text` | Cases + Portfolio | User's tracked `specialty_applications` only (not all 27) |
| **Competency themes** | `interview_themes[] text` (slugs) | Cases + Portfolio | Preset 8 + per-user `custom_competency_themes` |
| **Clinical area** | `clinical_domain text` | Cases only | Free text with suggestions from `CLINICAL_DOMAINS` |

### Preset competency themes (rename from "interview themes")

Keep the existing 8 slugs (`leadership, teamwork, communication, clinical_reasoning, teaching, research, audit_qip, professionalism`). Rename the *concept* in UI from "interview themes" to "competency themes."

### Custom themes UX

- Tag picker shows preset + user's custom themes mixed.
- Inline "Manage themes" button in the picker opens a small modal: list of user's custom themes with delete buttons.
- Deleting a custom theme: cascade-removes the slug from all `interview_themes[]` arrays on cases + portfolio_entries.

### Database storage

`interview_themes[]` stays as a `text[]`. Slugs are unique per user across preset + custom (preset slugs are reserved — block users from creating customs that collide).

---

## 5. Subscription gating refactor (Claude Code task #3)

### Update `lib/subscription.ts`

Replace `getSubscriptionInfo()` with new shape:

```ts
export type Tier = 'free' | 'pro' | 'student'

export interface SubscriptionInfo {
  tier: Tier
  isPro: boolean       // tier === 'pro' OR tier === 'student' OR within referral_pro_until OR within student_grace_until
  isStudent: boolean   // tier === 'student' (active student status)
  storageQuotaMB: number  // 100 if free, 5120 if pro/student
  usage: {
    pdfExportsUsed: number
    shareLinksUsed: number
    specialtiesTracked: number  // count of active specialty_applications
    storageUsedMB: number       // sum of evidence_files for user
    referralProUntil: string | null  // ISO date or null
    studentGraceUntil: string | null
  }
  limits: {
    canExportPdf: boolean        // isPro || usage.pdfExportsUsed < 1
    canCreateShareLink: boolean  // isPro || usage.shareLinksUsed < 1
    canTrackAnotherSpecialty: boolean  // isPro || usage.specialtiesTracked < 1
    canBulkImport: boolean       // isPro
    canUploadFiles: boolean      // usage.storageUsedMB < storageQuotaMB
  }
}
```

### Gate locations to update

- `app/(dashboard)/export/page.tsx` — check `limits.canExportPdf` before allowing PDF generation; show upsell card otherwise. CSV/JSON personal backup remains free.
- `app/(dashboard)/specialties/page.tsx` — when adding a new specialty, check `limits.canTrackAnotherSpecialty`.
- `app/(dashboard)/share/...` (new) — check `limits.canCreateShareLink`.
- `app/api/import/horus/route.ts` and CSV import — gate on `limits.canBulkImport`.
- `<EvidenceUpload>` — gate on `limits.canUploadFiles`. Show banner if quota exceeded but allow downloads.

### Increment logic

After successful PDF generation: increment `pro_features_used.pdf_exports_used`. After successful share link creation: increment `pro_features_used.share_links_used`. These never reset for free users (lifetime).

---

## 6. File upload security (Claude Code task #4)

### Whitelist (enforce in upload handler)

- Documents: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX), `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX), `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX), `text/plain` (TXT)
- Images: `image/png`, `image/jpeg`, `image/heic`

**Reject everything else** (legacy Office, archives, executables, scripts, audio, video).

### Magic byte validation

Do not trust the client-provided MIME type. In the upload route, read the first ~16 bytes of the buffer and validate against expected magic bytes for each whitelisted type. Use a small library (`file-type` package on npm — pure JS, no native deps) or implement inline. Reject mismatches with 415 status.

### Virus scanning via Edge Function

1. Create `supabase/functions/scan-evidence/index.ts` — accepts a storage path, fetches file, runs ClamAV scan, updates `evidence_files.scan_status`.
2. Use ClamAV bundled in a Docker image or a hosted scan API (e.g., VirusTotal free tier for early days; ClamAV self-hosted later for cost).
3. On upload: insert `evidence_files` row with `scan_status='pending'`, immediately invoke scan function, update status async.
4. UI: files with `scan_status='pending'` show a "Scanning..." indicator and cannot be downloaded yet. `'quarantined'` files show a warning and offer "Delete file" only.
5. Public share view: never serve `scan_status != 'clean'` files.

### Rate limit on `/share/[token]` route

5 requests per minute per IP via Vercel Edge Middleware. After 100 views in an hour, auto-revoke the link and email the owner.

---

## 7. Cases vs Portfolio data model fix (Claude Code task #5)

Already in the SQL above (delete case-typed rows from `specialty_entry_links` and `arcp_entry_links`, then constrain to `entry_type = 'portfolio'`).

Code changes:
- Remove case-as-evidence option from `<LinkArcpEvidenceModal>` and any specialty domain link modals. Show portfolio entries only.
- Cases retain `specialty_tags[]` for filtering and PDF export. No other change.

---

## 8. Documentation updates (Claude Code task #6)

- Update `AGENTS.md` (already in this commit — see file).
- Update `.claude/CLAUDE.md` (already in this commit — see file).
- Privacy policy: Codex task. See task list below.

---

# Codex task list (bulk implementation)

Each task includes target files and acceptance criteria. Auto-push after each completed task.

---

## C1. Logbook removal

**Files to remove:**
- `app/(dashboard)/logbook/` — entire directory
- `lib/types/logbook.ts`
- `supabase/schema-logbook.sql` (or any logbook migration files — leave the new drop-table migration in place)
- Any logbook-related components in `components/` (if any exist)

**Files to edit:**
- `components/sidebar.tsx` — remove the Logbook entry from `NAV_ITEMS`.
- Search for any `logbook` references across the codebase and remove.

**Acceptance:** No `logbook` references remain. Sidebar no longer shows Logbook. Build passes.

---

## C2. Career-stage adaptive sidebar + prominent stage setting

**File:** `components/sidebar.tsx`

Build a `getNavItemsForStage(careerStage: string)` that filters `NAV_ITEMS`:
- Medical students (`Y1`-`Y6`): hide ARCP. All other items visible.
- FY1, FY2: full nav including ARCP.
- Post-FY (no career_stage in `[Y1..Y6, FY1, FY2]`): hide ARCP.

Fetch `profiles.career_stage` server-side in `app/(dashboard)/layout.tsx` and pass to sidebar.

**File:** `app/(dashboard)/settings/page.tsx`

Make career stage a top-level prominent card (not buried in profile section). On change: show a confirmation modal: *"Changing your career stage will adjust which features are shown in the sidebar. Your data will not be affected. Continue?"*

**Acceptance:** Med student account doesn't see ARCP in nav. FY1 sees it. Career stage setting is a clearly labeled card with warning modal.

---

## C3. Cases UX redesign — journal timeline

**File:** `app/(dashboard)/cases/page.tsx` and `components/cases/cases-list-client.tsx`

Replace the current list-with-pagination layout with a journal-style timeline:

- **Default view:** Reverse-chronological feed grouped by month (e.g., "April 2026", "March 2026" headers). Within each month, cases sorted by `created_at` desc.
- **Pinned section:** at top, separate section labelled "Pinned" — only shown if user has pinned cases.
- **Card content:** title, date, clinical area badge, **first sentence of `notes`** as inline preview (extract first sentence by splitting on `. ` and taking [0], or first 140 chars if no period).
- **Search bar:** persistent, filters by title or notes content.
- **Filter button:** opens a side panel with filters (clinical area, specialty tag, date range). Hidden by default — keep visual calm.
- **Mobile:** single column, bottom-sheet for filters.

**Acceptance:** Cases page has a distinctly different visual feel from Portfolio. Mobile-friendly. First-sentence preview works. Pinned cases at top.

---

## C4. Timeline page (Goals + Deadlines merged)

**Create:** `app/(dashboard)/timeline/page.tsx` and `components/timeline/`

Replace separate Goals and Deadlines pages with a single Timeline page.

**Default view: calendar.** Monthly grid (mobile: agenda list view by default). Use a lightweight calendar lib (e.g., `@fullcalendar/react` or build simple grid with `date-fns`). Each tracked specialty gets a colour from a palette (8-colour rotation; assign by `specialty_application.id` modulo 8).

**Items shown:**
- **Real specialty deadlines:** auto-populated from specialty configs. Read-only. Coloured by specialty.
- **User goals:** from `goals` table. If `specialty_application_id` is set, coloured by specialty; else neutral grey.

**Toggle:** Calendar / List. List view groups by specialty, then "Other" for unlinked goals.

**Goal creation flow:**
- "Add goal" button. Goal form: category, target_count, due_date, optional `specialty_application_id` dropdown.

**Files to delete:**
- `app/(dashboard)/goals/`
- `app/(dashboard)/deadlines/`
- `components/dashboard/goals-widget.tsx` and `deadlines-widget.tsx` (or repurpose into Timeline preview widget)

**Sidebar update:** Replace "Goals" and "Deadlines" with a single "Timeline" item.

**Specialty deadline data source:** create `lib/specialties/deadlines.ts` — a flat constants file mapping `specialty_key` → `{ applicationOpens, applicationCloses, shortlistingDate, ... }` for easy manual updates monthly.

**Acceptance:** Single Timeline page. Calendar default. Per-specialty colours. Real deadlines auto-populate when user adds a tracked specialty. Goals and Deadlines no longer in sidebar.

---

## C5. Dashboard + Insights merge

**Files to edit:** `app/(dashboard)/dashboard/page.tsx`, `components/dashboard/`
**Files to delete:** `app/(dashboard)/insights/` and `components/insights/` (after merging useful charts).

Restructure the dashboard with clear hierarchy. Use collapsible sections (default: first three open, rest collapsed) to prevent overwhelm.

**Top strip:**
- Quick-add FAB (existing, keep prominent).
- "Upcoming this month" — next 30 days of Timeline items (max 5 shown).

**Section: Activity**
- Activity heatmap (existing).
- Streak counter (existing).

**Section: Portfolio**
- Coverage by category (existing widget).
- Entry volume over time (12-month chart, from old Insights).

**Section: Specialty progress**
- One row per tracked specialty: name, % domains with at least one linked entry, entry count. Just data — no advice text.

**Section: Recent activity**
- Activity feed (existing 3-tab widget).

**Sidebar update:** Remove "Insights" item.

**Acceptance:** Single dashboard page replaces Dashboard + Insights. Collapsible sections. Mobile-stackable.

---

## C6. Category-aware completeness scoring

**File:** create `lib/utils/completeness.ts`

```ts
export function calculateCompleteness(entry: PortfolioEntry | Case, type: 'portfolio' | 'case'): 'green' | 'amber' | 'red'
```

**Per-category required fields for portfolio entries:**
- `audit_qip`: title, date, audit_type, audit_role, audit_cycle_stage, audit_outcome, specialty_tags
- `teaching`: title, date, teaching_type, teaching_audience, specialty_tags
- `conference`: title, date, conf_event_name, conf_attendance_level, specialty_tags
- `publication`: title, date, pub_journal, pub_status, specialty_tags
- `leadership`: title, date, leader_role, leader_organisation, specialty_tags
- `prize`: title, date, prize_body, prize_level, specialty_tags
- `procedure`: title, date, proc_name, proc_count, specialty_tags
- `reflection`: title, date, refl_type, notes (≥50 chars), specialty_tags
- `custom`: title, date, notes, specialty_tags

**For cases:** title, date, clinical_domain, notes (≥30 chars).

**Logic:**
- All required fields populated → green
- Missing 1 required field → amber
- Missing 2+ required fields → red

Recalculate on entry save (server-side in the form submission). Store as `completeness_score smallint` (existing column). Encode green=2, amber=1, red=0.

**UI:** small coloured dot on entry card (existing pattern). Tooltip lists missing fields.

**Acceptance:** Scoring reflects category-specific completeness. Tooltip explains why amber/red.

---

## C7. Share & Export hub

**File:** `app/(dashboard)/export/page.tsx` — restructure as unified hub. Rename in nav to "Share & Export."

**Three tabs at the top:**
1. **PDF export** (existing, keep current filtering UI).
2. **Data backup** (CSV/JSON — free for all users; keep current).
3. **Share links** (new section).

### Share links tab

- "Create new link" button opens modal:
  - Scope: Specialty / Theme / Full portfolio (radio).
  - If Specialty: select from user's tracked specialties.
  - If Theme: select from preset + custom competency themes.
  - Expiry: 1 day / 1 week / 1 month / Custom (date picker, max 90 days).
  - Optional PIN: 4-digit numeric input (stored as bcrypt hash).
- List of existing links: scope label, expiry date, view count, revoke button, copy URL button, **renew button** (revokes old, creates new with same scope + new expiry).

### Public share view (`/share/[token]/page.tsx`)

- If link has PIN: show PIN entry screen first. On correct PIN, show portfolio.
- Increment `share_links.view_count`, insert `share_views` row with hashed IP.
- Auto-revoke logic: if 100+ views in last hour, set `revoked_at`, send email to owner.

### Two PDF modes

- **Portfolio export** (formal): specialty/theme filtered, portfolio entries only, current designed layout.
- **Full export** (personal records): all data including cases, less formal layout (separate `lib/pdf/full-pdf.tsx` template).

Toggle on PDF tab. Defaults to Portfolio for any specialty/theme filter, Full when "Everything" selected.

**Acceptance:** Single unified Share & Export page. Multiple concurrent share links per user. PIN protection works. View count visible. Renewal works. Full vs Portfolio PDF toggle.

---

## C8. Email notifications system

**Files:** `app/api/cron/notifications/route.ts` (existing — extend), `lib/notifications/email-templates.tsx`

**Email types** (each toggled by `notification_preferences.{key}`):
- `deadlines` — 14 days, 3 days, 1 day before any deadline.
- `share_link_expiring` — 3 days and 1 day before expiry.
- `activity_nudge` — if no entries logged in 14 days (opt-in only, default off).
- `application_window` — when a tracked specialty's application opens.

Render emails via React Email (`@react-email/components` package) for clean templates. Send via existing Resend integration.

**Settings UI:** `app/(dashboard)/settings/notifications/page.tsx` — toggles for each notification type. Free tier sees a single master toggle; Pro sees per-type controls.

**Cron schedule:** daily at 09:00 UTC.

**Acceptance:** Each notification type respects its toggle. Free tier has master toggle only. Emails render cleanly.

---

## C9. Onboarding 4-step redesign

**File:** `app/onboarding/page.tsx` — restructure as 4 steps with stepper UI:

1. **Profile:** name, career stage (with prominent description: *"This affects which features are shown to you. You can change it any time in Settings."*).
2. **Tracked specialties:** for FY1+: "Add the specialty programmes you're considering." Multi-select from `SPECIALTY_CONFIGS`. For Y1-Y6: same UI but framing: "Which specialties interest you? You can update this any time."
3. **ARCP setup** (only shown if career_stage in `[FY1, FY2]`): "Enable ARCP tracking? You can map your portfolio entries to Foundation Programme capabilities." Skip or enable.
4. **First entry nudge:** "Log your first entry now or skip to dashboard." Two CTAs: "Log a case" / "Add to portfolio" / "Skip for now".

Each step has Skip option (writes minimum required to profile and proceeds). All four are required to flip `onboarding_complete=true`.

**Settings:** "Restart tutorial" button in Settings → resets `onboarding_complete=false` and `onboarding_checklist_completed_items=[]`, redirects to `/onboarding`.

**Acceptance:** 4 steps in stepper UI. Each skippable. Restart from settings works. ARCP step only shown for FY1/FY2.

---

## C10. ARCP overview header

**File:** `app/(dashboard)/arcp/page.tsx` and `components/arcp/`

Add a summary header above the capability list:
- "X of 17 capabilities have evidence" (count of capabilities with at least one `arcp_entry_links` row for this user).
- Per-category strip (Clinical, Safety, Professional, Development): "X / Y evidenced" small bars.

No new page — just an additive header section. Pure data, no advice.

**Curriculum versioning:** add `curriculum_version text default 'FP2021'` column to `arcp_capabilities` table. Future-proof for FP2025+. Don't migrate existing data — that's for when the curriculum actually updates.

**Acceptance:** Overview header shows capability counts per category. Curriculum version column exists.

---

## C11. Templates trimming and lower profile

**Files:** `app/(dashboard)/settings/templates/page.tsx`, `components/portfolio/template-picker-modal.tsx`, seed data

**Trim curated templates** from 24 to 8-10 high-value ones (prioritise: QI Audit Cycle 1, QI Audit Cycle 2, Teaching to peers, Teaching to students, National conference attendance, Original research publication, Local leadership role, CBD reflection). Update seed migration.

**Lower profile on entry form:**
- Replace prominent "Use a template" prompt with a small inline button labelled "Use a template" near the category selector.
- Personal templates list shown first in picker (user's saved); curated below.

**Acceptance:** ~9 curated templates. Template picker still works. Less aggressive promotion.

---

## C12. Mobile responsiveness pass

Comprehensive — touch every page.

**Global:**
- Convert sidebar to bottom nav bar on mobile (`md:hidden` for sidebar, `md:hidden` complement for bottom nav).
- Bottom nav: 5 items max — Dashboard, Portfolio, Cases (with FAB-style + button in middle), Timeline, Settings (overflow → menu).
- Quick-add FAB persists on mobile as floating button.

**Forms:**
- Single-column on mobile (stack all fields).
- Larger tap targets (min 44x44).
- Date inputs use native mobile picker.

**Tables / scoring tables:**
- Specialty domain table: horizontal scroll on mobile with sticky first column. Or collapsible domain cards.

**Modals:**
- Full-screen on mobile (not centred dialogs).

**Test on:** iPhone SE (375px), iPhone 14 (390px), iPad (768px), desktop (1280px+).

**Acceptance:** All flows usable on iPhone SE width. Bottom nav appears under md breakpoint. No horizontal scroll on any page except specialty domain tables (intentional with sticky column).

---

## C13. Print stylesheet

**File:** `app/globals.css` — add comprehensive `@media print` block.

Rules:
- Hide: sidebar, bottom nav, FAB, modal triggers, "Edit" buttons, all interactive chrome.
- Light theme on print: white background, black text.
- Expand all collapsible sections.
- Page breaks: `page-break-before: always` on each major section.
- Header on every printed page: "[User name] — Clinidex portfolio — [date]" via `@page` rules where supported.
- Footer: page numbers via `@page { @bottom-right { content: counter(page) }}`.

Test on Chrome and Safari print preview.

**Acceptance:** Ctrl+P on any page produces a clean black-on-white printable view. Shared link prints cleanly without nav chrome.

---

## C14. Referral system

**Pages:**
- `app/(dashboard)/settings/referrals/page.tsx` — shows user's referral code, shareable URL (`https://clinidex.co.uk/signup?ref=CODE`), copy button, list of completed referrals + total Pro time earned.

**Logic:**
- `app/signup/page.tsx` — read `?ref=CODE` query param. If present, look up `profiles.referral_code = CODE`. On signup completion, set new user's `referred_by = referrer.user_id`.
- On `onboarding_complete=true` transition: insert `referrals` row with `status='completed'`, `reward_granted_at=now()`, set `pro_features_used.referral_pro_until` on both users to `max(current_value, now() + 30 days)`.

**Email:** referrer gets a "Your referral signed up — you've earned 1 month of Pro!" email.

**Acceptance:** Signup with `?ref=` works. Both parties get Pro extension on referee onboarding completion. Referral page shows status.

---

## C15. Version history UI

**File:** `app/(dashboard)/portfolio/[id]/history/page.tsx` (new) and same for cases.

**On entry detail page:** add a "View history" button next to "Edit." Opens history page.

**History page:**
- List of revisions newest first.
- Each shows: timestamp, optional "auto-saved" or "manual edit" label, diff summary (which fields changed vs previous).
- "Restore this version" button per row — copies snapshot back to live row, creates new revision marking the restore.

**Save logic:**
- On every entry save, before update, insert current row state into `entry_revisions` as snapshot.
- Cap at 50 revisions per entry; oldest auto-pruned (`delete from entry_revisions where ... and id not in (select id ... order by created_at desc limit 50)`).

**Acceptance:** Edit → save creates revision. History page shows list. Restore works.

---

## C16. Privacy policy rewrite

**File:** `app/privacy/page.tsx`

Comprehensive rewrite covering:
- What data is collected (email, profile, portfolio entries, evidence files, payment metadata via Stripe)
- Why (functional, billing, communications)
- Where stored (Supabase London — eu-west-2)
- Sub-processors: Supabase (London), Stripe (UK entity), Resend (US — flag this), Vercel (US for hosting; data lives in Supabase)
- Retention: trash 30 days, audit logs 1 year, account deletion immediate cascade with up to 30-day backup retention
- User rights under UK GDPR: access, rectification, deletion, portability, objection
- Cookie usage (auth session cookies, analytics)
- Contact for data requests: admin@clinidex.co.uk
- Last updated date

**Tone:** plain English, scannable headings, no legalese.

**Also update:** `app/terms/page.tsx` if it references the old subscription model (6-month trial → usage-based).

**Acceptance:** Privacy policy is comprehensive, lists all sub-processors, covers GDPR rights. Terms reflects new tier model.

---

## C17. Renamed "Interview Prep" → fold into Portfolio as Themes view

**Delete:** `app/(dashboard)/interview-prep/` directory.

**Edit:** `app/(dashboard)/portfolio/page.tsx` — add view-toggle at the top: **Categories** (default) / **Themes** / **All** (flat list).

**Themes view:**
- One section per competency theme (preset + user's custom).
- Each section: theme name, count of entries tagged, expandable list of entries.
- Empty themes hidden.

**Categories view:** existing tabbed UI.

**All view:** flat list sorted by date desc.

**Sidebar update:** remove "Interview Prep" item.

**Mobile:** view toggle becomes a dropdown on small screens to save space.

**Acceptance:** Interview Prep page gone. Portfolio has 3 view modes. Themes view shows entries grouped by theme.

---

## C18. Misc nav cleanup

**File:** `components/sidebar.tsx`

Final nav order (after all changes):
- Dashboard
- Portfolio
- Cases
- Specialties (Pro after first 1)
- ARCP (FY1/FY2 only)
- Timeline
- Share & Export
- Settings (bottom)

Remove from nav: Logbook, Insights, Goals, Deadlines, Interview Prep, Trash (move Trash to a discreet link in Settings).

**Acceptance:** Clean, minimal nav. Career-stage-adaptive (ARCP hidden where inappropriate).

---

# Mobile / cross-cutting requirements (apply to all Codex tasks)

- Every new page must be tested at 375px width.
- Every form must stack to single column on mobile.
- Every modal must be full-screen on mobile.
- All buttons must have min 44x44 tap target.
- No horizontal scroll except specialty domain tables (with sticky first column).

---

# Out of scope for v2 (do not build)

- Royal College portal formatting
- Supervisor sign-off / external verification (Horus replacement)
- Native mobile app (responsive web only)
- Word doc export
- Patient-identifiable fields
- Community-shared templates (moderation overhead)
- ST4+ pathway expansion (some configs exist; do not promote)
- Full notification centre (email-first; in-app bell can come later)
- Audit log surfaced to users (table exists, no UI yet)

---

# Implementation order (suggested)

**Claude Code first, in this order (foundational):**
1. Schema migration (section 3)
2. Subscription gating refactor (section 5)
3. Tag system rationalisation (section 4)
4. Cases removed from links (section 7) — covered in schema migration
5. File upload security (section 6)
6. Update AGENTS.md and CLAUDE.md (section 8)

Push after each. Codex picks up from clean main.

**Codex order (after Claude foundation lands):**
- C1, C18 (nav cleanup) — fast wins
- C2 (career-stage adaptive) — uses new schema fields
- C5 (dashboard merge), C4 (Timeline), C17 (Themes view) — major UI restructures
- C3 (Cases UX) — visual divergence
- C6 (completeness) — small but cross-cutting
- C7 (Share & Export hub) — depends on schema (already shipped by Claude)
- C8 (notifications), C9 (onboarding) — independent
- C10 (ARCP), C11 (templates) — small
- C14 (referrals), C15 (version history) — independent
- C12 (mobile pass) — broad — last so all UI is in final form
- C13 (print) — last — needs final UI
- C16 (privacy/terms) — last — anchored to final state
