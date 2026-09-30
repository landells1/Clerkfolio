import type { CSSProperties, ReactNode } from 'react'
import { LockIcon } from './icons'
import styles from './product.module.css'

// Faithful renders of real Clerkfolio screens: the same page structure, labels,
// controls and order as the app (components/sidebar.tsx, the portfolio, cases,
// specialty, import and export pages), themed with the app palette (--a-*).
// Every value is example data and anonymised; mockups are labelled images with
// nothing interactive inside.

type Tone = 'primary' | 'warm' | 'grey'

const TONES: Record<Tone, string> = {
  primary: 'bg-[var(--p-primary-soft)] text-[var(--p-primary-text)]',
  warm: 'bg-[var(--p-warm-soft)] text-[var(--p-warm-text)]',
  grey: 'bg-[var(--p-surface-2)] text-[var(--p-ink-2)]',
}

export function Pill({ tone = 'grey', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium ${TONES[tone]}`}>{children}</span>
}

function Count({ to }: { to: number }) {
  return (
    <>
      <span className={styles.count} style={{ '--to': to } as CSSProperties} aria-hidden="true" />
      <span className="sr-only">{to}</span>
    </>
  )
}

function Svg({ size = 15, className = '', children }: { size?: number; className?: string; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 ${className}`} aria-hidden="true">
      {children}
    </svg>
  )
}

// The app's own icons (components/sidebar.tsx), same paths.
const ICONS: Record<string, ReactNode> = {
  Dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  Portfolio: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
  Cases: <path d="M9 12h6m-3-3v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />,
  'Rotations & training': <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
  Specialties: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  ARCP: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  Timeline: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  'Import & export': <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
  Trash: <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>,
  Home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  Search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
  Bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
  Menu: <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>,
  Back: <polyline points="15 18 9 12 15 6" />,
  Chevron: <polyline points="9 18 15 12 9 6" />,
  Edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
  Link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
  File: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
  Target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  Shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  Upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
}

const Icon = ({ name, size, className }: { name: string; size?: number; className?: string }) => <Svg size={size} className={className}>{ICONS[name]}</Svg>

