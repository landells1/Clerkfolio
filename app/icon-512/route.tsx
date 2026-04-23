import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        background: '#1D9E75',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '112px',
        color: '#0B0B0C',
        fontWeight: 700,
        fontSize: 290,
        fontFamily: 'monospace',
      }}
    >
      C
    </div>,
    { width: 512, height: 512 }
  )
}
