// @vitest-environment node
//
// isPublicWebhookHost is the SSRF trust boundary for outbound share-view
// webhooks. It must reject every private / loopback / link-local / reserved
// address across the IPv4 obfuscation forms and IPv6, while still accepting
// genuine public hosts. These cases lock that behaviour down.
import { describe, it, expect } from 'vitest'
import { isPublicWebhookHost } from '@/lib/share/ssrf'

describe('isPublicWebhookHost — rejects private/reserved hosts', () => {
  it.each([
    'localhost',
    'localhost.localdomain',
    'service.local',
    'db.internal',
    'host.intranet',
    'box.lan',
    'api.localhost',
  ])('rejects private hostname %s', host => {
    expect(isPublicWebhookHost(host)).toBe(false)
  })

  it.each([
    '0.0.0.0',
    '127.0.0.1',
    '127.1.2.3',
    '10.0.0.1',
    '10.255.255.255',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.0.1',
    '169.254.169.254', // cloud metadata endpoint
    '100.64.0.1', // CGNAT
    '192.0.2.1', // TEST-NET-1
    '198.18.0.1', // benchmarking
    '224.0.0.1', // multicast
    '240.0.0.1', // reserved
  ])('rejects dotted-quad private IPv4 %s', host => {
    expect(isPublicWebhookHost(host)).toBe(false)
  })

  it('rejects decimal-encoded loopback (2130706433 = 127.0.0.1)', () => {
    expect(isPublicWebhookHost('2130706433')).toBe(false)
  })

  it('rejects hex-encoded loopback (0x7f000001)', () => {
    expect(isPublicWebhookHost('0x7f000001')).toBe(false)
  })

  it.each([
    '[::1]',
    '::1',
    '[::]',
    '::',
    '[::ffff:127.0.0.1]',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1', // link-local
    'ff02::1', // multicast
  ])('rejects private IPv6 %s', host => {
    expect(isPublicWebhookHost(host)).toBe(false)
  })

  it('rejects an empty host', () => {
    expect(isPublicWebhookHost('')).toBe(false)
  })
})

describe('isPublicWebhookHost — accepts genuine public hosts', () => {
  it.each([
    'example.com',
    'clerkfolio.co.uk',
    'hooks.slack.com',
    '8.8.8.8',
    '1.1.1.1',
    '93.184.216.34',
    '[2606:4700:4700::1111]', // public Cloudflare IPv6
  ])('accepts public host %s', host => {
    expect(isPublicWebhookHost(host)).toBe(true)
  })
})
