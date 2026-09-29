import { Archivo } from 'next/font/google'

// Landing-only face. Self-hosted by next/font (same-origin, CSP-safe). The
// width axis lets one family carry both the condensed display voice and the
// normal-width text.
export const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo',
})
