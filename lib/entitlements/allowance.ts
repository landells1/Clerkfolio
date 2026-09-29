import type { SubscriptionInfo } from '@/lib/subscription'

// Free-tier PDF / share-link allowance = 1 base + 1 per rewarded referral
// (the same formula get_profile_entitlements and claim_free_pdf_export use).
// Every "N of M remaining" line in the UI must come from here so copy never
// contradicts what the server will actually allow.
export type Allowance = { allowed: number; used: number; remaining: number }

type AllowanceSource = Pick<SubscriptionInfo, 'referralCount' | 'usage'>

function allowance(allowed: number, used: number): Allowance {
  return { allowed, used, remaining: Math.max(0, allowed - used) }
}

export function pdfAllowance(subInfo: AllowanceSource): Allowance {
  return allowance(1 + Math.max(0, subInfo.referralCount), Math.max(0, subInfo.usage.pdfExportsUsed))
}

export function shareAllowance(subInfo: AllowanceSource, activeLinks = subInfo.usage.shareLinksUsed): Allowance {
  return allowance(1 + Math.max(0, subInfo.referralCount), Math.max(0, activeLinks))
}

/** "1 of 1 PDF remaining" / "2 of 3 PDFs remaining". */
export function pdfRemainingLabel(subInfo: AllowanceSource): string {
  const { allowed, remaining } = pdfAllowance(subInfo)
  return `${remaining} of ${allowed} PDF${allowed === 1 ? '' : 's'} remaining`
}

/** Plural-aware "your N included PDF export(s)" for limit-reached messages. */
export function includedPdfPhrase(limit: unknown): string {
  const n = typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? limit : 1
  return `${n} included PDF export${n === 1 ? '' : 's'}`
}
