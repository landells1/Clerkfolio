# Clerkfolio — Codex Task List

**Status: superseded by `HANDOVER.md` (2026-05-05 audit).**

The bulk of the original Priority 1 / Priority 2 / Priority 3 tasks below have been
implemented in the 2026-05-05 commit. Newly identified issues (and the still-open
items from this list) are tracked in `HANDOVER.md` §7 alongside the prioritised
Stage 2 feature backlog. Read that file first.

This file is kept for historical reference. The Pending vs Done breakdown is in
`SESSION_START.md` "Known open issues" — keep that section as the running ledger.

---

## Original audit context (2026-04-29)
**Audited by:** Claude Code (full codebase + live Supabase schema review)

Work through these in priority order. Each task is self-contained with exact file paths and line numbers. After completing a task, commit and push before moving to the next.

---

## PRIORITY 1 — Security / Correctness bugs

---

### TASK 1 — Fix auto-revoke email: wrap in try-catch
**File:** `app/api/share/access/route.ts` lines 119–136

**Problem:** If `resend.emails.send()` throws (Resend outage, invalid key), the error propagates uncaught. The link has already been revoked at this point but the caller receives a 500 instead of the intended 429. The user sees a confusing error and may retry.

**Fix:** Wrap the entire email-send block (lines 119–136) in a `try { } catch (err) { console.error('auto-revoke email failed:', err) }`. The outer `return NextResponse.json({ error: '...' }, { status: 429 })` must still execute regardless.

```ts
// Wrap this block:
if (resendKey) {
  try {
    const { data: userData } = await supabase.auth.admin.getUserById(link.user_id)
    if (userData?.user?.email) {
      const resend = new Resend(resendKey)
      await resend.emails.send({ ... })
    }
  } catch (err) {
    console.error('auto-revoke email failed:', err)
  }
}
return NextResponse.json({ error: 'This share link has been paused after unusual traffic.' }, { status: 429 })
```

---

### TASK 2 — Fix auto-revoke view-count: use rolling 1-hour window, not wall-clock hour
**File:** `app/api/share/access/route.ts` lines 24–27 and 105–110

**Problem:** `startOfHour()` resets at the top of each clock hour (e.g., 14:00:00). An attacker can get 99 views at 13:59 and 99 more at 14:01 — 198 views in 2 minutes without triggering the 100-view auto-revoke.

**Fix:** Replace the `startOfHour()` function and its usage with a rolling 1-hour window:

Remove `startOfHour()` entirely. In the view count query (line 109), replace:
```ts
.gte('viewed_at', startOfHour())
```
with:
```ts
.gte('viewed_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
```

---

### TASK 3 — Block PATCH from un-revoking auto-revoked share links
**File:** `app/api/share/route.ts` lines 145–171

**Problem:** The PATCH handler sets `revoked_at: null, revoked: false` unconditionally. A link that was auto-revoked due to 100+ views/hour can be re-activated by the owner extending it.

**Fix:** Before updating, fetch the current link state. If the link is already revoked, return a clear error instead of silently un-revoking it.

```ts
// After the auth check, before the update:
const { data: existing } = await supabase
  .from('share_links')
  .select('revoked, revoked_at')
  .eq('id', id)
  .eq('user_id', user.id)
  .maybeSingle()

if (!existing) return NextResponse.json({ error: 'Share link not found.' }, { status: 404 })
if (existing.revoked) {
  return NextResponse.json(
    { error: 'This link was revoked and cannot be extended. Create a new share link.' },
    { status: 409 }
  )
}
```

Then in the update object, remove `revoked_at: null, revoked: false` — only update `expires_at`.

---

### TASK 4 — Fix `pro_features_used` counter: make increments atomic
**Files:** `app/api/share/route.ts` lines 124–132 · `app/api/export/route.ts` lines 143–150

**Problem:** Both routes read `subInfo.usage.*Used`, add 1, then write back the whole JSONB object. Under concurrent requests (user double-clicks), both reads see `0`, both write `1`, and the counter is wrong.

