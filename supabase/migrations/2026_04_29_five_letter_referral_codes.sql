-- Short, human-friendly referral codes.

create or replace function public.generate_referral_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  next_code text := '';
  index int;
begin
  for index in 1..5 loop
    next_code := next_code || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
  end loop;

  return next_code;
end;
$$;

do $$
declare
  profile_row record;
  next_code text;
begin
  for profile_row in
    select id
    from public.profiles
    where referral_code is null
       or referral_code !~ '^[A-Z]{5}$'
  loop
    loop
      next_code := public.generate_referral_code();
      exit when not exists (
        select 1
        from public.profiles
        where referral_code = next_code
          and id <> profile_row.id
      );
    end loop;

    update public.profiles
    set referral_code = next_code
    where id = profile_row.id;
  end loop;
end;
$$;

create unique index if not exists profiles_referral_code_unique
  on public.profiles (referral_code)
  where referral_code is not null;

alter table public.profiles
  drop constraint if exists profiles_referral_code_format_check;

alter table public.profiles
  add constraint profiles_referral_code_format_check
  check (referral_code is null or referral_code ~ '^[A-Z]{5}$');

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
  v_career_stage text;
  v_supplied_referral text;
begin
  loop
    v_referral_code := public.generate_referral_code();
    exit when not exists (
      select 1 from public.profiles where referral_code = v_referral_code
    );
  end loop;

  v_is_student := new.email ilike '%.ac.uk';
  v_career_stage := nullif(new.raw_user_meta_data->>'career_stage', '');
  v_supplied_referral := upper(nullif(new.raw_user_meta_data->>'referral_code', ''));

  if v_career_stage not in ('Y1','Y2','Y3','Y4','Y5','Y5_PLUS','Y6','FY1','FY2','POST_FY','Y1-2','Y3-4','Y5-6') then
    v_career_stage := null;
  end if;

  if v_supplied_referral is not null then
    select id into v_referrer_id
    from public.profiles
    where referral_code = v_supplied_referral
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
    student_email,
    student_email_verified,
    student_email_verified_at,
    student_email_verification_due_at,
    referral_code,
    referred_by,
    pro_features_used,
    notification_preferences
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    v_career_stage,
    false,
    case when v_is_student then 'student' else 'free' end,
    case when v_is_student then lower(new.email) else null end,
    v_is_student,
    case when v_is_student then now() else null end,
    case when v_is_student then (current_date + interval '1 year')::date else null end,
    v_referral_code,
    v_referrer_id,
    '{"pdf_exports_used":0,"share_links_used":0,"referral_pro_until":null}'::jsonb,
    '{"deadlines":true,"share_link_expiring":true,"activity_nudge":false,"application_window":true}'::jsonb
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
