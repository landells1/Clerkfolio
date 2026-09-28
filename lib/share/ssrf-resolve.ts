import { lookup } from 'node:dns/promises'
import { isPublicWebhookHost } from '@/lib/share/ssrf'

// isPublicWebhookHost cannot see where a DNS name points, so a hostname like
// 127.0.0.1.nip.io passed the create-time check. Before the service role makes
// an outbound request, resolve the name and require EVERY address to be public.
// (A rebinding race between this lookup and the fetch remains possible; the
// 3s timeout and no-redirect policy at the call site bound that.)
export async function resolvesToPublicAddresses(hostname: string): Promise<boolean> {
  if (!isPublicWebhookHost(hostname)) return false
  const bare = hostname.replace(/^\[/, '').replace(/\]$/, '')
  try {
    const addresses = await lookup(bare, { all: true, verbatim: true })
    if (addresses.length === 0) return false
    return addresses.every(({ address }) => isPublicWebhookHost(address.includes(':') ? `[${address}]` : address))
  } catch {
    return false
  }
}