**Fix:** Create a Supabase migration adding an RPC function that increments atomically:

```sql
-- Migration: add increment_pro_feature_usage RPC
CREATE OR REPLACE FUNCTION increment_pro_feature_usage(
  p_user_id uuid,
  p_feature text  -- 'pdf_exports_used' or 'share_links_used'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles
  SET pro_features_used = jsonb_set(
    pro_features_used,
    ARRAY[p_feature],
    to_jsonb(COALESCE((pro_features_used ->> p_feature)::int, 0) + 1)
  )
  WHERE id = p_user_id;
$$;
```

In `app/api/share/route.ts` replace the manual JSONB update (lines 124–132) with:
```ts
if (!subInfo.isPro) {
  await supabase.rpc('increment_pro_feature_usage', {
    p_user_id: user.id,
    p_feature: 'share_links_used',
  })
}
```

In `app/api/export/route.ts` replace the manual JSONB update (lines 143–150) with:
```ts
if (!subInfo.isPro) {
  supabase.rpc('increment_pro_feature_usage', {
    p_user_id: user.id,
    p_feature: 'pdf_exports_used',
  }).then(() => {})
}
```

---

### TASK 5 — Validate referral code format in auth callback
**File:** `app/auth/callback/route.ts` lines 36–51

**Problem:** `referralCode` comes from `user_metadata` (user-controlled) and is passed directly to `.eq('referral_code', referralCode.trim())`. Any string triggers a DB lookup.

**Fix:** Add format validation before the DB lookup. Referral codes are always 5 uppercase letters:

```ts
const referralCode = user?.user_metadata?.referral_code
if (user && typeof referralCode === 'string' && /^[A-Z]{5}$/.test(referralCode.trim().toUpperCase())) {
  const normalizedCode = referralCode.trim().toUpperCase()
  const service = createServiceClient()
  // ... rest of referral logic using normalizedCode
}
```

---

### TASK 6 — Add row limits to Horus import and export routes
**Files:** `app/api/import/horus/route.ts` line 81 · `app/api/export/route.ts` line 42

**Problem:** No cap on array sizes. A Pro user could submit 100,000 import rows or 100,000 entry IDs to the export route, causing huge single queries and potential timeouts.

**Fixes:**

In `app/api/import/horus/route.ts`, after line 81 (`if (!Array.isArray(rows))`):
```ts
if (rows.length > 500) {
  return NextResponse.json({ error: 'Maximum 500 rows per import. Split your file and import in batches.' }, { status: 400 })
}
```

In `app/api/export/route.ts`, after line 42 (the body destructure):
```ts
if ((entryIds?.length ?? 0) > 500 || (caseIds?.length ?? 0) > 500) {
  return NextResponse.json({ error: 'Maximum 500 items per export. Use filters to narrow your selection.' }, { status: 400 })
}
```

---

### TASK 7 — Fix open-fail defaults in `fetchSubscriptionInfo`
**File:** `lib/subscription.ts` lines 45–67

**Problem:** If `get_profile_entitlements` RPC fails (DB outage, network error), `data` is null and `mapEntitlements(null)` defaults `canExportPdf: true`, `canCreateShareLink: true`, `canUploadFiles: true`. A DB outage grants all users unlimited access.

**Fix:** Catch the error and default to the most restrictive safe state:

```ts
export async function fetchSubscriptionInfo(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionInfo> {
  const { data, error } = await supabase
    .rpc('get_profile_entitlements', { p_user_id: userId })
    .single()

  if (error) {
    console.error('fetchSubscriptionInfo RPC failed:', error.message)
    // Fail closed — deny gated features rather than grant them
    return {
      tier: 'free',
      isPro: false,
      isStudent: false,
      storageQuotaMB: 100,
      usage: { pdfExportsUsed: 0, shareLinksUsed: 0, specialtiesTracked: 0, storageUsedMB: 0, referralProUntil: null, studentGraduationDate: null },
      limits: { canExportPdf: false, canCreateShareLink: false, canTrackAnotherSpecialty: false, canBulkImport: false, canUploadFiles: false },
    }
  }

  return mapEntitlements(data as EntitlementRow | null)
}
```

