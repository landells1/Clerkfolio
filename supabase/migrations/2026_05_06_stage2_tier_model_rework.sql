-- Stage 2 batch 1: tier model rework.
-- Apply manually to Supabase project dldhnstjngendpcywthv (eu-west-2).

alter table public.profiles
  add column if not exists foundation_gift_granted_at timestamptz;

create or replace function public.grant_foundation_gift_on_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_until timestamptz;
  v_base timestamptz;
  v_next_until timestamptz;
begin
  if old.career_stage in ('Y1','Y2','Y3','Y4','Y5','Y5_PLUS','Y6')
     and new.career_stage in ('FY1','FY2','POST_FY')
     and new.foundation_gift_granted_at is null then
    v_existing_until := nullif(new.pro_features_used ->> 'referral_pro_until', '')::timestamptz;
    v_base := greatest(coalesce(v_existing_until, now()), now());
    v_next_until := v_base + interval '90 days';

    new.foundation_gift_granted_at := now();
    new.pro_features_used := jsonb_set(
      coalesce(new.pro_features_used, '{}'::jsonb),
      '{referral_pro_until}',
      to_jsonb(v_next_until),
      true
    );
  end if;

  return new;
end;
$$;

drop trigger if exists grant_foundation_gift_on_stage_change on public.profiles;
create trigger grant_foundation_gift_on_stage_change
before update of career_stage on public.profiles
for each row
execute function public.grant_foundation_gift_on_stage_change();
