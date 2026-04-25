# Clinidex — Project Context for Claude

## What This App Is
Clinidex is a UK medical portfolio tracker for doctors building specialty training applications (e.g. IMT, GP, ACCS). It helps users:
- Log and organise **clinical cases** they've seen
- Build a **portfolio** of achievements (audits, teaching, publications, prizes, procedures, etc.)
- Track **specialty application scores** against official person specs (essentials/desirables)
- Set and monitor **deadlines** (application windows, exam dates)
- **Export** a clean PDF portfolio filtered by application programme

## Tech Stack
- **Next.js 14 App Router** — server components by default, `'use client'` only where needed
- **TypeScript** throughout
- **Tailwind CSS** — dark theme, primary colour `#1B6FD9` (blue), background `#0B0B0C` / `#141416`
- **Supabase** — Postgres + auth + RLS + storage (evidence files)
- **react-pdf** — PDF generation in API route (`app/api/export/route.ts`)

## Key Domain Concepts

### Specialty keys vs display names
- `specialty_applications` table: stores `specialty_key` (slug, e.g. `imt_2026`, `gp_st1_2026`)
- `specialty_tags` on cases/portfolio_entries: array of specialty_key slugs
- `clinical_domain` on cases: plain English display string (e.g. `"Emergency Medicine"`)
- **Always format** keys before displaying: `getSpecialtyConfig(key)?.name ?? key`
- Source of truth: `lib/specialties/index.ts` → `SPECIALTY_CONFIGS` array, each with `key` and `name`
- `PREDEFINED_SPECIALTIES` in `lib/constants/specialties.ts` = free-text specialty display names (separate concept — for non-programme tagging, now mostly unused)

### Application tags vs clinical area
- **Application tags** (`specialty_tags`) = which tracked programmes an entry supports (e.g. `["imt_2026"]`)
- **Clinical area** (`clinical_domain`) = the medical setting of a case encounter (e.g. "Cardiology")
- These are distinct — don't conflate them

### Specialty scoring
- Each `SpecialtyConfig` has `domains[]`, each domain has `maxPoints`, `scoringRule`, `band` (essential/desirable), optional `isEvidenceOnly`, `isCheckbox`, `isSelfAssessed`
- Evidence-only desirable domains can be ticked with `is_checkbox: true`, `band_label: 'Evidenced'`
- Links stored in `specialty_entry_links` table via `SpecialtyEntryLink` type

## Database Tables (key ones)
| Table | Purpose |
|---|---|
| `profiles` | User info: `first_name`, `last_name`, `career_stage`, `onboarding_complete` |
| `cases` | Clinical cases: `title`, `date`, `clinical_domain`, `specialty_tags[]`, `notes`, `pinned`, `deleted_at` |
| `portfolio_entries` | Portfolio items: `category`, `title`, `date`, `specialty_tags[]`, `pinned`, `deleted_at` + many category-specific fields |
| `specialty_applications` | Tracked programmes: `user_id`, `specialty_key`, `cycle_year`, `bonus_claimed` |
| `specialty_entry_links` | Evidence links: `application_id`, `domain_key`, `band_label`, `points_claimed`, `is_checkbox` |
| `deadlines` | `title`, `due_date`, `completed` |
| `goals` | `category`, `target_count`, `due_date` |
| `evidence_files` | Uploaded files linked to entries/cases |

## RLS Policy (important)
SELECT policies check **only** `auth.uid() = user_id` — no `deleted_at IS NULL` filter. Soft-delete filtering is done in application code (`.is('deleted_at', null)`). The trash page explicitly queries deleted rows.

## Sorting Conventions
- **Cases default**: `order('pinned', false)` → `order('created_at', false)` (by time added, not date)
- **Portfolio default**: `order('pinned', false)` → `order('date', false)` → `order('created_at', false)`
- Pagination: 20 items per page, `page` URL param, `select('*', { count: 'exact' })` + `.range()`

## Portfolio Categories
`audit_qip`, `teaching`, `conference`, `publication`, `leadership`, `prize`, `procedure`, `reflection`, `custom`
Defined in `lib/types/portfolio.ts` → `CATEGORIES` (with `value`, `label`, `short`) and `CATEGORY_COLOURS`

