import Link from 'next/link'

export const metadata = {
  title: 'Help & glossary - Clerkfolio',
}

type Term = { term: string; expansion?: string; description: string }

const ACRONYMS: Term[] = [
  { term: 'ARCP', expansion: 'Annual Review of Competency Progression', description: 'The yearly Foundation Programme review where a panel signs off your progression to the next year of training. Clerkfolio helps you organise evidence; it is not a Horus replacement.' },
  { term: 'Foundation Programme', description: 'Two-year UK postgraduate training programme (FY1 + FY2) that all UK medical graduates complete after qualifying.' },
  { term: 'CBD', expansion: 'Case-Based Discussion', description: 'A reflective discussion with a senior about a clinical case you managed. Used as a workplace-based assessment.' },
  { term: 'DOP', expansion: 'Directly Observed Procedure', description: 'A practical procedure (e.g. cannula, lumbar puncture) observed and assessed by a senior.' },
  { term: 'Mini-CEX', expansion: 'Mini Clinical Evaluation Exercise', description: 'A short (~15 minute) observed clinical encounter with structured feedback.' },
  { term: 'WBA', expansion: 'Workplace-Based Assessment', description: 'Umbrella term covering CBDs, DOPs, Mini-CEXs and similar formative assessments.' },
  { term: 'IMT', expansion: 'Internal Medicine Training', description: 'Three-year core programme leading into most physician specialty training (cardiology, gastro, respiratory, etc.).' },
  { term: 'CST', expansion: 'Core Surgical Training', description: 'Two-year core programme leading into surgical specialty training (general surgery, T&O, etc.).' },
  { term: 'ACCS', expansion: 'Acute Care Common Stem', description: 'Three-year core programme rotating through emergency medicine, acute medicine, anaesthetics and ICM.' },
  { term: 'ST1 / CT1', description: 'Specialty Training year 1 / Core Training year 1 - the first year of postgraduate specialty training after Foundation.' },
  { term: 'ST3+', description: 'Higher specialty training, applied for after completing core training (IMT/CST/ACCS).' },
  { term: 'GP ST', expansion: 'GP Specialty Training', description: 'Three-year GP training programme (GP ST1-ST3).' },
  { term: 'MRCP', expansion: 'Membership of the Royal Colleges of Physicians', description: 'The exam progression that physicians sit during IMT/specialty training.' },
  { term: 'NHS', expansion: 'National Health Service', description: 'The UK public healthcare system.' },
  { term: 'GMC', expansion: 'General Medical Council', description: 'UK regulator of medical practitioners.' },
  { term: 'MSRA', expansion: 'Multi-Specialty Recruitment Assessment', description: 'A computer-based exam used in selection for several specialties (GP, IMT, anaesthetics, EM, psychiatry, etc.).' },
  { term: 'QIP', expansion: 'Quality Improvement Project', description: 'A structured improvement effort with measurable outcomes - sits alongside audits in the portfolio.' },
  { term: 'CPD', expansion: 'Continuing Professional Development', description: 'Hours spent on educational activities (courses, conferences) that count towards revalidation.' },
]

const CONCEPTS: Term[] = [
  { term: 'Linked specialties', description: 'Specialties from your tracked applications that an entry can support (e.g. an audit might count for both IMT and GP). Stored as `specialty_tags`.' },
  { term: 'Competency themes', description: 'Cross-cutting interview themes (Leadership, Teaching, Communication, Audit & Quality Improvement, etc.) that an entry demonstrates. Add custom themes in Settings.' },
  { term: 'Clinical area', description: 'The medical setting an entry sits in (Cardiology, Geriatrics, A&E). Cases-only field, used for filtering.' },
  { term: 'Categories', description: 'Top-level entry types: Audit & QIP, Teaching & Presentations, Conferences & Courses, Publications & Research, Leadership & Societies, Prizes & Awards, Procedures & Clinical Skills, Reflections & CBDs/DOPs, Custom.' },
  { term: 'Snippets', description: 'Short reusable phrases you can drop into any portfolio note via a slash shortcut (e.g. /reflection).' },
  { term: 'Templates', description: 'Reusable entry shapes you can clone for new entries. Saved from existing entries via the "Template" button.' },
  { term: 'Goals vs deadlines', description: 'Goals are personal targets you set ("Complete 3 audits by FY1 end"). Deadlines are application/ARCP dates that can\'t slip - some are auto-loaded from your tracked specialties.' },
  { term: 'Auto-loaded deadlines', description: 'Deadlines that came from your tracked specialty config (e.g. IMT 2026 application opening). Marked with an "Auto" badge on the timeline.' },
]

const REFLECTION_FRAMEWORKS: Term[] = [
  { term: "Gibbs' Cycle", description: 'Six-step reflective cycle: Description, Feelings, Evaluation, Analysis, Conclusion, Action Plan. Most thorough; used heavily in nursing and undergraduate medical education.' },
  { term: 'Rolfe', description: 'Three-question model: What? / So What? / Now What? Concise; well-suited to quick post-shift reflection.' },
  { term: 'Driscoll', description: 'Same three questions as Rolfe (What? / So What? / Now What?) but framed for practical action-planning rather than research reflection.' },
]

function Section({ title, terms }: { title: string; terms: Term[] }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6 mb-6">
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">{title}</h2>
      <div className="space-y-4">
        {terms.map(term => (
          <div key={term.term}>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {term.term}
              {term.expansion && (
                <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
                  ({term.expansion})
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">{term.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function HelpPage() {
  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Help & glossary</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Acronyms, concepts, and the difference between the look-alikes (snippets vs templates,
          goals vs deadlines, themes vs specialties). If something is unclear, search this page or
          email <Link href="/contact" className="text-[var(--accent-text)] hover:underline">support</Link>.
        </p>
      </div>

      <Section title="Common acronyms" terms={ACRONYMS} />
      <Section title="Concepts in Clerkfolio" terms={CONCEPTS} />
      <Section title="Reflection frameworks" terms={REFLECTION_FRAMEWORKS} />

      <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">Keyboard shortcuts</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Open the command palette with <kbd className="rounded border border-white/[0.1] bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs">Cmd K</kbd> /
          {' '}<kbd className="rounded border border-white/[0.1] bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs">Ctrl K</kbd>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Shortcut keys="g d" label="Dashboard" />
          <Shortcut keys="g p" label="Portfolio" />
          <Shortcut keys="g c" label="Cases" />
          <Shortcut keys="g s" label="Specialties" />
          <Shortcut keys="g t" label="Timeline" />
          <Shortcut keys="g a" label="ARCP (FY1/FY2)" />
          <Shortcut keys="g e" label="Import & export" />
          <Shortcut keys="g i" label="Import portfolio" />
          <Shortcut keys="g r" label="Rotations & training" />
          <Shortcut keys="n" label="New portfolio entry" />
          <Shortcut keys="c" label="New case" />
          <Shortcut keys="?" label="This page" />
        </div>
      </section>
    </div>
  )
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[var(--bg-canvas)] px-3 py-2">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <kbd className="rounded border border-white/[0.1] bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-[var(--text-secondary)]">{keys}</kbd>
    </div>
  )
}
