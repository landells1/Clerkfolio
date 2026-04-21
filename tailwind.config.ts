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
        teal: {
          DEFAULT: '#1D9E75',
          50:  '#E8F7F2',
          100: '#C5EBD9',
          200: '#8DD6B8',
          300: '#55C197',
          400: '#1D9E75',
          500: '#178060',
          600: '#11604A',
          700: '#0B4033',
          800: '#062019',
          900: '#020F0C',
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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderColor: {
        DEFAULT: 'rgba(245,245,242,0.08)',
      },
    },
  },
  plugins: [],
}

export default config
