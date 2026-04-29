-- Only one active Clerkfolio profile can verify a given institutional email.

create unique index if not exists profiles_verified_institutional_email_unique
  on public.profiles (lower(student_email))
  where student_email_verified = true
    and student_email is not null;
