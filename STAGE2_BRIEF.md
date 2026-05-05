# Stage 2 — Codex Build Brief

> Self-contained brief. Read this top-to-bottom before touching code. Do not skim. Every batch is testable on its own; complete one batch fully (typecheck + commit + push) before starting the next.

---

## 0. Setup (run once)

1. `git pull --rebase origin main`
2. Read `HANDOVER.md` (single source of truth) and `.claude/CLAUDE.md`. Hard constraints there override anything in this brief.
3. `npx tsc --noEmit` must pass clean before you start. If it doesn't, stop and tell the user.
4. Supabase project: `dldhnstjngendpcywthv` (eu-west-2). Live. Apply migrations via Supabase MCP if available; otherwise write the file under `supabase/migrations/YYYY_MM_DD_<name>.sql` and ask the user to apply.

## 1. Workflow per batch

For each batch in §3:

1. Plan the schema deltas first; write the migration file. Apply via MCP. Confirm advisors clean (`get_advisors` security + performance).
2. Implement code changes. Use `Edit`/`Write`. No `git add -A`.
3. `npx tsc --noEmit` — must pass before commit.
4. `npm run lint` — fix new warnings introduced by your changes; existing warnings can stay.
5. `git add` only the files you touched. Commit with a message of the form: `Stage 2 batch N: <short summary>` and a body listing the feature numbers landed.
6. `git push origin main`. If push fails, `git pull --rebase`, resolve, push again.
7. Move to next batch.

**Do not rewrite or restructure unrelated code while passing through.** Stay surgical — Stage 1 already cleaned a lot.

## 2. Constraints (never break — copied verbatim from HANDOVER.md)

- No advice, predictions, or competitive benchmarks. Show users their own collated data only.
- No supervisor signoff or external verification flows. Do not compete with Horus.
- Supabase eu-west-2 only.
- No patient demographics — cases must remain anonymised.
- RLS on every new table, keyed on `auth.uid() = user_id`. Use `(select auth.uid())` (init-plan optimised) — Stage 1 standardised this.
- Soft deletes only. `deleted_at` filtered in app code, not RLS.
- Cron routes must call `validateCronSecret(req)` from `lib/cron.ts`.
- All state-changing API routes must call `validateOrigin(req)` from `lib/csrf.ts`.
- Never create accounts, never enter sensitive financial data, never ship a feature that auto-deletes user data on subscription downgrade.

## 3. Batches

Each batch is sized so a single Codex session can complete + test it. Ordered by dependency: 1 (tier model) feeds gating decisions in every later batch.

---

### Batch 1 — Pricing & tier model rework

**Goal**: lock the Pro tier so it can only be purchased post-graduation, simplify the referral reward cap, and rebalance bulk operations into Free.