function Tick({ on }: { on: boolean }) {
  return (
    <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${on ? 'border-[var(--a-accent)] bg-[var(--a-accent)]' : 'border-[var(--a-border)] bg-[var(--a-surface)]'}`}>
      {on ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--a-surface)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : null}
    </span>
  )
}

const LABEL = 'text-[9.5px] font-semibold uppercase tracking-wider text-[var(--a-emphasis)]'
const FIELD = 'rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2 text-[12px] text-[var(--a-text)]'
const BUTTON = 'flex items-center justify-center gap-1.5 rounded-lg bg-[var(--a-button)] px-3.5 py-2 text-[12px] font-semibold text-[var(--a-on-button)]'
const OUTLINE = 'flex items-center gap-1.5 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--a-text-2)]'

// ---- Frames ---------------------------------------------------------------

export function AppWindow({ label, path, children, className = '' }: { label: string; path: string; children: ReactNode; className?: string }) {
  return (
    <figure role="img" aria-label={label} className={`overflow-hidden rounded-2xl border border-[var(--p-line)] bg-[var(--a-canvas)] shadow-[var(--p-shadow-frame)] ${className}`}>
      <div className="flex h-9 items-center justify-center border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-4" aria-hidden="true">
        <span className={`${styles.mono} rounded-md bg-[var(--a-surface)] px-3 py-0.5 text-[11px] text-[var(--a-muted)]`}>clerkfolio.co.uk/{path}</span>
      </div>
      <div aria-hidden="true" className="text-[var(--a-text)]">{children}</div>
    </figure>
  )
}

export function Phone({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <figure role="img" aria-label={label} className={`w-[252px] rounded-[40px] bg-[var(--p-navy)] p-[9px] shadow-[var(--p-shadow-frame)] ${className}`}>
      <div className="relative flex h-[500px] flex-col overflow-hidden rounded-[32px] bg-[var(--a-canvas)] text-[var(--a-text)]" aria-hidden="true">
        <div className="flex h-8 flex-shrink-0 items-center justify-between px-6 text-[10.5px] font-semibold">
          <span className={styles.mono}>9:41</span>
          <span className="h-[17px] w-[64px] rounded-full bg-[var(--p-navy)]" />
          <span className="flex items-end gap-0.5"><span className="h-1.5 w-1 rounded-sm bg-current" /><span className="h-2 w-1 rounded-sm bg-current" /><span className="h-2.5 w-1 rounded-sm bg-current" /></span>
        </div>
        {children}
      </div>
    </figure>
  )
}

export const Logo = ({ size = 26 }: { size?: number }) => (
  <span className="flex flex-shrink-0 items-center justify-center rounded-md" style={{ width: size, height: size, background: 'linear-gradient(135deg, #2b4fae 0%, #1d3a8a 100%)' }}>
    <svg viewBox="0 0 64 64" width={size * 0.64} height={size * 0.64} fill="none">
      <rect x="8" y="32" width="9" height="24" rx="1.6" fill="#0b1633" fillOpacity="0.85" />
      <rect x="20" y="26" width="9" height="30" rx="1.6" fill="#0b1633" fillOpacity="0.9" />
      <rect x="32" y="20" width="9" height="36" rx="1.6" fill="#0b1633" fillOpacity="0.95" />
      <rect x="44" y="12" width="14" height="44" rx="2.4" fill="#eef1f8" />
      <path d="M48 34 L52 38 L56 28" stroke="#f2a20c" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
)

const NAV = ['Dashboard', 'Portfolio', 'Cases', 'Rotations & training', 'Specialties', 'ARCP', 'Timeline', 'Import & export', 'Trash']

function Sidebar({ active }: { active: string }) {
  return (
    <div className="hidden w-[200px] flex-shrink-0 flex-col border-r border-[var(--a-border)] bg-[var(--a-canvas)] md:flex">
      <div className="flex items-center gap-2.5 border-b border-[var(--a-border)] px-4 py-3.5">
        <Logo />
        <span className="text-[14px] font-semibold tracking-tight">Clerkfolio</span>
      </div>
      <div className="flex-1 space-y-px px-2 py-2.5 text-[12px] font-bold">
        {NAV.map(label => label === active ? (
          <div key={label} className="flex items-center gap-2.5 rounded-r-lg border-l-2 border-[var(--a-nav-active-border)] bg-[var(--a-nav-active-bg)] px-2.5 py-[7px] text-[var(--a-text)]">
            <Icon name={label} size={14} className="text-[var(--a-accent)]" />{label}
          </div>
        ) : (
          <div key={label} className="flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[var(--a-emphasis)]">
            <Icon name={label} size={14} />{label}
          </div>
        ))}
      </div>
      <div className="space-y-px border-t border-[var(--a-border)] px-2 py-2.5 text-[12px] font-bold text-[var(--a-emphasis)]">
        <p className="px-2.5 py-1.5">Send feedback</p>
        <p className="px-2.5 py-1.5">Upgrade</p>
        <p className="px-2.5 py-1.5">Settings</p>
        <p className="flex items-center gap-2 px-2.5 py-1.5"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--a-accent-soft)] text-[9.5px] text-[var(--a-accent-soft-text)]">AC</span>Alex Carter</p>
      </div>
    </div>
  )
}

// Mobile shell: the real top bar (menu, logo, export, search, bell) and the
// bottom navigation (Home, Portfolio, Cases, Timeline, Specialties).
function MobileShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <>
      <div className="flex h-11 flex-shrink-0 items-center justify-between border-b border-[var(--a-border)] px-3">
        <Icon name="Menu" size={17} className="text-[var(--a-text-2)]" />
        <span className="flex items-center gap-1.5 text-[13px] font-semibold"><Logo size={22} />Clerkfolio</span>
        <span className="flex gap-2.5 text-[var(--a-text-2)]"><Icon name="Import & export" size={15} /><Icon name="Search" size={15} /><Icon name="Bell" size={15} /></span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-3.5 pt-3">{children}</div>
      <div className="flex flex-shrink-0 justify-around border-t border-[var(--a-border)] bg-[var(--a-surface)] px-1 pb-3 pt-1.5">
        {['Home', 'Portfolio', 'Cases', 'Timeline', 'Specialties'].map(label => (
          <span key={label} className={`flex flex-col items-center gap-0.5 text-[8.5px] font-medium ${label === active ? 'text-[var(--a-accent)]' : 'text-[var(--a-text-2)]'}`}>
            <Icon name={label} size={15} />{label}
          </span>
        ))}
      </div>
    </>
  )
}

function PageHeader({ title, sub, action }: { title: string; sub: string; action: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[19px] font-semibold tracking-[-0.02em]">{title}</p>
        <p className="text-[11.5px] text-[var(--a-text-2)]">{sub}</p>
      </div>
      <span className={BUTTON}><span className="text-[14px] leading-none">+</span>{action}</span>
    </div>
  )
}

// ---- Portfolio (/portfolio) -----------------------------------------------

const TILES: [string, string, number, string, number][] = [
  ['Audit', '#4ade80', 6, '12d ago', 60],
  ['Teaching', '#a78bfa', 9, '4d ago', 90],
  ['Conference', '#22d3ee', 5, '1mo ago', 50],
  ['Publication', '#818cf8', 1, '5mo ago', 10],
  ['Leadership', '#f472b6', 3, '2mo ago', 30],
  ['Prize', '#fbbf24', 2, '8mo ago', 20],
  ['Procedure', '#fb7185', 11, '2d ago', 100],
  ['Reflection', '#60a5fa', 5, '9d ago', 50],
]

function Tile({ tile }: { tile: (typeof TILES)[number] }) {
  const [name, dot, count, last, pct] = tile
  return (
    <div className="relative overflow-hidden rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] p-2.5">
      <p className="flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-wide text-[var(--a-muted)]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />{name}</p>
      <p className="mt-1 flex items-baseline gap-1"><span className="text-[18px] font-semibold leading-none"><Count to={count} /></span><span className="text-[10.5px] text-[var(--a-text-2)]">entries</span></p>
      <p className="mt-1 text-[10.5px] text-[var(--a-text-2)]">Last: {last}</p>
      <span className="absolute bottom-0 left-0 h-0.5" style={{ width: `${pct}%`, background: dot }} />
    </div>
  )
}

const ENTRY_CARDS: [string, string, string, string, string][] = [
  ['Audit', 'High', 'VTE prophylaxis re-audit', 'Audit · Re-audit', '2mo ago'],
  ['Teaching', '', 'Grand round talk', 'Grand round · Consultants', '11mo ago'],
  ['Procedure', '', 'Ascitic drain', 'Ascitic drain · Ward', '2d ago'],
]

function EntryCard({ card, index }: { card: (typeof ENTRY_CARDS)[number]; index: number }) {
  const [category, importance, title, subtitle, when] = card
  return (
    <div className={`${styles.arrive} flex items-start justify-between rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] p-3`} style={{ '--i': index } as CSSProperties}>
      <div className="min-w-0">
        <p className="mb-1.5 flex flex-wrap gap-1 text-[9.5px] font-medium">
          <span className="rounded border border-[var(--a-border)] bg-[var(--a-surface-2)] px-1.5 py-0.5 text-[var(--a-text-2)]">{category}</span>
          <span className="rounded bg-[var(--a-accent-soft)] px-1.5 py-0.5 text-[var(--a-accent-soft-text)]">Internal Medicine Training (IMT)</span>
          {importance ? <span className="rounded border border-[var(--a-warning-line)] bg-[var(--a-warning-soft)] px-1.5 py-0.5 text-[var(--a-warning-text)]">{importance}</span> : null}
        </p>
        <p className="truncate text-[12.5px] font-medium">{title}</p>
        <p className="mt-0.5 truncate text-[10.5px] text-[var(--a-muted)]">{subtitle}</p>
      </div>
      <p className={`${styles.mono} flex items-center gap-0.5 whitespace-nowrap text-[10.5px] text-[var(--a-text-2)]`}>{when}<Icon name="Chevron" size={12} /></p>
    </div>
  )
}

export function PortfolioPage() {
  return (
    <div className="flex h-[500px]">
      <Sidebar active="Portfolio" />
      <div className="min-w-0 flex-1 overflow-hidden px-6 py-5">
        <PageHeader title="Portfolio" sub="42 entries logged" action="Add entry" />
        <div className="mt-3.5 flex gap-2 text-[12px]">
          <span className={`${FIELD} flex-1 text-[var(--a-muted)]`}>Search portfolio</span>
          <span className={`${FIELD} hidden lg:block`}>Any importance</span>
          <span className={`${FIELD} hidden lg:block`}>Any fields</span>
          <span className={`${FIELD} font-medium`}>Search</span>
        </div>
        <div className="mt-3 flex gap-1 border-b border-[var(--a-border)] pb-2.5 text-[12px] font-medium">
          <span className="rounded-lg bg-[var(--a-surface-3)] px-3 py-1.5">Categories</span>
          <span className="rounded-lg px-3 py-1.5 text-[var(--a-text-2)]">Themes</span>
          <span className="rounded-lg px-3 py-1.5 text-[var(--a-text-2)]">All</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {TILES.map(tile => <Tile key={tile[0]} tile={tile} />)}
        </div>
        <div className="mt-3 space-y-2">
          {ENTRY_CARDS.slice(0, 2).map((card, index) => <EntryCard key={card[2]} card={card} index={index} />)}
        </div>
      </div>
    </div>
  )
}

export function PortfolioPhone() {
  return (
    <MobileShell active="Portfolio">
      <PageHeader title="Portfolio" sub="42 entries logged" action="Add entry" />
      <p className={`${FIELD} mt-3 text-[var(--a-muted)]`}>Search portfolio</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {TILES.slice(0, 4).map(tile => <Tile key={tile[0]} tile={tile} />)}
      </div>
      <div className="mt-2.5 space-y-2">
        <EntryCard card={ENTRY_CARDS[2]} index={0} />
      </div>
    </MobileShell>
  )
}

// ---- Cases (/cases and /cases/new) -----------------------------------------

export function CasesPhone() {
  return (
    <MobileShell active="Cases">
      <PageHeader title="Cases" sub="27 cases logged" action="Log case" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {([['Total cases', 27, 'all time'], ['This month', 3, 'March']] as const).map(([label, value, sub]) => (
          <div key={label} className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] p-2.5">
            <p className="text-[9.5px] font-medium uppercase tracking-wide text-[var(--a-muted)]">{label}</p>
            <p className="mt-1 text-[18px] font-semibold leading-none"><Count to={value} /></p>
            <p className="mt-1 text-[10px] text-[var(--a-text-2)]">{sub}</p>
          </div>
        ))}
      </div>
      <p className={`${FIELD} mt-2.5 text-[var(--a-muted)]`}>Search cases</p>
      <div className="mt-2.5 overflow-hidden rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)]">
        <p className="flex justify-between border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-3 py-1.5 text-[10px] font-semibold text-[var(--a-text-2)]"><span>March 2026</span><span>3 cases</span></p>
        {[['DKA in type 1 diabetes', 'Endocrinology', '12 Mar', '#60a5fa'], ['Anterior STEMI', 'Cardiology', '8 Mar', '#fb7185'], ['Community-acquired pneumonia', 'Respiratory', '2 Mar', '#4ade80']].map(([title, area, date, dot]) => (
          <div key={title} className="flex items-center gap-2 border-b border-[var(--a-border)] px-3 py-2 last:border-b-0">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: dot }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px]">{title}</span>
              <span className="block text-[9.5px] text-[var(--a-muted)]">IMT · {area}</span>
            </span>
            <span className="text-[10px] text-[var(--a-muted)]">{date}</span>
          </div>
        ))}
      </div>
    </MobileShell>
  )
}

export function CaseFormPhone() {
  return (
    <MobileShell active="Cases">
      <div className="flex items-center gap-2">
        <Icon name="Back" size={15} className="text-[var(--a-muted)]" />
        <p className="text-[16px] font-semibold tracking-[-0.01em]">Log case</p>
      </div>
      <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-[var(--a-warning-line)] bg-[var(--a-warning-soft)] px-2.5 py-2 text-[9.5px] leading-snug text-[var(--a-warning-text)]">
        <Icon name="Shield" size={12} className="mt-px" />Keep this anonymous - no patient names, dates of birth, NHS numbers, or other identifying details.
      </p>
      <div className="mt-2.5 space-y-2">
        <div><p className={LABEL}>Case title *</p><p className={`${FIELD} mt-1`}>DKA in type 1 diabetes</p></div>
        <div className="grid grid-cols-2 gap-2">
          <div><p className={LABEL}>Date *</p><p className={`${FIELD} mt-1`}>12/03/2026</p></div>
          <div><p className={LABEL}>Clinical area</p><p className={`${FIELD} mt-1 truncate`}>Endocrinology</p></div>
        </div>
        <div><p className={LABEL}>Linked specialties</p><p className="mt-1"><span className="rounded bg-[var(--a-accent-soft)] px-1.5 py-0.5 text-[9.5px] font-medium text-[var(--a-accent-soft-text)]">Internal Medicine Training (IMT)</span></p></div>
        <div><p className={LABEL}>Importance</p><p className="mt-1 flex gap-1 text-[10.5px] font-medium">{['Low', 'Medium', 'High'].map(level => <span key={level} className={`flex-1 rounded-md border py-1 text-center ${level === 'Medium' ? 'border-[var(--a-accent)] bg-[var(--a-accent-soft)] text-[var(--a-accent-soft-text)]' : 'border-[var(--a-border)] text-[var(--a-text-2)]'}`}>{level}</span>)}</p></div>
        <div><p className={LABEL}>Notes</p><p className={`${FIELD} mt-1 h-[52px] leading-snug text-[var(--a-text-2)]`}>Fluids and insulin protocol, potassium monitoring, when to escalate.</p></div>
      </div>
      <p className={`${BUTTON} mt-2.5 w-full py-2.5`}>Save case</p>
    </MobileShell>
  )
}

// ---- Entry detail (/portfolio/[id]) ----------------------------------------

export function EntryDetailPage() {
  return (
    <div className="px-5 py-5 sm:px-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <Icon name="Back" size={16} className="text-[var(--a-muted)]" />
          <span className="rounded-lg border border-[#c4b5fd] bg-[#f3efff] px-2.5 py-1 text-[11.5px] font-medium text-[#5b3cc4]">Teaching &amp; Presentations</span>
        </span>
        <span className="flex gap-1.5">
          <span className={OUTLINE}>Log similar</span>
          <span className={OUTLINE}><Icon name="Edit" size={12} />Edit</span>
        </span>
      </div>
      <div className="mt-4 space-y-4 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
        <div>
          <p className="text-[18px] font-semibold tracking-tight">Grand round talk</p>
          <p className={`${styles.mono} text-[11.5px] text-[var(--a-muted)]`}>14 Oct 2025</p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div><p className={LABEL}>Linked specialties</p><p className="mt-1.5"><span className="rounded-lg bg-[var(--a-accent-soft)] px-2 py-1 text-[11px] text-[var(--a-accent-soft-text)]">Internal Medicine Training (IMT)</span></p></div>
          <div><p className={LABEL}>Importance</p><p className="mt-1.5"><span className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] px-2 py-1 text-[11px]">High</span></p></div>
        </div>
        <div><p className={LABEL}>Competency themes</p><p className="mt-1.5 flex gap-1.5">{['Communication', 'Teaching'].map(theme => <span key={theme} className="rounded-lg border border-[#ddd6fe] bg-[#f5f3ff] px-2 py-1 text-[11px] text-[#5b3cc4]">{theme}</span>)}</p></div>
        <div className="border-t border-[var(--a-border)] pt-3.5">
          <p className={LABEL}>Details</p>
          <div className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-[11.5px]">
            {[['Type', 'Grand round'], ['Audience', 'Consultants'], ['Setting', 'Local'], ['Invited', 'Yes']].map(([label, value]) => (
              <div key={label}><p className="text-[10px] text-[var(--a-muted)]">{label}</p><p>{value}</p></div>
            ))}
          </div>
        </div>
        <div className="border-t border-[var(--a-border)] pt-3.5">
          <p className={LABEL}>Evidence</p>
          <div className="mt-2 space-y-1.5">
            {[['grand-round-slides.pptx', '4.1 MB'], ['audience-feedback.pdf', '0.6 MB']].map(([file, size]) => (
              <p key={file} className="flex items-center gap-2 rounded-lg border border-[var(--a-border)] px-2.5 py-1.5 text-[11.5px]"><Icon name="File" size={13} className="text-[var(--a-accent)]" /><span className="flex-1 truncate">{file}</span><span className={`${styles.mono} text-[10px] text-[var(--a-muted)]`}>{size}</span></p>
            ))}
          </div>
        </div>
        <p className={`${styles.mono} flex justify-between border-t border-[var(--a-border)] pt-3 text-[9.5px] text-[var(--a-text-2)]`}><span>Added 14 Oct 2025</span><span>Updated 16 Oct 2025</span></p>
      </div>
    </div>
  )
}

// ---- Specialty detail (/specialties, IMT 2026) ------------------------------

const DOMAINS: [string, number, number][] = [
  ['Qualifications', 0, 4],
  ['Presentations', 2, 6],
  ['Publications', 3, 8],
  ['Teaching', 3, 5],
  ['Training in Teaching', 1, 3],
  ['Quality Improvement', 3, 4],
]

const QI_BANDS: [string, number, boolean][] = [
  ['All stages of 2 complete QI/audit cycles', 4, false],
  ['Some stages of 2 cycles OR all stages of 1 complete cycle', 3, true],
  ['Some stages of a single cycle', 1, false],
]

export function SpecialtyPage() {
  return (
    <div className="px-5 py-5 sm:px-7">
      <p className="flex items-center gap-1 text-[12px] text-[var(--a-muted)]"><Icon name="Back" size={13} />My Specialties</p>
      <div className="mt-3 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2"><span className="text-[17px] font-semibold">Internal Medicine Training (IMT)</span><span className="rounded bg-[var(--a-surface-2)] px-1.5 py-0.5 text-[11px] text-[var(--a-muted)]">2026</span></p>
            <div className="mt-3 grid grid-cols-2 gap-5">
              <div>
                <p className={LABEL}>Score</p>
                <p className="mt-1 flex items-baseline gap-1"><span className="text-[26px] font-bold leading-none"><Count to={12} /></span><span className="text-[11px] text-[var(--a-muted)]">/ 30 pts</span></p>
                <p className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--a-surface-2)]"><span className="block h-full w-[40%] rounded-full bg-[var(--a-accent)]" /></p>
              </div>
              <div>
                <p className={LABEL}>Essentials</p>
                <p className="mt-1 flex items-baseline gap-1"><span className="text-[26px] font-bold leading-none">5</span><span className="text-[11px] text-[var(--a-muted)]">/ 5 met</span></p>
                <p className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--a-surface-2)]"><span className="block h-full w-full rounded-full bg-[var(--a-accent)]" /></p>
              </div>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-lg border border-[var(--a-warning-line)] bg-[var(--a-warning-soft)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--a-warning-text)]"><Icon name="Target" size={11} />Application target</span>
        </div>
        <p className={`${LABEL} mt-4`}>Bonus points</p>
        <p className="mt-1.5 flex items-center gap-2.5 text-[11.5px] text-[var(--a-text-2)]"><Tick on={false} />Applying only to IMT/ACCS-IM in Round 1 (5 pts)</p>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] px-3.5 py-2.5 text-[11px]">
        <span className="font-semibold">Getting an interview</span>
        <span className="text-[var(--a-muted)]">&rarr;</span>
        <span className="text-[var(--a-text-2)]">Self-assessment scoring · 30 points across 6 domains</span>
      </p>
      <p className="mt-3 flex gap-2 px-1 text-[10.5px]"><span className="font-semibold uppercase tracking-wide text-[var(--a-emphasis)]">Scoring</span><span className="text-[var(--a-text-2)]">Self-assessment for shortlisting</span></p>
      <div className="mt-1.5 flex gap-1 overflow-hidden">
        {DOMAINS.map(([name, score, max]) => (
          <span key={name} className={`flex-shrink-0 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[10.5px] ${name === 'Quality Improvement' ? 'border-[var(--a-accent)] bg-[var(--a-accent-soft)] text-[var(--a-accent-soft-text)]' : 'border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-text-2)]'}`}>
            {name} <span className={styles.mono}>{score}/{max}</span>
          </span>
        ))}
      </div>
      <div className="mt-2.5 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
        <p className="flex justify-between text-[10.5px]"><span className="font-semibold uppercase tracking-wide text-[var(--a-emphasis)]">Scoring bands</span><span className="text-[var(--a-text-2)]">Tick to claim</span></p>
        <div className="mt-2 space-y-1">
          {QI_BANDS.map(([band, points, on]) => (
            <p key={band} className={`flex items-center gap-2.5 rounded-lg border px-2 py-1.5 text-[11px] ${on ? 'border-[color-mix(in_srgb,var(--a-accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--a-accent)_5%,transparent)]' : 'border-transparent'}`}>
              <Tick on={on} /><span className={`flex-1 ${on ? '' : 'text-[var(--a-text-2)]'}`}>{band}</span><span className={`font-semibold ${on ? 'text-[var(--a-accent)]' : 'text-[var(--a-text-2)]'}`}>{points} pts</span>
            </p>
          ))}
        </div>
        <p className="my-2.5 flex items-center gap-2 text-[10.5px] text-[var(--a-text-2)]"><span className="h-px flex-1 bg-[var(--a-border)]" />or link evidence<span className="h-px flex-1 bg-[var(--a-border)]" /></p>
        <p className="flex items-center gap-2 rounded-lg border border-[var(--a-border)] px-2.5 py-2 text-[11.5px]"><Icon name="Link" size={13} className="text-[var(--a-accent)]" /><span className="flex-1">VTE prophylaxis re-audit</span><span className="text-[10px] text-[var(--a-muted)]">Audit &amp; QIP</span></p>
      </div>
    </div>
  )
}

// ---- Import (/import) -----------------------------------------------------------

export function ImportPage() {
  return (
    <div className="px-5 py-5 sm:px-7">
      <div className="flex items-start gap-2.5">
        <Icon name="Back" size={16} className="mt-1 text-[var(--a-muted)]" />
        <div>
          <p className="text-[19px] font-semibold tracking-tight">Import your portfolio</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--a-muted)]">Bring an existing portfolio into Clerkfolio. The Horus importer is below - you can also map a CSV/spreadsheet or restore a Clerkfolio backup.</p>
          <p className="mt-2.5 flex gap-2"><span className={OUTLINE}>CSV / spreadsheet</span><span className={OUTLINE}>Clerkfolio backup</span></p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
        <p className="text-[13.5px] font-semibold">Upload your Horus export</p>
        <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--a-border)] bg-[var(--a-canvas)] px-4 py-7 text-center">
          <Icon name="Upload" size={22} className="text-[var(--a-muted)]" />
          <p className="text-[12px] font-medium text-[var(--a-text-2)]">Drop CSV here, or click to browse</p>
        </div>
        <p className="mt-3 text-[11px] font-medium text-[var(--a-text-2)]">How to export from Horus</p>
        <p className="mt-1 text-[10.5px] text-[var(--a-accent)]">Horus support · UKFPO e-portfolio guidance</p>
      </div>
    </div>
  )
}

// ---- Import & export tabs (/export) --------------------------------------------

const TABS = ['Import', 'Application PDF', 'Data backup', 'Share links', 'Files']

function ExportTabs({ active }: { active: string }) {
  return (
    <>
      <p className="text-[19px] font-semibold tracking-tight">Import &amp; export</p>
      <div className="mt-3 flex flex-wrap gap-1 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] p-1 text-[11.5px] font-medium">
        {TABS.map(tab => <span key={tab} className={`rounded px-3 py-1.5 ${tab === active ? 'bg-[var(--a-button)] text-[var(--a-on-button)]' : 'text-[var(--a-text-2)]'}`}>{tab}</span>)}
      </div>
    </>
  )
}

export function PdfExportPage() {
  return (
    <div className="px-5 py-5 sm:px-7">
      <ExportTabs active="Application PDF" />
      <div className="mt-3.5 grid grid-cols-2 gap-3 text-[11.5px]">
        <div>
          <p className={LABEL}>Format</p>
          <p className="mt-1.5 flex gap-1">{['PDF', 'CSV', 'JSON'].map(f => <span key={f} className={`rounded-lg border px-3 py-1.5 ${f === 'PDF' ? 'border-[var(--a-accent)] bg-[var(--a-accent-soft)] text-[var(--a-accent-soft-text)]' : 'border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-text-2)]'}`}>{f}</span>)}</p>
        </div>
        <div><p className={LABEL}>Template</p><p className={`${FIELD} mt-1.5`}>ST application</p></div>
      </div>
      <p className="mt-3 flex items-center gap-2.5 text-[11.5px]"><Tick on />Include notes and reflection text</p>
      <div className="mt-3.5 overflow-hidden rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--a-border)] px-3.5 py-2">
          <span className="text-[10.5px] text-[var(--a-muted)]">PDFs include portfolio entries only.</span>
          <span className={BUTTON}>Export PDF</span>
        </div>
        {([['VTE prophylaxis re-audit', 'Audit', true], ['Sepsis screening QIP', 'Audit', true], ['OSCE teaching, 3rd years', 'Teaching', true], ['Grand round talk', 'Teaching', false]] as const).map(([title, category, on]) => (
          <p key={title} className="flex items-center gap-2.5 border-b border-[var(--a-border)] px-3.5 py-2 text-[11.5px] last:border-b-0">
            <Tick on={on} /><span className="flex-1">{title}</span><span className="text-[10px] text-[var(--a-muted)]">{category}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

export function ShareLinksPage() {
  return (
    <div className="px-5 py-5 sm:px-7">
      <ExportTabs active="Share links" />
      <div className="mt-3.5 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
        <p className="text-[13px] font-semibold">Create protected link</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div><p className={LABEL}>Scope</p><p className={`${FIELD} mt-1`}>Tracked specialty</p></div>
          <div><p className={LABEL}>Specialty</p><p className={`${FIELD} mt-1 truncate`}>Internal Medicine Training (IMT)</p></div>
          <div><p className={LABEL}>Expires</p><p className={`${FIELD} mt-1`}>14/11/2026</p></div>
          <div><p className={LABEL}>PIN *</p><p className={`${FIELD} ${styles.mono} mt-1 tracking-[0.3em]`}>••••••</p></div>
        </div>
        <p className="mt-1.5 text-[10px] text-[var(--a-text-2)]">Required - anyone opening the link must enter this 4-8 digit PIN.</p>
        <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
          <span className="flex items-center gap-1.5"><Tick on />Hide notes</span>
          <span className="flex items-center gap-1.5"><Tick on={false} />Hide reflection text</span>
          <span className="flex items-center gap-1.5"><Tick on={false} />Redact tags</span>
        </p>
        <p className={`${BUTTON} mt-3 w-fit`}>Create link</p>
      </div>
      <div className="mt-3 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)]">
        <p className="border-b border-[var(--a-border)] px-4 py-2.5 text-[13px] font-semibold">Your links</p>
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-[11px]">
          <span className="flex flex-1 items-center gap-1.5"><LockIcon className="h-3.5 w-3.5 text-[var(--a-accent)]" />IMT 2026 · expires 14 Nov 2026</span>
          <span className={OUTLINE}>Preview</span><span className={OUTLINE}>Renew</span>
        </div>
      </div>
    </div>
  )
}