---

## PRIORITY 2 — Database fixes (run as migrations)

---

### TASK 8 — Add CHECK constraint to enforce portfolio-only entry_type on specialty_entry_links
**Table:** `specialty_entry_links`

**Problem:** V2 removed cases from specialty evidence linking (portfolio entries only). The app code enforces this but the RLS policies still have `entry_type = 'case'` branches, and there is no DB-level constraint preventing case links being inserted by the service role.

**Fix:** Create a migration:

```sql
-- Migration: enforce_portfolio_only_specialty_links
ALTER TABLE specialty_entry_links
  ADD CONSTRAINT specialty_entry_links_entry_type_check
  CHECK (entry_type = 'portfolio');
```

Then update the three RLS policies (INS, SEL, UPD on `specialty_entry_links`) to remove the dead `entry_type = 'case'` branches. The simplified WITH CHECK for INSERT should be:
```sql
(application_id IN (
  SELECT id FROM specialty_applications WHERE user_id = auth.uid()
))
AND (
  (is_checkbox = true)
  OR (entry_id IS NULL)
  OR (entry_id IN (
    SELECT id FROM portfolio_entries
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  ))
)
```
Apply the same simplification to SELECT and UPDATE policies.

---

### TASK 9 — Drop redundant duplicate indexes on `profiles`
**Table:** `profiles`

**Problem:** Three pairs of redundant indexes add unnecessary write overhead:
- `profiles_referral_code_key` — a standard unique index on `referral_code` (includes NULL as distinct). Superseded by `profiles_referral_code_unique` (partial unique WHERE NOT NULL), which is the correct constraint.
- `profiles_stripe_customer_idx` — a plain btree index on `stripe_customer_id`. Redundant because `profiles_stripe_customer_id_key` (unique) already provides the same lookup benefit.
- `profiles_stripe_sub_idx` — same issue; superseded by `profiles_stripe_subscription_id_key`.

**Fix:** Migration to drop the three redundant indexes:

```sql
-- Migration: drop_redundant_profiles_indexes
DROP INDEX IF EXISTS public.profiles_referral_code_key;
DROP INDEX IF EXISTS public.profiles_stripe_customer_idx;
DROP INDEX IF EXISTS public.profiles_stripe_sub_idx;
```

---

### TASK 10 — Add UPDATE policy to `evidence_files`
**Table:** `evidence_files`

**Problem:** No UPDATE RLS policy exists. Users cannot update any evidence file metadata (e.g., rename a file) from the client — it silently fails (RLS returns empty rows, no error). The scan edge function uses service role so it works, but if UI adds a rename feature, it will break silently.

**Fix:** Migration to add an UPDATE policy:

```sql
-- Migration: evidence_files_update_policy
CREATE POLICY "Users can update own evidence files"
  ON evidence_files
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### TASK 11 — Fix share_links GET: also filter `revoked = false`
**File:** `app/api/share/route.ts` line 65

**Problem:** GET filters `.is('revoked_at', null)` but the table has a separate `revoked boolean` column. The two fields can theoretically diverge (edge case: revoked=true but revoked_at=null, or vice-versa). The canonical revocation state is the `revoked` boolean.

**Fix:** Add `.eq('revoked', false)` to the GET query:

```ts
const { data, error } = await supabase
  .from('share_links')
  .select('id, token, specialty_key, theme_slug, scope, expires_at, view_count, revoked_at, created_at')
  .eq('user_id', user.id)
  .eq('revoked', false)           // ← add this
  .is('revoked_at', null)
  .order('created_at', { ascending: false })
