// SSRF guards for outbound webhook fetches (share view notifications, etc).
//
// `URL.hostname` can take many forms that resolve to private addresses:
//   - dotted-quad IPv4 (`127.0.0.1`)
//   - decimal IPv4 (`2130706433` = 127.0.0.1)
//   - hex IPv4 (`0x7f000001`)
//   - octal IPv4 (`0177.0.0.1`)
//   - IPv6 forms (`[::1]`, `[::ffff:127.0.0.1]`, `[::]`)
//   - DNS names that resolve to private (eg attacker-controlled DNS rebinding)
//
// We normalise the hostname to a 32-bit IPv4 integer (or treat as IPv6 / DNS)
// and reject any address in private/reserved space. For DNS names we *cannot*
// fully prevent rebinding without resolving DNS ourselves and pinning the
// resolved address; this guard catches the easy cases.

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  rangeOf('0.0.0.0/8'),
  rangeOf('10.0.0.0/8'),
  rangeOf('100.64.0.0/10'),
  rangeOf('127.0.0.0/8'),
  rangeOf('169.254.0.0/16'),
  rangeOf('172.16.0.0/12'),
  rangeOf('192.0.0.0/24'),
  rangeOf('192.0.2.0/24'),
  rangeOf('192.88.99.0/24'),
  rangeOf('192.168.0.0/16'),
  rangeOf('198.18.0.0/15'),
  rangeOf('198.51.100.0/24'),
  rangeOf('203.0.113.0/24'),
  rangeOf('224.0.0.0/4'),
  rangeOf('240.0.0.0/4'),
]

const PRIVATE_HOST_NAMES = new Set(['localhost', 'localhost.localdomain'])

const PRIVATE_HOST_SUFFIXES = ['.local', '.localhost', '.internal', '.intranet', '.lan']

function rangeOf(cidr: string): [number, number] {
  const [ip, maskBits] = cidr.split('/')
  const ipInt = ipv4ToInt(ip)
  const bits = Number(maskBits)
  if (ipInt === null) throw new Error(`bad cidr ${cidr}`)
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  const start = (ipInt & mask) >>> 0
  const end = (start | (~mask >>> 0)) >>> 0
  return [start, end]
}

// Parse a single dotted IPv4 octet the way C `inet_aton` and many HTTP
// clients / resolvers do: a leading "0x"/"0X" is hex, a leading "0" followed
// by more digits is OCTAL (so "0177" === 127, not 177), otherwise decimal.
// Returns null for anything malformed or outside the 0-255 octet range.
//
// Treating leading-zero octets as octal is the crux of the SSRF guard: a naive
// decimal parse reads "0177.0.0.1" as the public 177.0.0.1, while a real client
// dials octal 127.0.0.1 (loopback). We must match the client, then reject.
function parseIpv4Octet(seg: string): number | null {
  let n: number
  if (/^0[xX][0-9a-fA-F]+$/.test(seg)) {
    n = parseInt(seg.slice(2), 16)
  } else if (/^0[0-7]+$/.test(seg)) {
    n = parseInt(seg, 8)
  } else if (/^(0|[1-9]\d*)$/.test(seg)) {
    n = Number(seg)
  } else {
    // Ambiguous / invalid (e.g. "08", "0", trailing junk) -> not a clean octet.
    return null
  }
  return Number.isInteger(n) && n >= 0 && n <= 255 ? n : null
}

function ipv4ToInt(part: string): number | null {
  const segs = part.split('.')
  if (segs.length !== 4) return null
  let result = 0
  for (const seg of segs) {
    const n = parseIpv4Octet(seg)
    if (n === null) return null
    result = (result * 256 + n) >>> 0
  }
  return result
}

// Parse `host` as IPv4 in dotted (decimal/octal/hex octets), single-integer
// decimal/octal, or single-integer hex form. Returns the 32-bit integer form,
// or null if the host is not parseable as IPv4.
function parseIpv4(host: string): number | null {
  // Dotted form: "127.0.0.1", "0177.0.0.1" (octal), "0x7f.0.0.1" (hex).
  if (host.includes('.')) return ipv4ToInt(host)
  // Single hex integer: "0x7f000001"
  if (/^0[xX][0-9a-fA-F]+$/.test(host)) {
    const n = parseInt(host.slice(2), 16)
    if (Number.isFinite(n) && n >= 0 && n <= 0xffffffff) return n
    return null
  }
  // Single octal integer: leading zero, e.g. "017700000001" === 2130706433
  if (/^0[0-7]+$/.test(host)) {
    const n = parseInt(host, 8)
    if (Number.isFinite(n) && n >= 0 && n <= 0xffffffff) return n
    return null
  }
  // Single decimal integer: "2130706433"
  if (/^\d{1,10}$/.test(host)) {
    const n = Number(host)
    if (n >= 0 && n <= 0xffffffff) return n
  }
  return null
}

function isPrivateIpv4(value: number): boolean {
  return PRIVATE_IPV4_RANGES.some(([start, end]) => value >= start && value <= end)
}

function isPrivateIpv6(host: string): boolean {
  const trimmed = host.replace(/^\[/, '').replace(/\]$/, '').toLowerCase()
  if (trimmed === '::' || trimmed === '::1') return true
  if (trimmed.startsWith('fc') || trimmed.startsWith('fd')) return true       // ULA
  if (trimmed.startsWith('fe8') || trimmed.startsWith('fe9') ||
      trimmed.startsWith('fea') || trimmed.startsWith('feb')) return true     // link-local fe80::/10
  if (trimmed.startsWith('ff')) return true                                    // multicast
  // IPv4-mapped: ::ffff:127.0.0.1 etc.
  const v4MapMatch = trimmed.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4MapMatch) {
    const v4 = ipv4ToInt(v4MapMatch[1])
    if (v4 !== null && isPrivateIpv4(v4)) return true
  }
  return false
}

export function isPublicWebhookHost(host: string): boolean {
  if (!host) return false
  const lower = host.toLowerCase()

  if (PRIVATE_HOST_NAMES.has(lower)) return false
  if (PRIVATE_HOST_SUFFIXES.some(suffix => lower.endsWith(suffix))) return false

  // Bracketed IPv6
  if (lower.startsWith('[') && lower.endsWith(']')) {
    return !isPrivateIpv6(lower)
  }

  // Bare IPv6 (no brackets) - URL.hostname strips them
  if (lower.includes(':')) {
    return !isPrivateIpv6(lower)
  }

  const v4 = parseIpv4(lower)
  if (v4 !== null) return !isPrivateIpv4(v4)

  // Otherwise treat as DNS name. We cannot resolve here, so accept the host
  // but the fetch call site should still set a short timeout and not follow
  // redirects to disallow rebinding-based exploitation.
  return true
}
