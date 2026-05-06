-- Stage 2 schema fixes: RLS gaps, NOT NULL constraints, FK indexes
-- Run after all 2026_05_06_stage2_* migrations have been applied.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. session_fingerprints: missing INSERT and DELETE RLS policies
--    Without these, only SERVICE ROLE can insert/delete rows. Application uses
--    service role for revocation, so INSERT is the critical gap for user-facing
--    session registration.
-- ─────────────────────────────────────────────────────────────────────────────
create policy sess_fp_ins on public.session_fingerprints
  for insert with check ((select auth.uid()) = user_id);

create policy sess_fp_del on public.session_fingerprints
  for delete using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. api_keys.scopes: add NOT NULL (default already present)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.api_keys
  alter column scopes set not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. profiles: NOT NULL on columns that should never be null
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  alter column guided_tour_step set not null,
  alter column timezone set not null,
  alter column pinned_order set not null,
  alter column first_per_category set not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. portfolio_entries.is_demo and cases.is_demo: NOT NULL
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.portfolio_entries
  alter column is_demo set not null;

alter table public.cases
  alter column is_demo set not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FK indexes for cascading-delete performance
--    Composite indexes already exist for query performance; these explicit
--    single-column indexes help Postgres plan cascading DELETEs efficiently.
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists snippets_user_id_idx
  on public.snippets(user_id);

create index if not exists personal_log_user_id_idx
  on public.personal_log(user_id);

create index if not exists saved_searches_user_id_idx
  on public.saved_searches(user_id);

create index if not exists api_keys_user_id_idx
  on public.api_keys(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. rename_user_tag: harden field whitelist (defensive, not blocking)
--    The existing conditional logic already raises for invalid fields,
--    but add an upfront guard so the intent is unambiguous.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.rename_user_tag(
  p_old text,
  p_new text,
  p_field text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- Explicit whitelist before any DML
  if p_field not in ('specialty_tags', 'interview_themes') then
    raise exception 'unsupported field: %', p_field;
  end if;

  if p_field = 'specialty_tags' then
    update public.portfolio_entries
      set specialty_tags = array_replace(specialty_tags, p_old, p_new)
      where user_id = v_user and p_old = any(specialty_tags);

    update public.cases
      set specialty_tags = array_replace(specialty_tags, p_old, p_new)
      where user_id = v_user and p_old = any(specialty_tags);

  elsif p_field = 'interview_themes' then
    update public.portfolio_entries
      set interview_themes = array_replace(interview_themes, p_old, p_new)
      where user_id = v_user and p_old = any(interview_themes);

    update public.cases
      set interview_themes = array_replace(interview_themes, p_old, p_new)
      where user_id = v_user and p_old = any(interview_themes);
  end if;
end;
$$;
