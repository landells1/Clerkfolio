export function hasSupabaseTestEnv() {
  return Boolean(
    process.env.SUPABASE_TEST_URL &&
    process.env.SUPABASE_TEST_ANON_KEY &&
    process.env.SUPABASE_TEST_SERVICE_ROLE_KEY,
  )
}

export function hasAuthTestUserEnv() {
  return Boolean(
    hasSupabaseTestEnv() &&
    process.env.E2E_TEST_USER_EMAIL &&
    process.env.E2E_TEST_USER_PASSWORD,
  )
}
