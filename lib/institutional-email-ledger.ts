import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { normaliseEmail } from '@/lib/institutional-email'

// Server-only helpers for the recycled-institutional-email ledger
// (`consumed_institutional_emails`, F-037). Kept out of lib/institutional-email.ts
// because that module is imported by client components and must stay node-free —
// this file pulls in `crypto`.

// Mirrors the SQL hash exactly: encode(extensions.digest(lower(email),'sha256'),'hex').
// normaliseEmail lowercases + trims; institutional emails carry no whitespace,
// so the digests agree across TS and Postgres.
export function institutionalEmailHash(email: string): string {
  return createHash('sha256').update(normaliseEmail(email)).digest('hex')
}

// True when the institutional email is permanently bound in the ledger to a
// different account than `userId` (a null binding = a deleted account's
// permanently-locked address). Such an address can never be re-verified here,
// even after its original owner released it — universities recycle .ac.uk.
export async function institutionalEmailBoundElsewhere(
  service: SupabaseClient,
  email: string,
  userId: string,
): Promise<boolean> {
  const { data } = await service
    .from('consumed_institutional_emails')
    .select('user_id')
    .eq('email_hash', institutionalEmailHash(email))
    .maybeSingle()
  if (!data) return false
  return data.user_id !== userId
}

// Bind a freshly-verified institutional email to its account. Idempotent and
// never overwrites an existing binding (callers gate on
// institutionalEmailBoundElsewhere first).
export async function bindInstitutionalEmail(
  service: SupabaseClient,
  email: string,
  userId: string,
): Promise<void> {
  await service
    .from('consumed_institutional_emails')
    .upsert(
      { email_hash: institutionalEmailHash(email), user_id: userId },
      { onConflict: 'email_hash', ignoreDuplicates: true },
    )
}
