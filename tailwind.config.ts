import type { Config } from 'tailwindcss'

// Colours are driven by CSS custom properties defined in app/globals.css:
//   :root                 → CREAM theme (default)
//   html[data-theme=dark] → DARK theme (opt-in)
// The Tailwind token names below are kept stable (surface-*, ink, fg-*, …) so
// existing utilities keep working; each now resolves to a var() that flips with
// the active theme. Components must never hard-code a raw colour — always a token.
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', 'html[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Brand blue scale — constant across themes (primary fills are
        // white-on-blue in both). Kept as literals so `bg-blue-500` etc. resolve.
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
        // Surface scale (page → card → elevated → input/hover) — now themed.
        surface: {
          DEFAULT: 'var(--bg-canvas)',
          0: 'var(--bg-canvas)',     // page background
          1: 'var(--bg-surface)',    // default card / panel
          2: 'var(--bg-surface)',    // elevated card / popover / modal
          3: 'var(--bg-raised)',     // input field / hover state on rows
          panel: 'var(--bg-surface)',
          hi: 'var(--bg-raised)',
          hover: 'var(--bg-hover)',
          sidebar: 'var(--bg-sidebar)',
          sunken: 'var(--bg-sunken)',
          raised: 'var(--bg-raised)',
          border: 'var(--border-default)',
        },
        ink: {
          DEFAULT: 'var(--text-primary)',
          soft: 'var(--text-secondary)',
          dim: 'var(--text-muted)',
        },
        // Foreground scale (high → low contrast).
        fg: {
          DEFAULT: 'var(--text-primary)',
          1: 'var(--text-primary)',
          2: 'var(--text-secondary)',
          3: 'var(--text-muted)',
          4: 'var(--text-faint)',
        },
        // Accent === brand blue.
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
          text: 'var(--accent-text)',
        },
        // Pill backgrounds — themed via the category tokens.
        'pill-blue':    'var(--cat-blue-soft)',
        'pill-green':   'var(--cat-green-soft)',
        'pill-amber':   'var(--cat-amber-soft)',
        'pill-rose':    'var(--cat-rose-soft)',
        'pill-violet':  'var(--cat-violet-soft)',
        'pill-cyan':    'var(--cat-cyan-soft)',
        'pill-pink':    'var(--cat-pink-soft)',
        'pill-red':     'var(--cat-red-soft)',
        'pill-teal':    'var(--cat-teal-soft)',
        'pill-indigo':  'var(--cat-indigo-soft)',
        'pill-fuchsia': 'var(--cat-fuchsia-soft)',
        'pill-neutral': 'var(--cat-neutral-soft)',
      },
      borderColor: {
        DEFAULT: 'var(--border-default)',
        subtle:  'var(--border-subtle)',
        default: 'var(--border-default)',
        strong:  'var(--border-strong)',
        'pill-blue':    'var(--cat-blue-border)',
        'pill-green':   'var(--cat-green-border)',
        'pill-amber':   'var(--cat-amber-border)',
        'pill-rose':    'var(--cat-rose-border)',
        'pill-violet':  'var(--cat-violet-border)',
        'pill-cyan':    'var(--cat-cyan-border)',
        'pill-pink':    'var(--cat-pink-border)',
        'pill-red':     'var(--cat-red-border)',
        'pill-teal':    'var(--cat-teal-border)',
        'pill-indigo':  'var(--cat-indigo-border)',
        'pill-fuchsia': 'var(--cat-fuchsia-border)',
        'pill-neutral': 'var(--cat-neutral-border)',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        container: '1320px',
      },
      boxShadow: {
        card: 'var(--shadow-sm)',
        elevated: 'var(--shadow-md)',
        modal: 'var(--shadow-lg)',
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
