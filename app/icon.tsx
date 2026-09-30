export const size = { width: 32, height: 32 }
export const contentType = 'image/svg+xml'

export default function Icon() {
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#2B4FAE"/><stop offset="1" stop-color="#1D3A8A"/></linearGradient></defs>
      <rect width="32" height="32" rx="8" fill="url(#g)"/>
      <rect x="5" y="14" width="4.5" height="11" rx="0.8" fill="#0B1633" fill-opacity="0.9"/>
      <rect x="10.5" y="11" width="4.5" height="14" rx="0.8" fill="#0B1633" fill-opacity="0.95"/>
      <rect x="16" y="8" width="4.5" height="17" rx="0.8" fill="#0B1633"/>
      <rect x="21.5" y="5" width="7" height="20" rx="1.2" fill="#EEF1F8"/>
      <path d="M23.5 15.5 25.5 17.5 27.5 13" fill="none" stroke="#F2A20C" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    { headers: { 'Content-Type': contentType } }
  )
}
