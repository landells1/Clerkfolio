import type { CSSProperties, ReactNode } from 'react'
import { Logo } from '../logo'
import {
  CalendarIcon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  GridIcon,
  HeartIcon,
  LinkIcon,
  LockIcon,
  PlusIcon,
  SearchIcon,
  TargetIcon,
} from './icons'
import styles from './product.module.css'

// Illustrative product screens. Every value is example data, anonymised, and
// labelled for assistive tech as an example; nothing inside is interactive.

type Tone = 'blue' | 'teal' | 'grey'

const TONES: Record<Tone, string> = {
  blue: 'bg-[var(--p-blue-soft)] text-[var(--p-blue-text)]',
  teal: 'bg-[var(--p-teal-soft)] text-[var(--p-teal-text)]',
  grey: 'bg-[var(--p-surface-2)] text-[var(--p-ink-2)]',
}

export function Pill({ tone = 'grey', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium ${TONES[tone]}`}>{children}</span>
}

function Count({ to }: { to: number }) {
  return (
    <>
      <span className={`${styles.count} ${styles.mono}`} style={{ '--to': to } as CSSProperties} aria-hidden="true" />
      <span className="sr-only">{to}</span>
    </>
  )
}

export function AppWindow({ label, path, children, className = '' }: { label: string; path: string; children: ReactNode; className?: string }) {
  return (
    <figure role="img" aria-label={label} className={`overflow-hidden rounded-2xl border border-[var(--p-line)] bg-[var(--p-ground)] shadow-[var(--p-shadow-frame)] ${className}`}>
      <div className="flex h-10 items-center justify-center border-b border-[var(--p-line)] bg-[var(--p-surface)] px-4" aria-hidden="true">
        <span className={`${styles.mono} rounded-md bg-[var(--p-ground)] px-3 py-1 text-[11.5px] text-[var(--p-ink-3)] ring-1 ring-[var(--p-line)]`}>clerkfolio.co.uk/{path}</span>
      </div>
      <div aria-hidden="true">{children}</div>
    </figure>
  )
}

export function Phone({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <figure role="img" aria-label={label} className={`w-[248px] rounded-[40px] bg-[var(--p-navy)] p-[9px] shadow-[var(--p-shadow-frame)] ${className}`}>
      <div className="relative overflow-hidden rounded-[32px] bg-[var(--p-ground)]" aria-hidden="true">
        <div className="flex h-9 items-center justify-between px-6 text-[11px] font-semibold text-[var(--p-ink)]">
          <span className={styles.mono}>9:41</span>
          <span className="h-[18px] w-[68px] rounded-full bg-[var(--p-navy)]" />
          <span className="flex gap-0.5">
            <span className="h-2 w-1 rounded-sm bg-[var(--p-ink)]" />
            <span className="h-2.5 w-1 rounded-sm bg-[var(--p-ink)]" />
            <span className="h-3 w-1 rounded-sm bg-[var(--p-ink)]" />
          </span>
        </div>
        {children}
      </div>
    </figure>
  )
}

const NAV = [
  ['Dashboard', GridIcon],
  ['Portfolio', FolderIcon],
  ['Cases', HeartIcon],
  ['Specialties', TargetIcon],
  ['Timeline', CalendarIcon],
  ['Import & export', DownloadIcon],
] as const

function Sidebar({ active }: { active: string }) {
  return (
    <div className="hidden w-[196px] flex-shrink-0 border-r border-[var(--p-line)] bg-[var(--p-surface)] px-3 py-4 md:block">
      <div className="mb-5 flex items-center gap-2 px-2">
        <Logo />
        <span className="text-[14px] font-semibold">Clerkfolio</span>
      </div>
      {NAV.map(([label, Glyph]) => (
        <div
          key={label}
          className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] ${label === active ? 'bg-[var(--p-ground)] font-semibold text-[var(--p-ink)] shadow-[var(--p-shadow-card)]' : 'text-[var(--p-ink-2)]'}`}
        >
          <Glyph className={`h-4 w-4 ${label === active ? 'text-[var(--p-blue)]' : ''}`} />
          {label}
        </div>
      ))}
    </div>
  )
}

