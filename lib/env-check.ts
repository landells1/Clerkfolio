/**
 * Startup presence check for required secrets (audit I-5).
 *
 * Each of these degrades differently when absent - CRON_SECRET fails closed,
 * SHARE_IP_HASH_SALT 500s every share access, RESEND_API_KEY makes some sends
 * silently skip, STRIPE_SECRET_KEY blocks account deletion for subscribers -
 * but before this check nothing surfaced a missing secret until a user hit
 * the affected route. Called from instrumentation.ts on server startup.
 *
 * WARN-ONLY by design: it must never throw. Builds run with placeholder
 * public env vars only, and a production lambda that crashes on boot over a
 * missing optional integration is worse than the degraded behaviour itself.
 * The check is skipped entirely outside Vercel production so local dev and CI
 * builds (which legitimately lack secrets) stay quiet.
 */

const REQUIRED_PRODUCTION_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'CRON_SECRET',
  'SHARE_IP_HASH_SALT',
  'NEXT_PUBLIC_APP_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_ID',
  'STRIPE_WEBHOOK_SECRET',
] as const

export function warnOnMissingProductionEnv() {
  if (process.env.VERCEL_ENV !== 'production') return

  const missing = REQUIRED_PRODUCTION_ENV_VARS.filter(name => !process.env[name])
  if (missing.length > 0) {
    // Names only - never log values.
    console.error(
      `MISSING REQUIRED ENV VARS in production: ${missing.join(', ')}. ` +
      'Affected features will degrade or fail when a user hits them - fix the Vercel project env configuration.'
    )
  }
}