## Key Files to Know
```
app/(dashboard)/layout.tsx          — fetches tracked specialties for userInterests prop
app/(dashboard)/dashboard/page.tsx  — main dashboard, all stat queries
app/(dashboard)/cases/page.tsx      — cases list with pagination + filters
app/(dashboard)/portfolio/page.tsx  — portfolio list with pagination + category tabs
app/(dashboard)/deadlines/page.tsx  — dedicated deadlines page
app/(dashboard)/export/page.tsx     — PDF/CSV/JSON export (client component)
app/(dashboard)/specialties/page.tsx — specialty tracker shell
app/api/export/route.ts             — PDF generation API route

components/sidebar.tsx              — NAV_ITEMS array; add new pages here
components/cases/case-form.tsx      — case create/edit form, draft auto-save to sessionStorage
components/cases/clinical-area-select.tsx — styled dropdown for clinical_domain
components/portfolio/specialty-tag-select.tsx — multi-select for specialty_tags; trackedOnly prop
components/portfolio/entry-card.tsx — card shown on portfolio list
components/portfolio/entry-form.tsx — portfolio create/edit form
components/dashboard/activity-feed.tsx — Portfolio/Cases/Specialty tabs widget
components/dashboard/specialty-radar.tsx — horizontal bar chart of clinical area counts
components/dashboard/coverage-widget.tsx — portfolio category coverage bars
components/dashboard/deadlines-widget.tsx — compact deadlines widget (used on dashboard)
components/deadlines/deadlines-page-client.tsx — full deadlines page UI
components/specialties/domain-tab.tsx — per-domain scoring UI (essentials/desirables + evidence checkbox)
lib/specialties/index.ts            — SPECIALTY_CONFIGS, getSpecialtyConfig()
lib/specialties/types.ts            — SpecialtyConfig, SpecialtyDomain, SpecialtyApplication types
lib/types/portfolio.ts              — PortfolioEntry type, CATEGORIES, CATEGORY_COLOURS
lib/types/cases.ts                  — Case type, CLINICAL_DOMAINS (list of clinical area strings)
lib/pdf/portfolio-pdf.tsx           — react-pdf document template
```

## Component Patterns

### Fetching tracked specialties (server pages)
```tsx
const { data: trackedSpecialties } = await supabase
  .from('specialty_applications').select('specialty_key').eq('user_id', user!.id)
const specialtyKeys = trackedSpecialties?.map(s => s.specialty_key) ?? []
// Pass as userInterests={specialtyKeys} to forms
```

### Formatting a specialty key
```tsx
import { getSpecialtyConfig } from '@/lib/specialties'
getSpecialtyConfig('imt_2026')?.name  // → "IMT"
// Fallback: key (already a display name for clinical domains / PREDEFINED_SPECIALTIES)
```

### SpecialtyTagSelect (application tags)
```tsx
<SpecialtyTagSelect
  value={specialtyTags}
  onChange={setSpecialtyTags}
  userInterests={specialtyKeys}
  trackedOnly  // shows only user's tracked programmes; formats keys to labels
/>
```

### Draft auto-save (cases create form)
Key: `clinidex-case-draft` in `sessionStorage`. Expires 24h. Saves `title`, `date`, `clinicalDomain`, `specialtyTags`. Notes intentionally excluded (clinical free text).

## Dashboard Data Flow
```
dashboard/page.tsx
  ├── specialty_applications → trackedSpecialties → ActivityFeed (Specialty tab)
  ├── cases (specialty_tags + clinical_domain) → specialtyCounts → ActivityFeed
  │                                            → clinicalAreaCounts → SpecialtyRadar
  ├── portfolio_entries (category) → coverageCounts → CoverageWidget
  └── trackedSpecialtyKeys → QuickAddButton → QuickAddModal
```

## Sidebar Nav Order
Dashboard → Portfolio → Cases → Specialties → Export → Insights → Goals → Deadlines
(Import, Trash, Settings in bottom section)

## Design System
- Background layers: `#0B0B0C` (deepest) → `#0E0E10` (sidebar) → `#141416` (cards)
- Primary blue: `#1B6FD9` / hover `#155BB0`
- Text: `#F5F5F2` (primary) → `rgba(245,245,242,0.55)` (secondary) → `rgba(245,245,242,0.35)` (muted)
- Borders: `border-white/[0.08]` standard, `border-white/[0.06]` subtle dividers
- Rounded: `rounded-xl` buttons, `rounded-2xl` cards
- All inputs: `bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors`

## Known Decisions & Gotchas
- Specialty radar was changed from SVG spider chart → horizontal bar chart (text cutoff with long clinical area names)
- Portfolio coverage widget dots removed (cluttered)
- Duplicate entries: `created_at` tiebreaker ensures copy appears above original
- After logging a case, redirect goes to `/cases` list (not the individual case)
- `trackedOnly` on SpecialtyTagSelect restricts to user's tracked programmes only
- Cases sort defaults to `created_at` not `date` (so newest-added is always first)
- `specialty_interests` on `profiles` is stale onboarding data — do NOT use for application tag logic; use `specialty_applications` instead
