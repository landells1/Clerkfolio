import { ImageResponse } from 'next/og'

// Open Graph / Twitter share card (F-007). Reuses the brand mark from
// app/(marketing)/_components/landing/logo.tsx — a linear-gradient rounded
// square wrapping the inline bar-chart + checkmark SVG — rendered on the
// #0B0B0C brand card. Next auto-wires both og:image and twitter:image from
// this file convention. Satori renders inline SVG, linear-gradient, flexbox
// and text natively, so this stays brand-exact with zero design asset.

export const alt = 'Clerkfolio - the UK doctor portfolio that keeps up with your career'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0B0B0C',
          backgroundImage:
            'radial-gradient(900px 500px at 50% 22%, rgba(27,111,217,0.18), rgba(11,11,12,0))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 132,
              height: 132,
              borderRadius: 28,
              background: 'linear-gradient(135deg, #3884DD 0%, #155BB0 100%)',
            }}
          >
            <svg viewBox="0 0 64 64" width="84" height="84" fill="none">
              <rect x="8" y="32" width="9" height="24" rx="1.6" fill="#0A3260" fillOpacity="0.85" />
              <rect x="20" y="26" width="9" height="30" rx="1.6" fill="#0A3260" fillOpacity="0.9" />
              <rect x="32" y="20" width="9" height="36" rx="1.6" fill="#0A3260" fillOpacity="0.95" />
              <rect x="44" y="12" width="14" height="44" rx="2.4" fill="#EAF2FC" />
              <path
                d="M48 34 L52 38 L56 28"
                stroke="#155BB0"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            style={{
              marginLeft: 36,
              fontSize: 108,
              fontWeight: 600,
              letterSpacing: -4,
              color: '#F5F5F2',
            }}
          >
            Clerkfolio
          </div>
        </div>
        <div
          style={{
            marginTop: 40,
            maxWidth: 880,
            textAlign: 'center',
            fontSize: 40,
            lineHeight: 1.3,
            color: 'rgba(245,245,242,0.66)',
          }}
        >
          The UK doctor portfolio that keeps up with your career.
        </div>
      </div>
    ),
    { ...size }
  )
}
