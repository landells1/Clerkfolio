import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(to bottom, #3884DD, #155BB0)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
      }}
    >
      <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
        <rect x="5" y="14" width="4.5" height="11" rx="0.8" fill="#0A3260" fillOpacity="0.9" />
        <rect x="10.5" y="11" width="4.5" height="14" rx="0.8" fill="#0A3260" fillOpacity="0.95" />
        <rect x="16" y="8" width="4.5" height="17" rx="0.8" fill="#0A3260" />
        <rect x="21.5" y="5" width="7" height="20" rx="1.2" fill="#EAF2FC" />
        <path d="M23.5 15.5 L25.5 17.5 L27.5 13" stroke="#155BB0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>,
    { ...size }
  )
}