```

---

## PRIORITY 3 — QOL / Polish

---

### TASK 12 — Add UTF-8 BOM to CSV export
**File:** `app/api/export/route.ts` line 113

**Problem:** CSV returned without BOM. Excel on Windows silently misinterprets UTF-8 files as Windows-1252, garbling any non-ASCII characters (accented names, speciality characters, etc.).

**Fix:** In the CSV export block, prepend the BOM:

```ts
const csv = '﻿' + toCsv(entries ?? [], cases ?? [])
```

---

### TASK 13 — Fix HEIF magic byte detection
**File:** `lib/upload/magic-bytes.ts` line 14

**Problem:** `ascii.slice(4, 8) === 'ftyp'` compares raw bytes coerced to ASCII. This is fragile — `String.fromCharCode` on bytes > 127 produces unexpected characters. The correct approach is hex comparison.

**Fix:** Replace line 14:
```ts
// Before:
if (mimeType === 'image/heic' || mimeType === 'image/heif') return ascii.slice(4, 8) === 'ftyp'

// After:
if (mimeType === 'image/heic' || mimeType === 'image/heif') return hex.slice(8, 16) === '66747970'
// 'ftyp' in hex = 66 74 79 70; bytes 4–7 = hex chars 8–15
```

---

### TASK 14 — Sanitise export filename (safeSpecialty)
**File:** `app/api/export/route.ts` line 74

**Problem:** `(specialty || 'portfolio').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()` could produce an all-dashes filename (e.g., if specialty key is `'---'`). Also doesn't collapse consecutive dashes.

**Fix:**
```ts
const safeSpecialty = ((specialty || 'portfolio')
  .replace(/[^a-zA-Z0-9]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase()) || 'portfolio'
```

---

### TASK 15 — Add student email re-verification expiry notification to cron
**File:** `app/api/cron/notifications/route.ts`

**Problem:** The cron sends deadline, share-link-expiring, and activity-nudge emails but never warns users that their student email verification is about to expire. Users discover their student tier downgraded only when they try to access a feature.

**Fix:** In the notifications cron, add a query for users where:
- `student_email_verification_due_at` is between today and 30 days from now
- `tier = 'student'` (still on student plan)
- Respect `notification_preferences` (treat as deadline-category notification)

Send an email (use the existing Resend + `buildNotificationEmail` pattern already used in the cron) with subject "Your student email verification expires soon" and a link to `/settings` to re-verify.

---

### TASK 16 — Fix CLAUDE.md: wrong table name `entry_templates`
**File:** `.claude/CLAUDE.md` — Database Tables section

**Problem:** The table is listed as `entry_templates` in CLAUDE.md but the actual table name in the database is `templates`. This misleads future agents.

**Fix:** In `.claude/CLAUDE.md`, find the Database Tables table row:
```
| `entry_templates` | Curated (~9 trimmed) + user templates |
```
Change to:
```
| `templates` | Curated (~9 trimmed) + user templates; `user_id IS NULL` = curated |
```

---

### TASK 17 — Add explicit `WITH CHECK` to `goals` ALL policy
**Table:** `goals`

**Problem:** The `goals` ALL policy has `qual = (auth.uid() = user_id)` but `with_check = null`. Postgres defaults null with_check to the qual expression, so this is functionally correct, but relying on the implicit behaviour is fragile and confusing.

**Fix:** Migration to recreate the policy with an explicit with_check:

```sql
-- Migration: goals_explicit_with_check
DROP POLICY IF EXISTS "Users manage their own goals" ON goals;
CREATE POLICY "Users manage their own goals"
  ON goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## NOTES FOR CODEX

- All DB changes need a dated migration file in `supabase/migrations/` (format: `YYYYMMDD_description.sql`) AND in the local `supabase/` folder for reference.
- After each DB migration, run the existing migration pattern: check `supabase/migrations/` for the naming convention used on 2026-04-29.
- Do **not** use `git add -A` — add only the files you changed.
- The in-memory rate limiter issue (Tasks not listed above) is left for a future Redis/Upstash integration task — do not attempt to add new infrastructure packages without user approval.
