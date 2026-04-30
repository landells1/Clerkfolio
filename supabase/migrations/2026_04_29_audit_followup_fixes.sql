-- Follow-up fixes from the 2026-04-29 security/correctness audit.

create or replace function public.increment_pro_feature_usage(
  p_user_id uuid,
  p_feature text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_feature not in ('pdf_exports_used', 'share_links_used') then
    raise exception 'Unsupported pro feature usage counter: %', p_feature;
  end if;

  update public.profiles
     set pro_features_used = jsonb_set(
       coalesce(pro_features_used, '{}'::jsonb),
       array[p_feature],
       to_jsonb(coalesce((pro_features_used ->> p_feature)::int, 0) + 1),
       true
     )
   where id = p_user_id
     and auth.uid() = p_user_id;
end;
$$;

revoke execute on function public.increment_pro_feature_usage(uuid, text) from public, anon;
grant execute on function public.increment_pro_feature_usage(uuid, text) to authenticated;

delete from public.specialty_entry_links where entry_type = 'case';

alter table public.specialty_entry_links
  drop constraint if exists specialty_entry_links_entry_type_check;

alter table public.specialty_entry_links
  add constraint specialty_entry_links_entry_type_check
  check (entry_type = 'portfolio');

drop policy if exists "Users manage own specialty entry links" on public.specialty_entry_links;
drop policy if exists "sel_own_specialty_entry_links" on public.specialty_entry_links;
drop policy if exists "ins_own_specialty_entry_links" on public.specialty_entry_links;
drop policy if exists "upd_own_specialty_entry_links" on public.specialty_entry_links;

create policy "sel_own_specialty_entry_links"
  on public.specialty_entry_links
  for select
  using (
    application_id in (
      select id from public.specialty_applications where user_id = auth.uid()
    )
    and (
      is_checkbox = true
      or entry_id is null
      or entry_id in (
        select id from public.portfolio_entries
        where user_id = auth.uid() and deleted_at is null
      )
    )
  );

create policy "ins_own_specialty_entry_links"
  on public.specialty_entry_links
  for insert
  with check (
    application_id in (
      select id from public.specialty_applications where user_id = auth.uid()
    )
    and (
      is_checkbox = true
      or entry_id is null
      or entry_id in (
        select id from public.portfolio_entries
        where user_id = auth.uid() and deleted_at is null
      )
    )
  );

create policy "upd_own_specialty_entry_links"
  on public.specialty_entry_links
  for update
  using (
    application_id in (
      select id from public.specialty_applications where user_id = auth.uid()
    )
  )
  with check (
    application_id in (
      select id from public.specialty_applications where user_id = auth.uid()
    )
    and (
      is_checkbox = true
      or entry_id is null
      or entry_id in (
        select id from public.portfolio_entries
        where user_id = auth.uid() and deleted_at is null
      )
    )
  );

alter table public.profiles drop constraint if exists profiles_referral_code_key;
drop index if exists public.profiles_stripe_customer_idx;
drop index if exists public.profiles_stripe_sub_idx;

drop policy if exists "Users can update own evidence files" on public.evidence_files;
create policy "Users can update own evidence files"
  on public.evidence_files
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own goals" on public.goals;
create policy "Users manage their own goals"
  on public.goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