**Features**:
- **126** Pro is **annual £10 only**, no monthly. Currently true; remove any vestigial monthly copy/UI/Stripe price IDs.
- **126 cont.** Pro purchase is unlocked **only for users whose `career_stage` is `FY1`, `FY2`, or `POST_FY`**. Medical students (`Y1`–`Y6`, `Y5_PLUS`) see the upgrade page rendered as **"Available after you graduate"** with a friendly explanation, no Stripe button. Continue to allow the student tier (free with `.ac.uk` verification, 1 GB).
- **122** When career stage transitions Y6 → FY1 (or any med-school → foundation jump), the user automatically gets **3 months of Pro on us** as a "welcome to foundation" gift. Stack with referral credit if any. One-time, not repeatable.
- **123** Add a "Are you a Royal Society of Medicine / BMJ member?" optional toggle on the upgrade page that displays the current price as £8/yr **with a manual code entry field** (we'll issue codes via Stripe coupons). Don't auto-verify; just expose a Stripe `allow_promotion_codes` field if not already enabled.
- **127** Replace the current referral system: 1 successful referral = 1 month of Pro, **max 6 months lifetime cap per referrer** (was 5/year). Drop the rolling-window count; use a lifetime cap.
- **47** Bulk operations on entries (multi-select tag, recategorise, soft-delete) become **Free for everyone**. Drop any Pro gating from this UI.
- **130** Loyalty badge: tiny 🎓 icon next to the user's name in settings if `auth.users.created_at` ≥ 365 days ago. No DB change; computed from the existing column.

**Schema**:
```sql
-- migration: stage2_tier_model_rework
-- 1. Replace MAX_REWARDED_REFERRALS_PER_YEAR with lifetime cap.
--    Existing referral grants are honoured; cap applies prospectively.
-- 2. Add column to track foundation-transition gift to ensure one-shot.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS foundation_gift_granted_at timestamptz;
```

**Code**:
- `lib/referrals/rewards.ts`: change `MAX_REWARDED_REFERRALS_PER_YEAR = 5` → `MAX_LIFETIME_REFERRAL_REWARDS = 6`. Drop the `oneYearAgo` window; just count `status='completed'` ever.
- `lib/subscription.ts`: add helper `canPurchasePro(careerStage)` returning `careerStage in ['FY1','FY2','POST_FY']`. Surface in returned `SubscriptionInfo` as `canPurchasePro: boolean`.
- `app/(dashboard)/upgrade/page.tsx`: render the "Available after you graduate" state when `!canPurchasePro`. Replace the Stripe button with a pre-registration form that just stores intent (new column `wants_pro_after_graduation` boolean on profiles) for a future "Hi, you graduated" email.
- `app/(dashboard)/settings/referrals/page.tsx`: update copy ("1 month per friend, up to 6 months").
- New helper `lib/billing/foundation-gift.ts` with `grantFoundationGiftIfEligible(supabase, userId)`. Call it from a profile-update trigger AND from the settings page when a user changes career stage from Y6 → FY1.
- Add a new profile-update trigger `grant_foundation_gift_on_stage_change()` (SECURITY DEFINER, search_path pinned) that updates `foundation_gift_granted_at` and adds 90 days to `pro_features_used.referral_pro_until`.

**Testing checklist for the user**:
- Sign up as new med-student account, see "available after you graduate" on upgrade page.
- Change career stage to FY1 in settings, see Pro auto-granted for 3 months and a confirmation toast.
- Existing FY user can buy Pro normally; medical student cannot.
- Refer 7 different test accounts — only 6 trigger reward credit.
- Bulk operations on portfolio entries work for free-tier accounts.

---

### Batch 2 — Engagement loop (digest, streak, prompts, anniversary)

**Features**:
- **2** Saturday 09:00 BST weekly digest email: count of entries this week, completeness mix (green/amber/red), specialty tags used, a "your streak" line.
- **4** Streak counter: weeks-active in a rolling 12-month view. A week is "active" if ≥1 entry was created in that ISO week (Mon–Sun, Europe/London). Show on dashboard.
- **6** "Today's blank — log one thing in 30 seconds" card on dashboard if no entry created today (in user's local TZ).
- **7** Training-anniversary message (e.g. "1 year on Clerkfolio") shown as a banner the first time the user visits dashboard on or after the anniversary; one-shot per anniversary.
- **9** End-of-month digest email at 09:00 on the 1st of the following month (e.g. May 1 covers April).

**Schema**:
```sql
-- migration: stage2_engagement_state
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_anniversary_seen_year int,
  ADD COLUMN IF NOT EXISTS streak_cache jsonb;
-- streak_cache shape: { active_weeks: int[], updated_at: timestamptz }
-- Cron updates this once per day so dashboard fetch is O(1).
```

**Code**:
- New cron `app/api/cron/weekly-digest/route.ts` running Saturday 09:00 (`vercel.json`: `0 9 * * 6`). Mirrors the existing `notifications` cron pattern. Send via Resend; respect `notification_preferences.weekly_digest` (default true). New email template `weeklyDigestEmail()` in `lib/notifications/email-templates.ts`.
- New cron `app/api/cron/monthly-digest/route.ts` running 1st of month 09:00 (`0 9 1 * *`). Same shape.
- New cron `app/api/cron/streak-cache/route.ts` running daily 02:00 (`0 2 * * *`). For each profile: compute the 52 most-recent ISO weeks Mon–Sun where any of `cases.created_at` or `portfolio_entries.created_at` (deleted_at IS NULL) had ≥1 row, store as `streak_cache.active_weeks` (array of `YYYY-Www` strings, ascending).
- `components/dashboard/streak-badge.tsx`: read `streak_cache` from server component layer, display longest current streak ("4 wk streak") + total active weeks year-to-date.
- `components/dashboard/empty-day-prompt.tsx`: render the "Today's blank" card if no entry today in `Europe/London`. Pre-fills nothing; just a CTA to `/cases/new` and `/portfolio/new`.
- `components/dashboard/anniversary-banner.tsx`: show banner if `floor((now - profile.created_at) / 365 days) > last_anniversary_seen_year`. On dismiss / first paint, increment `last_anniversary_seen_year`.
- Add new boolean keys to `notification_preferences`: `weekly_digest`, `monthly_digest`. Default `true` for both. Settings page `/settings/notifications` exposes toggles.
- `vercel.json`: add the three new cron entries.

**Testing checklist**:
- Trigger weekly-digest manually with `curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/weekly-digest` — confirm email lands.
- Add an entry, run streak-cache cron, see `streak_cache.active_weeks` populated.
- Set system date to anniversary, refresh dashboard, see banner.
- Delete today's entry then visit dashboard, see "today's blank" card.

---

### Batch 3 — Capture speed (Cmd-K, mobile, drafts, PWA)

**Features**:
- **11** Cmd-K / Ctrl-K command launcher. Shortcuts: `g d` dashboard, `g p` portfolio, `g c` cases, `g s` specialties, `n` new entry, `?` cheatsheet. Search across own entries by title.
- **12** Bottom-sheet quick-add on mobile (`md:` breakpoint and below) — same component as `QuickAddModal` but rendered as a sheet instead of a centred modal.
- **13** PWA manifest + service worker for offline read of last 50 entries (cases + portfolio combined). Use Workbox via `@serwist/next` or hand-rolled.
- **17** Drag-and-drop file upload anywhere on the entry page (not just the EvidenceUpload box).
- **18** Auto-save drafts on every entry type — currently only the cases create form does this. Extend to all portfolio category forms. Key: `clerkfolio-<category>-draft` in sessionStorage, 24 h expiry.
- **19** "Pick up where you left off" card on dashboard listing entries edited but not saved (i.e. drafts in sessionStorage on this device).
- **20** Quick-add FAB long-press on mobile shows category picker before opening the modal.

**Schema**: none.

**Code**:
- `components/ui/command-palette.tsx`: portal-based search overlay with `cmdk`-style interactions, no library if avoidable. Hook into existing `global-search.tsx`.
- `components/dashboard/empty-day-prompt.tsx` and FAB: shared `useMediaQuery('(max-width: 768px)')` for mobile detection.
- `app/(dashboard)/quick-add-sheet.tsx`: extract the modal body from `quick-add-modal.tsx`, render as a bottom sheet on mobile. Animate from `translate-y-full` → `translate-y-0` on open.
- `public/manifest.webmanifest`: add icons (already exist in `app/icon-*.tsx`), short_name `Clerkfolio`, start_url `/dashboard`, display `standalone`, background_color `#0B0B0C`, theme_color `#1B6FD9`.
- `app/layout.tsx`: link the manifest, register the service worker.
- `app/sw.ts` (or `public/sw.js`): cache `/dashboard`, `/cases`, `/portfolio` shells. Network-first for API; cache-first for static.
- Drag-and-drop wrapper on `[id]/edit` and `/new` pages: a `<DropZone>` covering the form area. Files go into the existing `pendingFiles` state.
- Extract the auto-save logic from cases `case-form.tsx` into a hook `useDraftPersistence(key, value, deps)` and apply across `entry-form.tsx`.
- New component `components/dashboard/resume-drafts-card.tsx` that scans sessionStorage on client mount for keys matching `clerkfolio-*-draft`, renders up to 3 cards.
- FAB long-press: 500 ms threshold; show inline category palette overlay.

**Testing checklist**:
- Press Cmd-K, type a case title, hit enter — navigates to that case.
- On phone (Chrome devtools mobile), swipe up the bottom sheet from the FAB.
- Install PWA from Chrome menu, fly mode on, dashboard still shows last 50 entries.
- Drag a PDF over the new-entry page anywhere — it lands in the file list.
- Start typing a teaching entry, navigate away, come back — draft restored.

---

### Batch 4 — Capture quality (guides, scaffolds, markdown, snippets)

**Features**:
- **21** Inline category guides: collapsible right-rail (or bottom on mobile) panel on every entry form with "what makes a strong [audit/teaching/...]". Static copy in `lib/category-guides.ts`.
- **22** Reflection scaffolds — Gibbs / Driscoll / Rolfe. Already partially modelled (`reflFramework` state in entry-form). Productionise: add picker, prefill the relevant fields with framework prompts, store the chosen framework on the entry (`refl_framework` column).
- **23** Inline word-count + reading-time on long fields (notes, audit_outcome, refl_free_text). Word-count exists for cases; extend to portfolio.
- **24** Suggested specialty tags as you type — the keyword-tag map already exists in `quick-add-modal.tsx`. Extract to `lib/heuristics/tag-suggester.ts` and use in `entry-form.tsx` and `case-form.tsx`. **No LLM**.
- **27** "Similar to a past entry" reuse suggestion: when the title matches an existing entry by ≥80% (Levenshtein on lowercased), show a "duplicate of?" hint with a "Reuse" button that pre-fills.
- **28** Outline view for long reflections — auto-detect `\n\n` separated paragraphs and the user's first sentences as section headers. Right-side TOC sticky on desktop only.
- **29** Markdown preview pane (read-only). Full-document markdown rendering on the detail page using `marked` or `markdown-it` (sanitised, no HTML). Edit page gets a split preview toggle.
- **30** Snippet library: user-defined reusable phrases (`snippets` table). Insert via `/` slash menu in any textarea.

**Schema**:
```sql
-- migration: stage2_capture_quality
ALTER TABLE portfolio_entries
  ADD COLUMN IF NOT EXISTS refl_framework text;

CREATE TABLE IF NOT EXISTS snippets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shortcut text not null,
  body text not null,
  created_at timestamptz default now(),
  unique (user_id, shortcut)
);
ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;
CREATE POLICY snippets_select ON snippets FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY snippets_insert ON snippets FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY snippets_update ON snippets FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY snippets_delete ON snippets FOR DELETE USING ((select auth.uid()) = user_id);
```

**Code**:
- `lib/category-guides.ts`: 9 entries (one per category) of ~300 words "tips" markdown.
- `components/portfolio/category-guide.tsx`: collapsible panel reading from above.
- Reflection scaffolds: keep existing `buildFrameworkText` helper; persist `refl_framework`. Pre-fill `refl_parts` JSON on framework selection.
- Word-count helper `lib/utils/word-count.ts` — already partially exists, consolidate.
- `lib/heuristics/tag-suggester.ts`: extract `KEYWORD_TAG_MAP` from `quick-add-modal.tsx` and export `suggestTagsForText(text, alreadyChosen)`. Use in both forms.
- `lib/heuristics/similar-titles.ts`: Levenshtein implementation; surface a non-blocking "looks similar" toast.
- Markdown rendering: `npm i marked dompurify` (or use existing if present). Wrap in a memoised component that strips `<script>`, `<iframe>`, `<style>`, `on*` handlers. Render in `app/(dashboard)/portfolio/[id]/page.tsx` and `cases/[id]/page.tsx` for `notes`, `refl_free_text`, `audit_outcome`, `prize_description`, `custom_free_text`.
- Snippets UI: `/settings/snippets/page.tsx` (CRUD). Slash-menu component `components/ui/slash-menu.tsx` listening for `/` keystroke in textareas, debounced suggestion list, Tab to insert.

**Testing checklist**:
- Open audit form, see right-rail "What makes a strong audit". Collapse it.
- Pick Gibbs framework on reflection, see prompts populate, save, reopen — framework remembered.
- Create snippet `/reflection-handover` with body "Key learning: ", type `/r` in any textarea, see suggestion, Tab to insert.
- Type "Cardio MI" as a case title, see Cardiology auto-suggested.
- Title "Audit of paracetamol prescribing" similar to existing "audit of paracetamol prescribing on ward 5" — reuse hint surfaces.
- Edit a reflection with markdown `**bold**`, see bold in detail view, raw on edit page.

---

### Batch 5 — New tracking modules (mandatory training, CPD, WBA, exams, etc.)

**Features**:
- **31** Mandatory training tracker with expiry alerts.
- **32** Course / CPD-hours log (separate from conferences).
- **34** WBA tracker (CBD/Mini-CEX/DOPS/ACAT) with rotation × WBA-type heatmap.
- **35** Teaching observations *received* (TWBA).
- **36** Mentor / supervisor meeting log (no signoff, just a personal diary).
- **37** OOP / OOPE / OOPC / taster week tracker.
- **38** Exam log (paper, score, attempt count, financial cost).
- **39** Goals with structured ICE/SMART form.
- **40** Audit cycle tracker (round 1 → 2 → close-the-loop).
- **41** Conference & poster archive (already partially in `conference` category — make it a first-class tab).
- **43** Rotation tracker: 4-month blocks, auto-suggest reflections at end.

**Approach**: rather than 11 new tables, **one table per concept that doesn't already fit**. Mandatory training, courses, exams, mentor meetings, OOP, rotations are all small per-user lists — use a single generic `personal_log` table with a discriminator column. The audit cycle tracker is just a new field on existing `portfolio_entries.audit_cycle_stage` (already exists).

**Schema**:
```sql
-- migration: stage2_tracking_modules
CREATE TABLE IF NOT EXISTS personal_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('mandatory_training','course','exam','mentor_meeting','oop','rotation','wba_received','teaching_observed')),
  title text not null,
  date date not null,
  expires_at date,            -- mandatory_training only
  cpd_hours numeric,          -- course only
  attempts int,               -- exam only
  score text,                 -- exam only
  cost_pence int,             -- exam, course
  meta jsonb default '{}',    -- per-kind extra fields (rotation block index, OOP type, observer name, etc.)
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
CREATE INDEX personal_log_user_kind_idx ON personal_log(user_id, kind, deleted_at);
ALTER TABLE personal_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY personal_log_sel ON personal_log FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY personal_log_ins ON personal_log FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY personal_log_upd ON personal_log FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY personal_log_del ON personal_log FOR DELETE USING ((select auth.uid()) = user_id);

-- WBA / Teaching-observation get separate kinds rather than category abuse on portfolio_entries.
-- Audit cycles already supported via portfolio_entries.audit_cycle_stage; expose richer UI only.
-- Goals are already a table; add SMART columns.
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS specific text,
  ADD COLUMN IF NOT EXISTS measurable text,
  ADD COLUMN IF NOT EXISTS achievable text,
  ADD COLUMN IF NOT EXISTS relevant text,
  ADD COLUMN IF NOT EXISTS time_bound text;
```

**Code**:
- One sidebar entry "Logs" at `app/(dashboard)/logs/page.tsx` with sub-tabs for each kind. Routing pattern `/logs/training`, `/logs/courses`, `/logs/exams`, `/logs/mentors`, `/logs/oop`, `/logs/rotations`, `/logs/wba`, `/logs/observations`. Each sub-tab is a thin wrapper around a shared `PersonalLogList` component bound to a specific `kind`.
- `components/logs/personal-log-form.tsx`: dynamic form rendering based on `kind` (e.g. expiry date for training, attempts/score for exams, CPD-hours for courses).
- WBA heatmap: `components/logs/wba-heatmap.tsx` showing rotation blocks (Y-axis) × WBA type (X-axis), cell = count. Inferred rotation blocks from the rotation kind entries.
- Mandatory-training expiry email: extend `app/api/cron/notifications/route.ts` to query `personal_log` where `kind='mandatory_training'` and `expires_at` between today and 30 days.
- Audit cycle tracker UI: in the audit category form, show a 3-step indicator (round 1 / round 2 / close-the-loop) instead of a select. Existing column.
- Conference archive: add a top-level filter chip on `/portfolio` for `category = 'conference'` and surface in sidebar as an optional "Conferences" view-toggle. No schema change.
- Rotation tracker: when a rotation entry is created with an end date in past, schedule a one-off prompt (cron daily 06:00) to email "Time to reflect on your X rotation". Use the existing notifications cron.
- SMART goals: extend `app/(dashboard)/timeline/page.tsx` goal-add form with the 5 fields.

**Testing checklist**:
- Add a mandatory training "BLS" with expiry in 30 days. See it on dashboard expiry alert tomorrow's cron run.
- Add 3 WBA mini-CEX entries across 2 rotations, view the heatmap.
- Create a SMART goal with all 5 fields.
- Audit entry editor shows a 3-step progress indicator.

---

### Batch 6 — Search & filtering

**Features**:
- **61** Saved searches (per user, named).
- **62** Boolean syntax: `audit AND specialty:imt since:2025-09 has:notes`.
- **63** Bulk tag rename across entries.
- **64** Smart filters in trash ("deleted last 7 days", "by category").
- **65** Pinned filters per page (sticky on revisit).
- **66** Search across evidence file names + (server-extractable) PDF text. Phase 1: file names only. Note in commit body: full-text PDF later.
- **67** "Entries missing X field" smart filter (uses `completeness_score` already computed).
- **68** Tag colour customisation for `custom_competency_themes`.
- **69** "Show only complete (green)" toggle.
- **70** Filter by completeness score range slider.

**Schema**:
```sql
-- migration: stage2_search_and_filters
CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  surface text not null check (surface in ('cases','portfolio','timeline','logs')),
  query jsonb not null,        -- { text?, tags?, themes?, since?, has_notes?, completeness?, category? }
  created_at timestamptz default now(),
  unique (user_id, name)
);
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_searches_sel ON saved_searches FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY saved_searches_ins ON saved_searches FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY saved_searches_upd ON saved_searches FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY saved_searches_del ON saved_searches FOR DELETE USING ((select auth.uid()) = user_id);

ALTER TABLE custom_competency_themes
  ADD COLUMN IF NOT EXISTS colour text DEFAULT '#1B6FD9';
```

**Code**:
- Boolean parser `lib/search/parser.ts` accepting `field:value`, `AND`, `OR`, `NOT`, quoted strings, `since:YYYY-MM-DD`. Output is the same `query` JSON shape used by `saved_searches`.
- Apply parsed query in `app/(dashboard)/portfolio/page.tsx`, `cases/page.tsx`, `timeline/page.tsx`, `logs/[kind]/page.tsx`.
- Pinned filters: persist last filter-state per route in `localStorage` key `clerkfolio-filters:<route>`. Restore on revisit.
- Saved-search bar: an icon next to the filter row; "Save current as…" prompts for name; lists saved searches as dropdown; one-tap apply.
- Bulk tag rename UI: from `/settings/themes` and `/settings/specialties`, rename a tag → executes an UPDATE across entries' `specialty_tags[]` / `interview_themes[]` arrays via Supabase RPC. Implement RPC `rename_user_tag(p_old text, p_new text, p_field text)` SECURITY DEFINER with `auth.uid()` self-check.
- Trash filters: extend `/trash/page.tsx` filter row with "deleted ≤ 7 days" and category select.
- Evidence file-name search: include `evidence_files.file_name` in the global search index.
- "Missing X field" filter: client-side using existing `missingCompletenessFields()` helper.
- Custom theme colour: picker on `/settings/themes`. Apply colour to badge classes.
- Complete-only toggle: filter `entry.completeness_score = 2` (green).
- Completeness slider 0–2 range filter.

**Testing checklist**:
- Type `audit AND specialty:imt since:2025-09` in portfolio search — only matching entries.
- Save that as "IMT audits", reload page, apply from dropdown.
- Rename custom theme "QI" → "Quality Improvement" — every entry tagged QI gets renamed.
- Pinned filter persists across refresh.

---

### Batch 7 — Dashboard & visualisations

**Features**:
- **71** Yearly heatmap prominence: confirm it's above the fold; add small legend.
- **72** Specialty radar with target overlay (per-domain target line vs actual score).
- **73** Entries-over-time line chart, grouped by category.
- **74** Time-since-last-entry-by-category card.
- **81** Calendar widget on dashboard with deadlines + entry density (today's tile filled if entry created today).
- **82** Career-stage timeline visualisation: med school → FY → ST3 horizontal bar with the user's current pin.
- **83** Per-rotation summary cards: aggregates over each rotation block from Batch 5.
- **84** Specialty comparison view — side-by-side scoring grid for users tracking >1 specialty.

**Schema**: none (consume existing tables).

**Code**:
- Replace placeholder/lightweight charts with `recharts` (`npm i recharts`) for the line chart and radar overlay. Keep Tailwind colours.
- `components/dashboard/specialty-radar.tsx`: existing component — add a faint dashed "target" line at 75% of `maxPoints` per domain.
- `components/dashboard/entries-over-time.tsx`: stacked area chart by category, last 12 months, monthly buckets.
- `components/dashboard/time-since-card.tsx`: list of 9 categories with "X weeks ago" badges; reuse `relativeDate` helper.
- `components/dashboard/calendar-widget.tsx`: month-view mini-calendar (5 rows), each tile coloured by entry count for that day; click a day → filter cases/portfolio.
- `components/dashboard/career-timeline.tsx`: horizontal stage bar Y1…ST3+. Pin at current `career_stage` based on profile.
- `components/logs/rotation-summary-cards.tsx`: per rotation entry from `personal_log[kind=rotation]` show entries logged during that block.
- `app/(dashboard)/specialties/compare/page.tsx`: side-by-side grid for users with ≥2 active specialty applications. Toggle from main `/specialties` page when count ≥ 2.

**Testing checklist**:
- Dashboard renders heatmap, radar, line chart, calendar widget, time-since cards, career timeline.
- Hover radar — target line is visible on each domain.
- Click a day on the calendar — see entries from that day filtered.
- With two specialties tracked, "Compare" tab visible.

---

### Batch 8 — Sharing, exports, multi-portfolio

**Features**:
- **46** Royal-college PDF cover sheets — Foundation portfolio, MRCP, ST application bundle. Templates wrap the existing PDF.
- **48** Granular share-link controls: per-link, hide notes / hide reflection text / redact tags. Watermark with viewer email if PIN-collected.
- **49** Multi-portfolio: tag entries as "interview-ready for IMT" (separate from specialty_tags). New `interview_ready_for[]` array on entries.
- **50** Custom theme PDFs: pick a theme, export only entries tagged with it.
- **52** CV generator — academic / clinical / ST application templates.
- **53** Year-in-review PDF every December (auto-generated, downloadable from settings in Dec/Jan).
- **58** iCal write-back: deadlines added in Clerkfolio appear on the user's iCal feed (already implemented as read-only feed; just verify and add a "Subscribe" button).

**Schema**:
```sql
-- migration: stage2_sharing_exports
ALTER TABLE share_links
  ADD COLUMN IF NOT EXISTS hide_notes boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_reflection boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS redact_tags boolean DEFAULT false;

ALTER TABLE portfolio_entries
  ADD COLUMN IF NOT EXISTS interview_ready_for text[] DEFAULT '{}';
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS interview_ready_for text[] DEFAULT '{}';
```

**Code**:
- New PDF templates `lib/pdf/foundation-portfolio.tsx`, `lib/pdf/mrcp.tsx`, `lib/pdf/st-application.tsx`. Each wraps the existing entry-render with a styled cover page + TOC.
- Export page `app/(dashboard)/export/page.tsx`: add a "Template" picker (Default / Foundation / MRCP / ST application).
- Share-link create form gains 3 toggles.
- `app/api/share/access/route.ts` filters fields based on link toggles before returning.
- Multi-portfolio: chip on every entry card "Mark interview-ready for IMT". Filter on `/portfolio` to "interview-ready for X".
- Custom theme PDF: theme picker on export page filters by `interview_themes` array.
- CV generator at `app/(dashboard)/export/cv/page.tsx`. Three templates as separate React components rendering to PDF via `@react-pdf/renderer`. Preview pane + download.
- Year-in-review: cron `app/api/cron/year-in-review/route.ts` running 2nd Jan. Generates PDFs for every active user, emails a one-shot link. Avoids storing per-user PDFs server-side; the cron just renders + emails attachment via Resend.

**Testing checklist**:
- Share with hide-notes on, view as anon — notes are blanked.
- Mark 5 entries as interview-ready for IMT, filter — see only those.
- Export "Foundation portfolio" PDF — cover sheet renders.
- Generate CV (clinical template), entries appear correctly grouped.

---

### Batch 9 — Onboarding & UX polish

**Features**:
- **86** 5-minute starter pack: on first dashboard visit, 1 demo case + 1 demo audit pre-populated, clearly labelled "demo, edit me", one-tap dismiss removes both.
- **87** "What's new" changelog modal on first login post-deploy. Read from `lib/changelog.ts` array; show entries newer than `profile.changelog_seen_at`.
- **88** Skeleton loaders on every server-fetched page.
- **90** Career-stage-aware first dashboard (Y2 vs FY1 vs ST applicant) — different welcome cards and suggested actions.
- **91** Soft-block tier modals on limit-hit (instead of hard block). Show "you've used your 1 free PDF — upgrade or delete one to free a slot".
- **92** Confetti on first entry per category. Subtle, 800 ms.
- **93** Empty-state CTAs everywhere ("no cases yet → log your first").
- **94** Drag-to-reorder pinned entries.
- **95** Keyboard cheatsheet on `?` press.
- **96** Timezone-aware date display (UK default; setting in profile).
- **97** Clipboard-paste image directly into evidence (Cmd-V on form).
- **98** Undo toasts on every destructive action (delete, soft-delete, bulk tag-remove).
- **99** Settings search bar (filter sub-pages by keyword).
- **100** First-week guided tour, 4 steps, skippable. Stored progress on profile.

**Schema**:
```sql
-- migration: stage2_onboarding_polish
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS changelog_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS guided_tour_step int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demo_dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/London',
  ADD COLUMN IF NOT EXISTS pinned_order jsonb DEFAULT '[]';
```

**Code**:
- `lib/changelog.ts`: array of `{ date, title, body, video?: string }`. New entries show modal once per user. Dismiss → set `changelog_seen_at = now()`.
- Demo seed: `lib/onboarding/demo-seed.ts` — 1 case with `is_demo=true` flag and 1 portfolio entry with `is_demo=true` (add boolean column). Auto-create on first dashboard visit if `entries.count = 0`. One-tap "remove demos" deletes both.
- Skeleton loaders: standard pattern, 80–120 ms render delay; component `components/ui/skeleton-card.tsx` already exists, wire to all `loading.tsx` route segments.
- Career-stage dashboard: existing layout already handles ARCP visibility; add 4 distinct hero cards keyed on stage (Y1–Y3 / Y4–Y6 / FY1–FY2 / POST_FY).
- Soft-block: replace 403 returns from /api/share/route.ts and /api/export/route.ts with structured error JSON `{ error: 'limit_reached', limit, used, upgrade_url }`. Surface as a styled modal client-side instead of generic toast.
- Confetti: `npm i canvas-confetti`. First-per-category triggered when `is_first_in_category` flag is true on insert. Track in profile JSONB `first_per_category`.
- Empty states: every list (cases, portfolio, timeline, logs, specialties, share-links, templates) gets a friendly empty card with primary CTA.
- Drag-to-reorder pinned: `react-dnd-kit/sortable` (or HTML5 native). Store order in `profile.pinned_order` per surface.
- `?` cheatsheet: list of shortcuts in modal; new component `components/ui/cheatsheet.tsx`.
- Timezone: setting on `/settings`; default `Europe/London`. Update `lib/utils/dates.ts` to accept timezone.
- Clipboard image: `paste` event listener on form root; if a file is in clipboard, push to `pendingFiles`.
- Undo toast: extend `toast-provider.tsx` with `undoable` variant supporting an action callback. On delete, soft-delete first; show undo for 5 s; on undo, clear `deleted_at`.
- Settings search bar: filter the settings sub-page list by keyword (client-side).
- Guided tour: 4-step overlay using a tooltip library or hand-rolled. Steps: dashboard → log first case → set up specialty → invite a friend.

**Testing checklist**:
- New user signs up, sees 1 demo case + 1 demo audit, dismisses, both gone.
- Add a `lib/changelog.ts` entry dated tomorrow, refresh → modal pops.
- Press `?`, cheatsheet shows.
- Delete an entry, undo within 5 s — entry is back.
- Drag-reorder pinned cases, refresh, order preserved.

---

### Batch 10 — Notifications & integrations

**Features**:
- **104** Apple/Google Calendar one-click subscribe button on `/timeline` (alongside existing iCal token feature).
- **107** Read-only public API key (scoped to user). Generate in `/settings/api`. Keys hashed; show once. Used to call `/api/v1/me/*` read-only endpoints.
- **108** iCal write-back of personal goals (already feed includes deadlines; extend to goals).
- **109** Webhook on share-link viewed: per-link optional URL; POST view payload to it on each unique visit.

**Schema**:
```sql
-- migration: stage2_integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  prefix text not null,             -- first 8 chars shown in UI
  hash text not null,               -- sha256(full_key)
  scopes text[] default '{read}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, name)
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_sel ON api_keys FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY api_keys_ins ON api_keys FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY api_keys_upd ON api_keys FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY api_keys_del ON api_keys FOR DELETE USING ((select auth.uid()) = user_id);

ALTER TABLE share_links
  ADD COLUMN IF NOT EXISTS view_webhook_url text;
```

**Code**:
- API surface `app/api/v1/me/{cases,portfolio,specialties,deadlines,goals}/route.ts`. Auth via `Authorization: Bearer <key>` header. Look up key by sha256, set RLS by impersonating user via service-role lookup (or query directly with user_id from key row). Read-only — block all non-GET methods.
- `app/(dashboard)/settings/api/page.tsx`: list keys (prefix only), generate, revoke. Show full key once on creation; never again.
- iCal subscribe button: a generated `webcal://` URL on `/timeline` next to existing iCal token. Some apps recognise the protocol better.
- Goals in iCal: extend `app/api/calendar/feed/[token]/route.ts` to include `goals` rows alongside deadlines.
- Webhook: when `share_views` row inserted, if `share_link.view_webhook_url` is set, fire a fetch (best-effort, no retry) to the URL with `{ token, scope, viewed_at, ip_hash }`. Implement as part of `/api/share/access` after the existing `share_views` insert.

**Testing checklist**:
- Generate an API key, hit `/api/v1/me/cases` with the bearer header — JSON response of own cases.
- Click "Subscribe in Apple Calendar" on /timeline — calendar app opens with feed.
- Set webhook URL on a share link; visit the share URL anon — webhook receives a payload.
- Add a goal — appears on iCal feed.

---

### Batch 11 — Export, import, portability

**Features**:
- **111** CSV import beyond Horus (generic). Pre-mapped columns for MicroGuide, NHS Learn.
- **112** Plain-Markdown export of all reflections in a single `.md` file.
- **114** JSON-schema-validated re-import of own backup.
- **115** PDF append-only mode: add new entries to an existing PDF.
- **116** CSV column mapping wizard for non-Horus imports. **Flag: complex — implement minimally; ship column header → field dropdown only.**
- **117** Selective export field picker.
- **118** Bulk evidence-file download as zip per entry.
- **119** Public read-only "showcase" link with custom subdomain `<slug>.clerkfolio.site`.
- **120** Export to LinkedIn-ready text snippets.

**Schema**:
```sql
-- migration: stage2_exports_imports
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS public_showcase_enabled boolean DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_public_slug_uq ON profiles(public_slug) WHERE public_slug IS NOT NULL;
```

**Code**:
- Generic CSV import at `/import/csv`. Three pre-defined column maps (Horus, MicroGuide, NHS Learn) + custom. The wizard step 1 = upload, step 2 = match columns to fields via dropdowns, step 3 = preview, step 4 = commit.
- Markdown export at `/api/export/markdown` — concatenates every `refl_free_text`, `notes` from reflections sorted by date, prefixed with `# YYYY-MM-DD <title>`.
- JSON re-import at `/import/json`: validates against the same schema as `/api/account/export`. Ignores `id`, `created_at`, regenerates UUIDs. Skip already-existing rows by hash of (title, date, category).
- PDF append-only: server-side, given an existing uploaded PDF + a list of entry IDs, produce a new PDF with the entries appended. Use `pdf-lib`.
- Selective export: checkbox list of fields on `/export`; pass `fields[]` array to `/api/export`.
- Bulk evidence zip: `/api/export/evidence?entry_id=` returns a zip of all evidence files for that entry. Use `jszip` (already a dep).
- Public showcase: `app/showcase/[slug]/page.tsx` reading `profiles.public_slug` and `public_showcase_enabled`. Renders a read-only portfolio with no PIN, no expiry. Soft delete still respected.
- LinkedIn snippets: 1-paragraph blurbs derived from each portfolio entry. Format: `Achievement: <title>. <category-tailored sentence>. <date>.` Render as a copy-each list at `/export/linkedin`.

**Testing checklist**:
- Import a generic CSV (custom column map), entries arrive correctly.
- Export markdown, every reflection present in chronological order.
- Re-import own JSON backup, no duplicates.
- Enable showcase slug `dr-test`, visit `/showcase/dr-test` anon, see read-only portfolio.
- LinkedIn page lists 1 snippet per entry, copy-button works.

---

### Batch 12 — Trust, safety, accessibility

**Features**:
- **131** Force min 4.5:1 contrast — raise muted-text token from `0.35` to `0.55` (or per-context). Audit Tailwind classes that use `rgba(245,245,242,0.35)` and bump.
- **132** Skip-to-main-content link as first focusable element on every page.
- **133** Reduced-motion respect — wrap all `animate-*` Tailwind classes and transitions with `motion-safe:` prefix; add `motion-reduce:` opt-out on the activity heatmap and confetti.
- **134** High-contrast theme variant — body class `theme-high-contrast`, override CSS vars.
- **135** Dyslexic-friendly font option — body class `font-dyslexic`, load `OpenDyslexic` from a CDN-allowed `font-src` (update CSP).
- **136** Audit-log surfaced to user with filtering UI at `/settings/audit-log`.
- **137** PIN re-entry for trash-empty / account-delete (any PIN — even just typing email — for confirmation).
- **138** Granular privacy export — checkbox to exclude evidence files in JSON backup.
- **139** Entry-history diff view (compare two revisions side by side).
- **140** Soft-delete restore one-tap from trash (already exists; verify + add toast).
- **141** Encrypted-at-rest hint surfaced on `/privacy` and `/settings`.
- **142** Per-session fingerprint shown on settings (revoke if unfamiliar).

**Schema**:
```sql
-- migration: stage2_trust_safety
-- session_fingerprints: track active sessions per user for revocation UI
CREATE TABLE IF NOT EXISTS session_fingerprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_hash text not null,
  user_agent text,
  last_seen_at timestamptz default now(),
  revoked_at timestamptz,
  created_at timestamptz default now()
);
CREATE INDEX session_fingerprints_user_idx ON session_fingerprints(user_id, revoked_at);
ALTER TABLE session_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY sess_fp_sel ON session_fingerprints FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY sess_fp_upd ON session_fingerprints FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
-- Inserts via service role (middleware) only.
```

**Code**:
- Tailwind config: re-define muted colour tokens. Audit `grep -rE 'rgba\(245,245,242,0\.(2|3)\d?\)' app components` and replace with the new tokens.
- Skip-link: first child of `<body>` in `app/layout.tsx`. Hidden until focused.
- Reduced motion: replace `animate-pulse` etc. with `motion-safe:animate-pulse` everywhere we use motion. Activity heatmap colour-fade animation: gate behind `motion-safe:`.
- High-contrast theme: `app/globals.css` adds `body.theme-high-contrast` overrides. Toggle on `/settings`. Persist in profile `display_prefs.high_contrast`.
- Dyslexic font: same pattern. Load OpenDyslexic via Google Fonts (or self-host). Update CSP `font-src` in middleware to allow.
- Audit-log UI: `app/(dashboard)/settings/audit-log/page.tsx` reads `audit_log` table (RLS already restricts). Filter by `action` and date range. Pagination 50 per page.
- PIN re-entry: trash-empty button now shows a confirm modal requiring the user to retype the word `EMPTY`. Account delete already requires `DELETE`; verify.
- Granular export: checkbox on `/api/account/export` request body. Skip evidence-file bytes if unchecked.
- Diff view: `/portfolio/[id]/history/diff?a=<rev>&b=<rev>` showing field-level diff. Use a lightweight diff library (`diff` npm).
- Encrypted-at-rest hint: a small "🔒 Data encrypted at rest by Supabase, eu-west-2" footer on `/privacy` and `/settings`.
- Session fingerprints: middleware records `ip_hash` (sha256 over IP + SHARE_IP_HASH_SALT) + `user_agent` on each authenticated request, upserts a row per user-agent string. `/settings/sessions` lists active sessions and exposes a revoke button (sets `revoked_at`; middleware refuses revoked rows).

**Testing checklist**:
- Tab from page top — skip-link visible.
- Toggle high-contrast on settings — colours change.
- Compare two revisions of an entry — diff visible.
- Revoke a session, refresh in that browser — get logged out.
- Empty trash — must type `EMPTY` to confirm.

---

### Batch 13 — Mobile-specific polish

**Features**:
- **143** Pull-to-refresh on dashboard / lists.
- **144** iOS-style bottom-sheet modals (use the same pattern from Batch 3).
- **145** Bigger tap targets on bottom nav (min 44 × 44 pt).
- **146** Offline-first read of latest 50 entries (covered in Batch 3 PWA work — verify).
- **147** iOS share-sheet capture (covered in Batch 3 — verify share target works on iOS).
- **148** Inline image lightbox without leaving the entry.
- **149** Swipe-to-delete in lists (cases, portfolio, trash, logs).
- **150** Haptic feedback on save (mobile).

**Schema**: none.

**Code**:
- `components/ui/pull-to-refresh.tsx`: wraps any list. Threshold 60 px. Calls `router.refresh()`.
- Bottom nav (`components/sidebar.tsx`'s mobile counterpart): bump tap targets to `min-h-[44px] min-w-[44px]`.
- Image lightbox: `components/ui/image-lightbox.tsx` opening on click of any `<img>` inside an entry detail page. Esc to close, arrow keys to navigate between images.
- Swipe-to-delete: gesture wrapper on list items. Threshold 80 px. Confirm sheet on release.
- Haptic feedback: `navigator.vibrate(30)` on save toast (gracefully no-op on unsupported browsers).

**Testing checklist**:
- On phone, pull dashboard down — refresh spinner.
- Tap an evidence image — lightbox opens, swipe between.
- Swipe-left on a case in the list — delete prompt slides in.
- Save an entry on mobile — single subtle haptic.

---

## 4. Final report (after all batches land)

Generate a single comment-ready summary at the end. Format:

```markdown
# Stage 2 — Build complete

## Features added (by batch)
- Batch 1: <one line per feature with #>
- Batch 2: …

## Schema migrations applied
- 2026_05_06_<name>.sql (applied via MCP)
- …

## Files of note (where to start)
- `lib/category-guides.ts`
- …

## Manual testing checklist for the user
For each feature, give 1–2 explicit steps the user can run in the browser. Group by surface (Dashboard, Cases, Portfolio, Settings, Mobile, Email).

## Known gaps / follow-ups
- 116 CSV column mapping wizard shipped basic header-match only; column-derivation heuristics deferred.
- …

## Build state
- `npx tsc --noEmit`: clean
- Vercel deploy: <link>
- Supabase advisors after batches: <list any new WARNs>
```

## 5. House rules

- **Don't merge unrelated changes.** Each batch = one commit.
- **Don't bypass `validateOrigin`.** All new state-changing API routes get it.
- **Don't bypass `validateCronSecret`.** All new cron routes get it.
- **Don't write `select * from` in production server code.** Be explicit about columns.
- **Don't add LLM calls** — none of these features need it. Use heuristics or static data.
- **Don't break the `(select auth.uid())` pattern** that Stage 1 standardised.
- **No patient identifiers anywhere.** Watch out especially in batches with new free-text fields.
- **Respect the soft-delete contract** — every list query that doesn't show trash adds `.is('deleted_at', null)`.
- **Push after every batch.** Live branch. Vercel auto-deploys.

## 6. Stuck?

If a batch can't be cleanly completed:
- Land the parts that work behind a feature flag (`NEXT_PUBLIC_FEATURE_<NAME>=false`).
- Document the open questions in the final report.
- Do not block subsequent batches on it.

End of brief.