const ENTRIES: [string, string, Tone, string, number][] = [
  ['VTE prophylaxis re-audit', 'Audit & QIP', 'blue', 'Aug 2024 · FY1, North trust', 2],
  ['OSCE teaching, 3rd years', 'Teaching', 'teal', 'Nov 2024 · FY1, North trust', 1],
  ['ALS certificate', 'Courses', 'grey', 'Mar 2025 · FY1, North trust', 1],
  ['Grand round talk', 'Presentation', 'blue', 'Oct 2025 · FY2, City trust', 3],
  ['FY2 forum rep', 'Leadership', 'teal', 'Feb 2026 · FY2, City trust', 0],
  ['Sepsis screening QIP', 'Audit & QIP', 'blue', 'Sep 2026 · F3, locum posts', 2],
]

const DOMAINS: [string, number][] = [
  ['Quality Improvement', 2],
  ['Teaching Experience', 1],
  ['Presentations & Posters', 1],
  ['Training in Teaching', 1],
  ['Publications', 0],
]

function SpecialtyCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--p-line)] bg-[var(--p-ground)] p-4 shadow-[var(--p-shadow-card)]">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold">IMT 2026</span>
        <Pill tone="blue">Tracked</Pill>
      </div>
      <p className="mt-1 text-[11.5px] text-[var(--p-ink-3)]">Self-assessment, then interview</p>
      <div className="mt-3 space-y-0.5">
        {DOMAINS.slice(0, compact ? 4 : 5).map(([domain, count]) => (
          <div key={domain} className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5 text-[12.5px]">
            <span className="min-w-0 truncate text-[var(--p-ink-2)]">{domain}</span>
            <span className={`${styles.mono} whitespace-nowrap text-[11.5px] ${count ? 'text-[var(--p-ink)]' : 'text-[var(--p-ink-3)]'}`}>{count ? <><Count to={count} /> linked</> : 'none yet'}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-[var(--p-line)] pt-2.5 text-[11.5px] text-[var(--p-ink-3)]">Counts only. You decide how it applies.</p>
    </div>
  )
}

export function DashboardMock() {
  return (
    <div className="flex min-h-[440px]">
      <Sidebar active="Portfolio" />
      <div className="min-w-0 flex-1 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[19px] font-semibold tracking-[-0.01em]">Portfolio</p>
            <p className="text-[12.5px] text-[var(--p-ink-3)]"><Count to={42} /> entries across 3 posts</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-lg border border-[var(--p-line)] px-2.5 py-1.5 text-[12px] text-[var(--p-ink-3)] sm:flex">
              <SearchIcon className="h-3.5 w-3.5" /> Search entries
            </span>
            <span className="flex items-center gap-1 rounded-lg bg-[var(--p-button)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--p-on-button)]">
              <PlusIcon className="h-3.5 w-3.5" /> New entry
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {['All', 'Audit & QIP', 'Teaching', 'Presentations', 'Courses'].map((chip, index) => (
            <span key={chip} className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${index === 0 ? 'bg-[var(--p-ink)] text-[var(--p-ground)]' : 'bg-[var(--p-surface-2)] text-[var(--p-ink-2)]'}`}>{chip}</span>
          ))}
        </div>
        <div className="mt-4 divide-y divide-[var(--p-line)] rounded-xl border border-[var(--p-line)]">
          {ENTRIES.map(([title, category, tone, meta, files], index) => (
            <div key={title} className={`${styles.arrive} flex items-center gap-3 px-3.5 py-2.5`} style={{ '--i': index } as CSSProperties}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{title}</p>
                <p className="truncate text-[11.5px] text-[var(--p-ink-3)]">{meta}</p>
              </div>
              <Pill tone={tone}>{category}</Pill>
              <span className={`hidden w-10 items-center justify-end gap-1 text-[11.5px] text-[var(--p-ink-3)] sm:flex ${styles.mono}`}>
                {files ? <><FileIcon className="h-3.5 w-3.5" />{files}</> : null}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden w-[272px] flex-shrink-0 border-l border-[var(--p-line)] bg-[var(--p-surface)] p-4 lg:block">
        <SpecialtyCard />
      </div>
    </div>
  )
}

function Field({ label, value, tall = false }: { label: string; value: string; tall?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] font-medium text-[var(--p-ink-3)]">{label}</p>
      <p className={`mt-1 rounded-lg border border-[var(--p-line)] px-2.5 py-2 text-[12px] leading-snug ${tall ? 'min-h-[58px]' : ''}`}>{value}</p>
    </div>
  )
}

export function CaseLogScreen() {
  return (
    <div className="px-4 pb-5 pt-2">
      <p className="text-[16px] font-semibold">Log a case</p>
      <div className="mt-3 space-y-2.5">
        <Field label="Clinical area" value="Endocrinology" />
        <Field label="Case" value="DKA in type 1 diabetes" />
        <Field label="What I learned" value="Fluid and insulin protocol, potassium monitoring, when to escalate." tall />
      </div>
      <p className="mt-3 flex gap-1.5 rounded-lg bg-[var(--p-teal-soft)] px-2.5 py-2 text-[10.5px] leading-snug text-[var(--p-teal-text)]">
        <LockIcon className="mt-px h-3.5 w-3.5" /> Keep it anonymised: no names, dates of birth or NHS numbers.
      </p>
      <p className="mt-3 rounded-lg bg-[var(--p-button)] py-2.5 text-center text-[12.5px] font-semibold text-[var(--p-on-button)]">Save case</p>
    </div>
  )
}

export function EntryDetailMock() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone="blue">Presentation</Pill>
        <Pill>Oct 2025</Pill>
        <Pill>FY2, City trust</Pill>
      </div>
      <p className="mt-3 text-[20px] font-semibold tracking-[-0.01em]">Grand round talk</p>
      <p className="mt-2 max-w-[42ch] text-[13px] leading-relaxed text-[var(--p-ink-2)]">Twenty-minute talk on recognising sepsis early on the wards, followed by questions from the medical team.</p>
      <p className="mt-5 text-[11.5px] font-semibold text-[var(--p-ink-3)]">Evidence</p>
      <div className="mt-2 space-y-1.5">
        {[['grand-round-slides.pptx', '4.1 MB'], ['audience-feedback.pdf', '0.6 MB']].map(([file, size]) => (
          <div key={file} className="flex items-center gap-2.5 rounded-lg border border-[var(--p-line)] px-3 py-2 text-[12.5px]">
            <FileIcon className="h-4 w-4 text-[var(--p-blue)]" />
            <span className="flex-1 truncate">{file}</span>
            <span className={`${styles.mono} text-[11px] text-[var(--p-ink-3)]`}>{size}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11.5px] font-semibold text-[var(--p-ink-3)]">Competency themes</span>
        <Pill tone="teal">Communication</Pill>
        <Pill tone="teal">Teaching</Pill>
      </div>
      <p className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--p-blue-soft)] px-3 py-2 text-[12px] font-medium text-[var(--p-blue-text)]">
        <LinkIcon className="h-4 w-4" /> Linked to IMT 2026: Presentations & Posters
      </p>
    </div>
  )
}

export function SpecialtyMock() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[20px] font-semibold tracking-[-0.01em]">Internal Medicine Training</p>
          <p className="text-[12.5px] text-[var(--p-ink-3)]">2026 recruitment · published self-assessment domains</p>
        </div>
        <Pill tone="blue">Tracked</Pill>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11.5px] font-medium text-[var(--p-ink-2)]">
        <span className="rounded-full bg-[var(--p-ink)] px-2.5 py-1 text-[var(--p-ground)]">Self-assessment</span>
        <span className="h-px w-5 bg-[var(--p-line-strong)]" />
        <span className="rounded-full bg-[var(--p-surface-2)] px-2.5 py-1">Interview</span>
      </div>
      <div className="mt-5 divide-y divide-[var(--p-line)] rounded-xl border border-[var(--p-line)]">
        {DOMAINS.map(([domain, count]) => (
          <div key={domain} className="flex items-center justify-between px-3.5 py-2.5 text-[13px]">
            <span>{domain}</span>
            <span className={`${styles.mono} text-[12px] ${count ? 'text-[var(--p-ink)]' : 'text-[var(--p-ink-3)]'}`}>{count ? `${count} linked` : 'none yet'}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-[var(--p-ink-3)]">Counts of your linked entries. Clerkfolio never judges or predicts your application.</p>
    </div>
  )
}

export function CasesScreen() {
  return (
    <div className="px-4 pb-5 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-[16px] font-semibold">Cases</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--p-button)] text-[var(--p-on-button)]"><PlusIcon className="h-4 w-4" /></span>
      </div>
      <div className="mt-3 space-y-2">
        {[
          ['DKA in type 1 diabetes', 'Endocrinology', 'Jan 2025'],
          ['Anterior STEMI', 'Cardiology', 'Dec 2025'],
          ['Community-acquired pneumonia', 'Respiratory', 'Feb 2026'],
          ['Acute asthma', 'Paediatrics', 'Mar 2026'],
        ].map(([title, area, date]) => (
          <div key={title} className="rounded-xl border border-[var(--p-line)] px-3 py-2.5">
            <p className="text-[12.5px] font-semibold leading-snug">{title}</p>
            <p className="mt-0.5 flex justify-between text-[10.5px] text-[var(--p-ink-3)]"><span>{area}</span><span className={styles.mono}>{date}</span></p>
          </div>
        ))}
      </div>
      <p className="mt-3 flex gap-1.5 text-[10.5px] leading-snug text-[var(--p-teal-text)]">
        <LockIcon className="h-3.5 w-3.5" /> Anonymised. Cases are never shared.
      </p>
    </div>
  )
}

export function ShareMock() {
  return (
    <div className="p-5 sm:p-6">
      <p className="text-[16px] font-semibold">Share selected evidence</p>
      <p className="mt-1 text-[12.5px] text-[var(--p-ink-3)]">IMT 2026 · portfolio entries only</p>
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between rounded-lg border border-[var(--p-line)] px-3 py-2.5 text-[12.5px]">
          <span className="flex items-center gap-2"><LockIcon className="h-4 w-4 text-[var(--p-teal)]" /> PIN required</span>
          <span className={`${styles.mono} tracking-[0.3em] text-[var(--p-ink-3)]`}>••••••</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[var(--p-line)] px-3 py-2.5 text-[12.5px]">
          <span className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-[var(--p-teal)]" /> Expires</span>
          <span className={`${styles.mono} text-[var(--p-ink-2)]`}>14 Nov 2026</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[var(--p-line)] px-3 py-2.5 text-[12.5px]">
          <span className="flex items-center gap-2"><HeartIcon className="h-4 w-4 text-[var(--p-teal)]" /> Cases</span>
          <span className="text-[var(--p-ink-2)]">Never included</span>
        </div>
      </div>
      <p className="mt-5 text-[11.5px] font-semibold text-[var(--p-ink-3)]">Export your records</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {['PDF', 'Word', 'CSV', 'JSON', 'ZIP'].map(format => (
          <span key={format} className={`${styles.mono} rounded-md border border-[var(--p-line)] px-2.5 py-1 text-[12px] font-medium`}>{format}</span>
        ))}
      </div>
    </div>
  )
}

export function PortfolioPhoneScreen() {
  return (
    <div className="px-4 pb-5 pt-2">
      <p className="text-[16px] font-semibold">Portfolio</p>
      <p className="text-[11px] text-[var(--p-ink-3)]"><Count to={42} /> entries across 3 posts</p>
      <div className="mt-3 space-y-2">
        {ENTRIES.slice(0, 4).map(([title, category, tone, meta], index) => (
          <div key={title} className={`${styles.arrive} rounded-xl border border-[var(--p-line)] px-3 py-2.5`} style={{ '--i': index } as CSSProperties}>
            <p className="text-[12.5px] font-semibold leading-snug">{title}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="truncate text-[10.5px] text-[var(--p-ink-3)]">{meta.split(' · ')[0]}</span>
              <Pill tone={tone}>{category}</Pill>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CaseDetailScreen() {
  return (
    <div className="px-4 pb-5 pt-2">
      <div className="flex flex-wrap gap-1">
        <Pill tone="teal">Cardiology</Pill>
        <Pill>Dec 2025</Pill>
      </div>
      <p className="mt-2 text-[16px] font-semibold leading-snug">Anterior STEMI</p>
      <p className="mt-3 text-[10.5px] font-semibold text-[var(--p-ink-3)]">What I learned</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--p-ink-2)]">Door-to-balloon time, when to call the cath lab, and handing over clearly at night.</p>
      <p className="mt-3 text-[10.5px] font-semibold text-[var(--p-ink-3)]">Reflection</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--p-ink-2)]">Next time I will prepare the ECG and bloods before the call.</p>
      <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-[var(--p-blue-soft)] px-2.5 py-2 text-[10.5px] font-medium text-[var(--p-blue-text)]">
        <LinkIcon className="h-3.5 w-3.5" /> Linked as evidence for IMT 2026
      </p>
      <p className="mt-3 flex gap-1.5 text-[10.5px] leading-snug text-[var(--p-teal-text)]">
        <LockIcon className="h-3.5 w-3.5" /> Anonymised. Never shared.
      </p>
    </div>
  )
}

const IMPORTS: [string, string, string][] = [
  ['Horus portfolio export', 'CSV', '38 entries ready'],
  ['Your own spreadsheet', 'CSV', '12 entries ready'],
  ['Clerkfolio backup', 'JSON', 'Entries, cases and goals'],
]

export function ImportMock() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[18px] font-semibold tracking-[-0.01em]">Bring in your existing records</p>
        <Pill tone="blue">Bulk import on Pro</Pill>
      </div>
      <div className="mt-4 space-y-2">
        {IMPORTS.map(([source, format, status]) => (
          <div key={source} className="flex items-center gap-3 rounded-xl border border-[var(--p-line)] px-3.5 py-3">
            <span className={`${styles.mono} flex h-9 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--p-surface-2)] text-[11px] font-semibold text-[var(--p-ink-2)]`}>{format}</span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{source}</span>
            <Pill tone="teal">{status}</Pill>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-[var(--p-ink-3)]">Duplicates are skipped and dates are read day first, the UK way.</p>
    </div>
  )
}

export function PdfMock() {
  return (
    <div className="flex flex-col gap-4 bg-[var(--p-surface)] p-5 sm:flex-row sm:p-6">
      <div className="min-w-0 flex-1 rounded-lg bg-[var(--p-ground)] p-5 shadow-[var(--p-shadow-card)]">
        <p className="text-[11px] font-medium text-[var(--p-ink-3)]">Application portfolio</p>
        <p className="mt-1 text-[16px] font-semibold">Prepared for IMT 2026</p>
        {[['Quality improvement', [['VTE prophylaxis re-audit', 'Aug 2024'], ['Sepsis screening QIP', 'Sep 2026']]], ['Teaching', [['OSCE teaching, 3rd years', 'Nov 2024']]], ['Presentations', [['Grand round talk', 'Oct 2025']]]].map(([heading, items]) => (
          <div key={heading as string} className="mt-4">
            <p className="border-b border-[var(--p-line)] pb-1 text-[11.5px] font-semibold">{heading}</p>
            {(items as string[][]).map(([item, date]) => (
              <p key={item} className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-[var(--p-ink-2)]"><span className="truncate">{item}</span><span className={`${styles.mono} text-[var(--p-ink-3)]`}>{date}</span></p>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:w-[170px]">
        <span className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--p-button)] px-3 py-2 text-[12px] font-semibold text-[var(--p-on-button)]"><DownloadIcon className="h-3.5 w-3.5" /> Download PDF</span>
        <span className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--p-line)] bg-[var(--p-ground)] px-3 py-2 text-[12px] font-medium"><FileIcon className="h-3.5 w-3.5" /> Word (.docx)</span>
        <span className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--p-line)] bg-[var(--p-ground)] px-3 py-2 text-[12px] font-medium"><LinkIcon className="h-3.5 w-3.5" /> Share with a PIN</span>
      </div>
    </div>
  )
}

export { SpecialtyCard }
