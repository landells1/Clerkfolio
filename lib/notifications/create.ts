import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// noreply@ is the automated From: sender on transactional mail (the contact
// addresses consolidate onto admin@ in Batch 8 - this is a sending identity,
// not a reply-to). Keep it as the no-reply sender.
const FROM = 'Clerkfolio <noreply@clerkfolio.co.uk>'

export interface NotificationInput {
  userId: string
  type: string
  title: string
  body?: string | null
  link?: string | null
}

export interface NotificationEmail {
  to: string
  subject: string
  html: string
  text: string
}

// Generic reward/account notification plumbing (F-036; reused by Batch 6 F-038
// "password changed" email). Inserts an in-app notification row (service role -
// users cannot self-insert per the notifications RLS posture) and optionally
// sends a transactional email. Both failures are logged, never thrown: a reward
// grant or password change must not fail because notification/email had a
// hiccup.
export async function createNotification(
  service: SupabaseClient,
  input: NotificationInput,
  email?: NotificationEmail | null,
): Promise<void> {
  const { error } = await service.from('notifications').insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  })
  if (error) console.error('createNotification: insert failed:', error.message)

  if (email && email.to && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: FROM,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      })
    } catch (err) {
      console.error('createNotification: email send failed:', err instanceof Error ? err.message : 'unknown')
    }
  }
}

// Resolve a user's auth email by id (service role admin API). Mirrors the
// share auto-revoke owner lookup. Returns null on any failure so callers treat
// email as best-effort.
export async function getUserEmail(service: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data, error } = await service.auth.admin.getUserById(userId)
    if (error) return null
    return data.user?.email ?? null
  } catch {
    return null
  }
}
