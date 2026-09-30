import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #2B4FAE 0%, #1D3A8A 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '112px',
      }}
    >
      <svg viewBox="0 0 64 64" width="320" height="320" fill="none">
        <rect x="8" y="32" width="9" height="24" rx="1.6" fill="#0B1633" fillOpacity="0.9" />
        <rect x="20" y="26" width="9" height="30" rx="1.6" fill="#0B1633" fillOpacity="0.95" />
        <rect x="32" y="20" width="9" height="36" rx="1.6" fill="#0B1633" />
        <rect x="44" y="12" width="14" height="44" rx="2.4" fill="#EEF1F8" />
        <path d="M48 34 L52 38 L56 28" stroke="#F2A20C" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>,
    { width: 512, height: 512 }
  )
}
