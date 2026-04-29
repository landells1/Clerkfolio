-- Allow database admin/service contexts to update protected profile account fields.

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
