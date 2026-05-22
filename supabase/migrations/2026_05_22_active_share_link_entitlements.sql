-- 2026-05-22: Treat the Free share-link cap as an active-link cap.
--
-- Previously get_profile_entitlements read pro_features_used.share_links_used,
-- which is a lifetime counter. Revoking the only Free share link therefore
-- left can_create_share_link=false forever. Count active, unexpired,
-- unrevoked share_links instead.

CREATE OR REPLACE FUNCTION public.get_profile_entitlements(p_user_id uuid)
RETURNS TABLE(
  tier text,
  is_pro boolean,
  is_student boolean,
  storage_quota_mb integer,
  pdf_exports_used integer,
  share_links_used integer,
  specialties_tracked integer,
  storage_used_mb numeric,
  referral_pro_until timestamp with time zone,
  student_graduation_date date,
  can_export_pdf boolean,
  can_create_share_link boolean,
  can_track_another_specialty boolean,
  can_bulk_import boolean,
  can_upload_files boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        when p.tier = 'student'
          and (
            p.student_email_verified_at is null
            or p.student_email_verification_due_at is null
            or p.student_email_verification_due_at < current_date
          )
          then 'free'
        else p.tier
      end as effective_tier,
      nullif(p.pro_features_used->>'referral_pro_until', '')::timestamptz as referral_until,
      coalesce((p.pro_features_used->>'pdf_exports_used')::int, 0) as pdf_count
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
        select count(*)::int
        from public.share_links sl
        where sl.user_id = p.id
          and sl.revoked = false
          and sl.revoked_at is null
          and sl.expires_at > now()
      ), 0) as active_share_count,
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
      u.active_share_count,
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
    active_share_count,
    specialty_count,
    storage_mb,
    referral_until,
    student_graduation_date,
    pro_access or pdf_count < 1,
    pro_access or active_share_count < 1,
    pro_access or specialty_count < 1,
    pro_access,
    storage_mb < case
      when pro_access then 5120
      when effective_tier = 'student' then 1024
      else 100
    end
  from resolved;
$function$;

GRANT EXECUTE ON FUNCTION public.get_profile_entitlements(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
