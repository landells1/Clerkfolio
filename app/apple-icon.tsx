export const size = { width: 180, height: 180 }
export const contentType = 'image/svg+xml'

export default function AppleIcon() {
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
      <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#3884DD"/><stop offset="1" stop-color="#155BB0"/></linearGradient></defs>
      <rect width="180" height="180" rx="38" fill="url(#g)"/>
      <g transform="translate(35 35) scale(1.72)">
        <rect x="8" y="32" width="9" height="24" rx="1.6" fill="#0A3260" fill-opacity="0.9"/>
        <rect x="20" y="26" width="9" height="30" rx="1.6" fill="#0A3260" fill-opacity="0.95"/>
        <rect x="32" y="20" width="9" height="36" rx="1.6" fill="#0A3260"/>
        <rect x="44" y="12" width="14" height="44" rx="2.4" fill="#EAF2FC"/>
        <path d="M48 34 52 38 56 28" fill="none" stroke="#155BB0" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>`,
    { headers: { 'Content-Type': contentType } }
  )
}
