-- Batch 3 / F-016: replace the (removed) auto "completeness" signal with a
-- user-set importance rating on portfolio entries and cases.
--
-- Coarse 3-level scale (low/medium/high) chosen over 1-10 to avoid arbitrary
-- clustering. Nullable: "no importance set" is the default and a valid state.
-- Additive + backward-compatible: existing prod code ignores the new column,
-- and the now-dormant `completeness_score` columns are left in place (no reader
-- remains after this batch, but dropping them is unnecessary and riskier).

alter table public.portfolio_entries
  add column if not exists importance text
    check (importance in ('low', 'medium', 'high'));

alter table public.cases
  add column if not exists importance text
    check (importance in ('low', 'medium', 'high'));

comment on column public.portfolio_entries.importance is
  'User-set importance: low | medium | high | null (none). Batch 3 F-016.';
comment on column public.cases.importance is
  'User-set importance: low | medium | high | null (none). Batch 3 F-016.';
