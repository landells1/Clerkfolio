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
        // Dark UI background scale (page → card → elevated → input/hover)
        surface: {
          DEFAULT: '#0B0B0C',  // alias for surface-0
          0: '#0B0B0C',        // page background
          1: '#101012',        // default card / panel
          2: '#141416',        // elevated card / popover / modal
          3: '#1B1B1E',        // input field / hover state on rows
          panel: '#141416',    // legacy alias
          hi: '#1B1B1E',       // legacy alias
          hover: '#232326',
          border: 'rgba(245,245,242,0.08)',
        },
        ink: {
          DEFAULT: '#F5F5F2',
          soft: 'rgba(245,245,242,0.55)',
          dim: 'rgba(245,245,242,0.35)',
        },
        // Foreground scale (high → low contrast)
        fg: {
          DEFAULT: '#F5F5F2',
          1: 'rgba(245,245,242,0.85)',
          2: 'rgba(245,245,242,0.55)',
          3: 'rgba(245,245,242,0.35)',
          4: 'rgba(245,245,242,0.20)',
        },
        accent: {
          DEFAULT: 'oklch(0.82 0.13 195)',
          soft: 'oklch(0.82 0.13 195 / 0.15)',
        },
        // Pill backgrounds (10% opacity over dark surfaces)
        'pill-blue':   'rgba(27, 111, 217, 0.14)',
        'pill-green':  'rgba(34, 197, 94, 0.10)',
        'pill-amber':  'rgba(245, 158, 11, 0.10)',
        'pill-rose':   'rgba(244, 63, 94, 0.10)',
        'pill-violet': 'rgba(167, 139, 250, 0.11)',
        'pill-cyan':   'rgba(34, 211, 238, 0.10)',
        'pill-pink':   'rgba(236, 72, 153, 0.10)',
        'pill-red':    'rgba(239, 68, 68, 0.10)',
        'pill-teal':   'rgba(45, 212, 191, 0.10)',
        'pill-indigo': 'rgba(99, 102, 241, 0.10)',
        'pill-fuchsia':'rgba(217, 70, 239, 0.10)',
        'pill-neutral':'rgba(245, 245, 242, 0.06)',
      },
      borderColor: {
        DEFAULT: 'rgba(245,245,242,0.08)',
        subtle:  'rgba(245,245,242,0.08)',
        default: 'rgba(245,245,242,0.14)',
        strong:  'rgba(245,245,242,0.22)',
        // Pill borders (28-32% opacity)
        'pill-blue':   'rgba(27, 111, 217, 0.42)',
        'pill-green':  'rgba(34, 197, 94, 0.32)',
        'pill-amber':  'rgba(245, 158, 11, 0.32)',
        'pill-rose':   'rgba(244, 63, 94, 0.32)',
        'pill-violet': 'rgba(167, 139, 250, 0.32)',
        'pill-cyan':   'rgba(34, 211, 238, 0.32)',
        'pill-pink':   'rgba(236, 72, 153, 0.32)',
        'pill-red':    'rgba(239, 68, 68, 0.32)',
        'pill-teal':   'rgba(45, 212, 191, 0.32)',
        'pill-indigo': 'rgba(99, 102, 241, 0.32)',
        'pill-fuchsia':'rgba(217, 70, 239, 0.32)',
        'pill-neutral':'rgba(245, 245, 242, 0.14)',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        container: '1320px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.3)',
        elevated: '0 4px 16px rgba(0,0,0,0.4)',
        modal: '0 16px 48px rgba(0,0,0,0.5)',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
      },
    },
  },
  // Pill colour classes are constructed dynamically via the colour map; keep
  // them in safelist so JIT does not purge them when no static usage exists yet.
  safelist: [
    { pattern: /^bg-pill-(blue|green|amber|rose|violet|cyan|pink|red|teal|indigo|fuchsia|neutral)$/ },
    { pattern: /^border-pill-(blue|green|amber|rose|violet|cyan|pink|red|teal|indigo|fuchsia|neutral)$/ },
    { pattern: /^text-(blue|green|amber|rose|violet|cyan|pink|red|teal|indigo|fuchsia)-300$/ },
    { pattern: /^bg-(blue|green|amber|rose|violet|cyan|pink|red|teal|indigo|fuchsia)-(400|500)$/ },
  ],
  plugins: [],
}

export default config
