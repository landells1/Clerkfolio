import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand
        blue: {
          DEFAULT: '#1B6FD9',
          50:  '#EAF2FC',
          100: '#CADEF6',
          200: '#95BCED',
          300: '#5F9AE3',
          400: '#3884DD',
          500: '#1B6FD9',
          600: '#155BB0',
          700: '#0F4487',
          800: '#0A3260',
          900: '#061E3D',
        },
        // Dark UI backgrounds
        surface: {
          DEFAULT: '#0B0B0C',
          panel:   '#141416',
          hi:      '#1B1B1E',
          border:  'rgba(245,245,242,0.08)',
        },
        ink: {
          DEFAULT: '#F5F5F2',
          soft:    'rgba(245,245,242,0.55)',
          dim:     'rgba(245,245,242,0.35)',
        },
        accent: {
          DEFAULT: 'oklch(0.82 0.13 195)',
          soft: 'oklch(0.82 0.13 195 / 0.15)',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderColor: {
        DEFAULT: 'rgba(245,245,242,0.08)',
      },
    },
  },
  plugins: [],
}

export default config
