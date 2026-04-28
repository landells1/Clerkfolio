-- Additional hardening from Supabase advisors after the V2 schema repair.

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_storage_quota() from public, anon, authenticated;

create index if not exists audit_log_user_id_idx
  on public.audit_log (user_id);

create index if not exists entry_revisions_user_id_idx
  on public.entry_revisions (user_id);

create index if not exists goals_specialty_application_id_idx
  on public.goals (specialty_application_id);

create index if not exists profiles_referred_by_idx
  on public.profiles (referred_by);

create index if not exists referrals_referrer_id_idx
  on public.referrals (referrer_id);

create index if not exists templates_user_id_idx
  on public.templates (user_id);
