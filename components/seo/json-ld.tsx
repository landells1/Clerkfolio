// Server-renderable JSON-LD block. schema.org data blocks are inert
// (never executed) so the CSP script-src does not block them, but the nonce
// is passed through anyway so they stay valid under any future tightening.
export function JsonLd({ data, nonce }: { data: Record<string, unknown>; nonce?: string }) {
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // JSON.stringify with < escaped so user-influenced strings can never
      // close the script tag. Data here is static marketing content today,
      // but keep the escape if that ever changes.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
