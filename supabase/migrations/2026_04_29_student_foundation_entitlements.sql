-- Rework Student so it is a storage-only tier and centralise entitlement logic.

alter table public.profiles
  add column if not exists student_graduation_date date;

alter table public.profiles
  drop constraint if exists profiles_tier_check;

alter table public.profiles
  add constraint profiles_tier_check
  check (tier in ('free','student','foundation','pro'));

update public.profiles
set tier = 'foundation'
where tier = 'student'
  and (
    student_graduation_date < current_date
    or career_stage in ('FY1','FY2','POST_FY')
  );

alter table public.profiles
  drop column if exists student_grace_until;

create or replace function public.get_profile_entitlements(p_user_id uuid)
returns table (
  tier text,
  is_pro boolean,
  is_student boolean,
  storage_quota_mb integer,
  pdf_exports_used integer,
  share_links_used integer,
  specialties_tracked integer,
  storage_used_mb numeric,
  referral_pro_until timestamptz,
  student_graduation_date date,
  can_export_pdf boolean,
  can_create_share_link boolean,
  can_track_another_specialty boolean,
  can_bulk_import boolean,
  can_upload_files boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with profile as (
    select
      p.*,
      case
        when p.tier = 'student'
          and (
            p.student_graduation_date < current_date
            or p.career_stage in ('FY1','FY2','POST_FY')
          )
          then 'foundation'
        else p.tier
      end as effective_tier,
      nullif(p.pro_features_used->>'referral_pro_until', '')::timestamptz as referral_until,
      coalesce((p.pro_features_used->>'pdf_exports_used')::int, 0) as pdf_count,
      coalesce((p.pro_features_used->>'share_links_used')::int, 0) as share_count
    from public.profiles p
    where p.id = p_user_id
      and (
        auth.uid() = p_user_id
        or current_setting('request.jwt.claim.role', true) = 'service_role'
        or current_user in ('postgres', 'supabase_admin', 'service_role')
      )
  ),
  usage as (
    select
      p.id,
      coalesce((
        select count(*)::int
        from public.specialty_applications sa
        where sa.user_id = p.id and sa.is_active = true
      ), 0) as specialty_count,
      coalesce((
        select sum(ef.file_size)::numeric / (1024 * 1024)
        from public.evidence_files ef
        where ef.user_id = p.id
      ), 0) as storage_mb
    from profile p
  ),
  resolved as (
    select
      p.effective_tier,
      p.pdf_count,
      p.share_count,
      p.referral_until,
      p.student_graduation_date,
      u.specialty_count,
      u.storage_mb,
      (p.effective_tier = 'pro' or coalesce(p.referral_until > now(), false)) as pro_access
    from profile p
    join usage u on u.id = p.id
  )
  select
    effective_tier,
    pro_access,
    effective_tier = 'student',
    case
      when pro_access then 5120
      when effective_tier = 'student' then 1024
      else 100
    end,
    pdf_count,
    share_count,
    specialty_count,
    storage_mb,
    referral_until,
    student_graduation_date,
    pro_access or pdf_count < 1,
    pro_access or share_count < 1,
    pro_access or specialty_count < 1,
    pro_access,
    storage_mb < case
      when pro_access then 5120
      when effective_tier = 'student' then 1024
      else 100
    end
  from resolved;
$$;

create or replace function public.protect_profile_account_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := current_setting('request.jwt.claim.role', true);
begin
  if tg_op = 'UPDATE'
    and coalesce(v_role, '') <> 'service_role'
    and current_user not in ('postgres', 'supabase_admin', 'service_role')
  then
    new.tier := old.tier;
    new.student_email_verified := old.student_email_verified;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.subscription_period_end := old.subscription_period_end;
  end if;

  if new.tier = 'student'
    and (
      new.student_graduation_date < current_date
      or new.career_stage in ('FY1','FY2','POST_FY')
    )
  then
    new.tier := 'foundation';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_account_fields_trigger on public.profiles;
create trigger protect_profile_account_fields_trigger
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_account_fields();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral_code text;
  v_referrer_id uuid;
  v_is_student boolean;
begin
  v_referral_code := encode(gen_random_bytes(6), 'hex');
  v_is_student := new.email ilike '%.ac.uk';

  if nullif(new.raw_user_meta_data->>'referral_code', '') is not null then
    select id into v_referrer_id
    from public.profiles
    where referral_code = new.raw_user_meta_data->>'referral_code'
      and id <> new.id
    limit 1;
  end if;

  insert into public.profiles (
    id,
    first_name,
    last_name,
    career_stage,
    onboarding_complete,
    tier,
    student_email_verified,
    referral_code,
    referred_by,
    pro_features_used,
    notification_preferences
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'career_stage', ''),
    false,
    case when v_is_student then 'student' else 'free' end,
    v_is_student,
    v_referral_code,
    v_referrer_id,
    '{"pdf_exports_used":0,"share_links_used":0,"referral_pro_until":null}'::jsonb,
    '{"deadlines":true,"share_link_expiring":true,"activity_nudge":false,"application_window":true}'::jsonb
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.enforce_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used bigint;
  v_quota_mb integer;
  v_quota_bytes bigint;
  v_limit_label text;
begin
  select storage_quota_mb
    into v_quota_mb
    from public.get_profile_entitlements(new.user_id)
    limit 1;

  v_quota_bytes := coalesce(v_quota_mb, 100) * 1024 * 1024;
  v_limit_label := case
    when coalesce(v_quota_mb, 100) >= 5120 then '5 GB'
    when coalesce(v_quota_mb, 100) >= 1024 then '1 GB'
    else '100 MB'
  end;

  select coalesce(sum(file_size), 0)
    into v_used
    from public.evidence_files
   where user_id = new.user_id;

  if v_used + new.file_size > v_quota_bytes then
    raise exception 'Storage quota exceeded (% limit). Delete some files to free up space.', v_limit_label;
  end if;

  return new;
end;
$$;
