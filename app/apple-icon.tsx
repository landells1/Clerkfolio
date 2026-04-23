import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: '#1D9E75',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '38px',
        color: '#0B0B0C',
        fontWeight: 700,
        fontSize: 100,
        fontFamily: 'monospace',
      }}
    >
      C
    </div>,
    { ...size }
  )
}
