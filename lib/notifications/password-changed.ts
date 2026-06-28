import type { SupabaseClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications/create'
import { transactionalEmail } from '@/lib/notifications/email-templates'

export type PasswordChangeMode = 'in_app' | 'reset'

// Shared by both password-change paths — the in-app reauth change
// (`/api/account/password`) and the email-reset link
// (`/api/account/password-reset-complete`) — so the in-app notification and the
// out-of-band "your password was changed" email are identical regardless of how
// the password was changed (F-038). The email is the security signal: if the
// account owner did not make the change, it is their first warning of takeover.
// The caller is responsible for the audit_log row (action differs per path).
export async function notifyPasswordChanged(
  service: SupabaseClient,
  params: { userId: string; email: string | null; mode: PasswordChangeMode },
): Promise<void> {
  const { userId, email, mode } = params
  const heading = 'Your password was changed'
  const lines = [
    mode === 'reset'
      ? 'Your Clerkfolio password was just reset using a password-reset link.'
      : 'Your Clerkfolio password was just changed from your account settings.',
    'If this was you, no action is needed.',
    'If this was NOT you, reset your password immediately and email admin@clerkfolio.co.uk.',
  ]

  const email_ = email
    ? {
        to: email,
        subject: 'Your Clerkfolio password was changed',
        ...transactionalEmail({
          firstName: null,
          heading,
          lines,
          ctaLabel: 'Review account activity',
          ctaPath: '/settings/audit-log',
        }),
      }
    : null

  await createNotification(
    service,
    { userId, type: 'password_changed', title: heading, body: lines[0], link: '/settings/audit-log' },
    email_,
  )
}
