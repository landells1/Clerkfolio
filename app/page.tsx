import Link from 'next/link'
import type { CSSProperties } from 'react'

// ─── Design tokens ────────────────────────────────────────────────────────────

const pal = {
  bg:        '#0B0B0C',
  bgPanel:   '#141416',
  bgPanelHi: '#1B1B1E',
  ink:       '#F5F5F2',
  inkSoft:   'rgba(245,245,242,0.55)',
  inkDim:    'rgba(245,245,242,0.35)',
  rule:      'rgba(245,245,242,0.08)',
  ruleHi:    'rgba(245,245,242,0.15)',
  accent:    'oklch(0.82 0.13 195)',
  accentDim: 'oklch(0.82 0.13 195 / 0.15)',
  warn:      'oklch(0.85 0.13 85)',
}

const font = {
  sans: '"Geist", "Inter", -apple-system, system-ui, sans-serif',
  mono: '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage({ searchParams }: { searchParams?: { deleted?: string } }) {
  const wasDeleted = searchParams?.deleted === 'true'
  return (
    <div style={{ background: pal.bg, color: pal.ink, fontFamily: font.sans, minHeight: '100vh', overflowX: 'hidden' }}>
      {wasDeleted && (
        <div style={{
          background: 'rgba(29,158,117,0.12)',
          borderBottom: '1px solid rgba(29,158,117,0.25)',
          padding: '12px 56px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 14,
          color: 'oklch(0.82 0.13 195)',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Your account has been permanently deleted. Sorry to see you go.
        </div>
      )}
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Founders />
      <CtaFooter />
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 56px',
      borderBottom: `1px solid ${pal.rule}`,
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(11,11,12,0.85)', backdropFilter: 'blur(10px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Logo />
          <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: -0.3 }}>Clinidex</span>
          <span style={{ fontFamily: font.mono, fontSize: 11, color: pal.inkDim, marginLeft: 6, padding: '2px 6px', border: `1px solid ${pal.rule}`, borderRadius: 3 }}>v0.1</span>
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 13, color: pal.inkSoft }}>
          <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Product</a>
          <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Specialties</a>
          <a href="#how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>How it works</a>
          <a href="#founders" style={{ color: 'inherit', textDecoration: 'none' }}>Founders</a>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/login" style={{ fontSize: 13, color: pal.inkSoft, textDecoration: 'none' }}>Log in</Link>
        <Link href="/signup" style={{
          background: pal.accent, color: pal.bg,
          padding: '9px 16px', fontSize: 13, fontWeight: 600,
          fontFamily: font.sans, borderRadius: 6, textDecoration: 'none',
          display: 'inline-block',
        }}>Start free →</Link>
      </div>
    </nav>
  )
}

function Logo() {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: 5,
      background: `linear-gradient(135deg, ${pal.accent} 0%, oklch(0.7 0.13 210) 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: pal.bg, fontSize: 14, fontWeight: 700, fontFamily: font.mono,
    }}>C</div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{ padding: '80px 56px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: font.mono, fontSize: 11, color: pal.inkDim, letterSpacing: 1.5, marginBottom: 40 }}>
        <span>§ 001</span>
        <span style={{ width: 24, height: 1, background: pal.rule }} />
        <span>INDEX / HOME</span>
        <span style={{ width: 24, height: 1, background: pal.rule }} />
        <span style={{ color: pal.accent }}>◉ EARLY ACCESS · FREE</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 560px', gap: 80, alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(54px, 6vw, 88px)', lineHeight: 1.02, letterSpacing: -3.2, fontWeight: 500, margin: 0 }}>
            The portfolio<br />
            that keeps up<br />
            with your<br />
            <span style={{
              background: `linear-gradient(100deg, ${pal.accent} 0%, oklch(0.7 0.13 250) 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              fontStyle: 'italic', fontWeight: 400,
            }}>whole career.</span>
          </h1>

          <p style={{ fontSize: 19, lineHeight: 1.5, color: pal.inkSoft, maxWidth: 520, marginTop: 36, marginBottom: 40 }}>
            Log cases, procedures, reflections and achievements. Attach every certificate,
            paper and audit. Export exactly what you need, for every application — from
            med school to consultant post.
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/signup" style={{ background: pal.accent, color: pal.bg, padding: '14px 24px', fontSize: 14, fontWeight: 600, fontFamily: font.sans, borderRadius: 8, textDecoration: 'none', display: 'inline-block' }}>
              Create your portfolio →
            </Link>
            <a href="#how-it-works" style={{ background: 'transparent', color: pal.ink, border: `1px solid ${pal.ruleHi}`, padding: '14px 24px', fontSize: 14, fontWeight: 500, fontFamily: font.sans, borderRadius: 8, textDecoration: 'none', display: 'inline-block' }}>
              See how it works
            </a>
          </div>

          <div style={{ marginTop: 32, display: 'flex', gap: 20, fontFamily: font.mono, fontSize: 11, color: pal.inkDim, letterSpacing: 0.5 }}>
            <span>◆ UK-hosted · London</span>
            <span>◆ AES-256 encrypted</span>
            <span>◆ Your data, always exportable</span>
          </div>
        </div>

        <ProductVisual />
      </div>
    </section>
  )
}

function ProductVisual() {
  return (
    <div style={{ position: 'relative', width: 620, height: 640 }}>
      {/* Main window */}
      <div style={{
        position: 'absolute', top: 30, left: 0, width: 420, height: 580,
        background: pal.bgPanel, border: `1px solid ${pal.rule}`,
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
      }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${pal.rule}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: 5, background: c, opacity: 0.8 }} />)}
          </div>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: pal.inkDim, fontFamily: font.mono }}>clinidex.app · cases · entry</div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: font.mono, fontSize: 10, color: pal.inkDim, letterSpacing: 1.2, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <span style={{ opacity: 0.7 }}>CASES</span><span style={{ opacity: 0.3 }}>/</span><span style={{ color: pal.accent }}>ACUTE MEDICINE</span>
          </div>
          <h4 style={{ fontSize: 19, fontWeight: 500, margin: 0, letterSpacing: -0.4, lineHeight: 1.25 }}>
            DKA in a newly-diagnosed<br />T1DM — 72yo
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, fontSize: 12, color: pal.inkSoft }}>
            <span style={{ fontFamily: font.mono, color: pal.inkDim }}>14 Mar 2026</span>
            <span style={{ opacity: 0.3 }}>•</span>
            <span>RAU / Dr Okafor</span>
            <span style={{ opacity: 0.3 }}>•</span>
            <span>Role: Primary</span>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 14 }}>
            {['#acute-med','#endocrine','#reflection-linked','#capability-3.2'].map(t => (
              <span key={t} style={{ fontFamily: font.mono, fontSize: 10, padding: '3px 8px', background: pal.bgPanelHi, color: pal.inkSoft, borderRadius: 4, border: `1px solid ${pal.rule}` }}>{t}</span>
            ))}
          </div>
          <div style={{ marginTop: 22, display: 'grid', gap: 16 }}>
            <div>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: pal.inkDim, letterSpacing: 1.5, marginBottom: 8 }}>SUMMARY</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: pal.inkSoft }}>
                72F, 4-day history of polyuria and malaise. Presented with ketones 5.8, pH 7.12,
                glucose 32. Variable-rate insulin, fluids per Trust protocol, K⁺ replacement. Resolved at 18h.
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <LinkedCard kind="REFLECTION" title={`"Would've started insulin sooner…"`} />
              <LinkedCard kind="ATTACHMENT" title="ABG-trend.pdf · clerking.docx" />
            </div>
          </div>
          <div style={{ marginTop: 24, paddingTop: 14, borderTop: `1px solid ${pal.rule}`, display: 'flex', gap: 8, alignItems: 'center' }}>
            <ToolbarBtn>Edit</ToolbarBtn>
            <ToolbarBtn>Duplicate</ToolbarBtn>
            <ToolbarBtn>Add reflection</ToolbarBtn>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: font.mono, fontSize: 10, color: pal.inkDim }}>last edit • 2h ago</span>
          </div>
        </div>
      </div>

      {/* Floating: procedure */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 210, background: pal.bgPanel, border: `1px solid ${pal.ruleHi}`, borderRadius: 10, padding: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: font.mono, fontSize: 10, color: pal.accent, letterSpacing: 1, marginBottom: 10 }}>◉ LINKED PROCEDURE</div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Radial A-line</div>
        <div style={{ fontSize: 11, color: pal.inkSoft, marginBottom: 12 }}>USS-guided · first pass</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <MiniStat label="ROLE" value="Solo" />
          <MiniStat label="SUPERVISION" value="Indirect" />
        </div>
        <div style={{ paddingTop: 10, borderTop: `1px solid ${pal.rule}`, fontFamily: font.mono, fontSize: 10, color: pal.inkDim }}>⌘↵ saves · auto-links to parent case</div>
      </div>

      {/* Floating: reflection */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 240, background: pal.bgPanel, border: `1px solid ${pal.ruleHi}`, borderRadius: 10, padding: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: pal.accentDim, color: pal.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Reflection linked</div>
        </div>
        <div style={{ fontSize: 11, color: pal.inkSoft, lineHeight: 1.5, fontStyle: 'italic' }}>
          &ldquo;Second DKA this month. Want to be more confident with the insulin infusion titration…&rdquo;
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${pal.rule}`, display: 'flex', justifyContent: 'space-between', fontFamily: font.mono, fontSize: 10, color: pal.inkDim }}>
          <span>draft • 2 min</span>
          <span style={{ color: pal.accent }}>publish →</span>
        </div>
      </div>
    </div>
  )
}

function LinkedCard({ kind, title }: { kind: string; title: string }) {
  return (
    <div style={{ background: pal.bgPanelHi, border: `1px solid ${pal.rule}`, borderRadius: 6, padding: '10px 12px' }}>
      <div style={{ fontFamily: font.mono, fontSize: 9, color: pal.accent, letterSpacing: 1.2, marginBottom: 4 }}>{kind}</div>
      <div style={{ fontSize: 11, color: pal.ink, lineHeight: 1.35 }}>{title}</div>
    </div>
  )
}

function ToolbarBtn({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ padding: '5px 10px', fontSize: 11, border: `1px solid ${pal.rule}`, borderRadius: 5, color: pal.inkSoft, background: pal.bgPanelHi }}>{children}</span>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: pal.bgPanelHi, border: `1px solid ${pal.rule}`, borderRadius: 4, padding: '5px 8px' }}>
      <div style={{ fontFamily: font.mono, fontSize: 9, color: pal.inkDim, letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 11, marginTop: 2 }}>{value}</div>
    </div>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  return (
    <section id="features" style={{ padding: '140px 56px 60px' }}>
      <SectionHeader number="§ 002" label="FEATURES" title="Built like a reference system." sub="Every entry indexed, tagged, retrievable. Nothing buried. Nothing lost between rotations." />
      <div style={{ marginTop: 80, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <FeatureCard tag="01 / CAPTURE"    title="Log it between patients"              body="Voice-dictate on the walk back from theatre. One-tap templates. Offline-safe — it syncs when you're back on wifi."                                                                                                                              visual={<MockMobileVoice />} large />
        <FeatureCard tag="02 / INSIGHTS"   title="See the shape of your training"       body="A live picture of what you've done — specialty, supervision level, curriculum domain. Notice the gaps before ARCP does."                                                                                                                        visual={<MockInsights />}    large />
        <FeatureCard tag="03 / CHECKLISTS" title="Checklists for the bits that are scored" body="Where specialties publish defined requirements — MSRA, ARCP evidence, specialty application self-assessments — tick them off as you go. Honest about what can't be scored; useful where it can."                                             visual={<MockChecklists />}       />
        <FeatureCard tag="04 / SHARE"      title="A link your consultant can open"      body="Build a filtered view from any tag combination. Share as a live link, a PDF, or a zip — with an expiry, a passphrase, or both."                                                                                                                 visual={<MockShareLink />}        />
        <FeatureCard tag="05 / MOMENTUM"   title="Keep the record alive"                body="An honest feed of your week — what you logged, what's pending, what's empty. No streaks theatre. Just prompts that help you stay on top."                                                                                                       visual={<MockActivity />}  span={2} />
      </div>
    </section>
  )
}

function SectionHeader({ number, label, title, sub }: { number: string; label: string; title: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontFamily: font.mono, fontSize: 11, color: pal.inkDim, letterSpacing: 1.5, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>{number}</span>
        <span style={{ width: 24, height: 1, background: pal.rule }} />
        <span>{label}</span>
      </div>
      <h2 style={{ fontSize: 'clamp(36px, 4vw, 56px)', lineHeight: 1.02, letterSpacing: -1.6, fontWeight: 500, margin: 0, maxWidth: 900 }}>{title}</h2>
      {sub && <p style={{ fontSize: 18, lineHeight: 1.5, color: pal.inkSoft, maxWidth: 640, marginTop: 20, marginBottom: 0 }}>{sub}</p>}
    </div>
  )
}

function FeatureCard({ tag, title, body, visual, large, span }: { tag: string; title: string; body: string; visual: React.ReactNode; large?: boolean; span?: number }) {
  const wide = span === 2
  return (
    <div style={{
      gridColumn: wide ? 'span 2' : 'span 1',
      background: pal.bgPanel, border: `1px solid ${pal.rule}`, borderRadius: 14, padding: 32,
      display: wide ? 'grid' : 'flex',
      gridTemplateColumns: wide ? '1fr 1.4fr' : undefined,
      gap: wide ? 40 : 24,
      flexDirection: wide ? undefined : 'column',
      minHeight: wide ? 360 : (large ? 520 : 440),
      alignItems: wide ? 'stretch' : undefined,
    }}>
      <div style={wide ? { display: 'flex', flexDirection: 'column', justifyContent: 'center' } : undefined}>
        <div style={{ fontFamily: font.mono, fontSize: 11, color: pal.accent, letterSpacing: 1, marginBottom: 16 }}>{tag}</div>
        <h3 style={{ fontSize: 26, letterSpacing: -0.6, fontWeight: 500, margin: 0, lineHeight: 1.15 }}>{title}</h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: pal.inkSoft, marginTop: 12, marginBottom: 0 }}>{body}</p>
      </div>
      <div style={{ flex: wide ? undefined : 1, minHeight: 0 }}>{visual}</div>
    </div>
  )
}

function MockPanel({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: pal.bg, border: `1px solid ${pal.rule}`, borderRadius: 8, padding: 14, height: '100%', boxSizing: 'border-box', ...style }}>
      {children}
    </div>
  )
}

function Pill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span style={{ padding: '2px 7px', fontSize: 10, fontFamily: font.mono, borderRadius: 3, background: accent ? pal.accentDim : pal.bgPanel, color: accent ? pal.accent : pal.inkSoft, border: `1px solid ${pal.rule}` }}>
      {children}
    </span>
  )
}

function MockMobileVoice() {
  return (
    <MockPanel style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
      <div style={{ width: 210, margin: '16px 0 16px 20px', background: '#050506', border: `2px solid ${pal.ruleHi}`, borderRadius: 28, padding: 8, boxShadow: '0 12px 40px rgba(0,0,0,0.6)', flexShrink: 0 }}>
        <div style={{ background: pal.bgPanel, border: `1px solid ${pal.rule}`, borderRadius: 22, padding: '26px 14px 14px', position: 'relative', height: 360 }}>
          <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 60, height: 6, background: '#000', borderRadius: 4 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: font.mono, fontSize: 9, color: pal.inkDim, marginBottom: 16 }}>
            <span>CLINIDEX</span><span style={{ color: pal.accent }}>◉ REC</span>
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: pal.inkDim, letterSpacing: 1, marginBottom: 6 }}>DICTATING…</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: pal.ink }}>
            &ldquo;First assistant for a lap chole with Mr Haleem. <span style={{ color: pal.accent }}>Straightforward, clipped cystic artery…</span><span style={{ color: pal.inkDim, opacity: 0.6 }}>▋</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center', marginTop: 20, height: 38 }}>
            {[6,14,22,10,28,18,32,14,22,10,26,16,30,12,22,8,18,10,6].map((h, i) => (
              <div key={i} style={{ width: 2, height: h, background: pal.accent, opacity: 0.4 + (i / 30), borderRadius: 1 }} />
            ))}
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: pal.inkDim, textAlign: 'center', marginTop: 6 }}>00:07</div>
          <div style={{ marginTop: 20, fontFamily: font.mono, fontSize: 9, color: pal.inkDim, letterSpacing: 1, marginBottom: 6 }}>AUTO-TAGS</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Pill accent>surgery</Pill><Pill accent>hpb</Pill><Pill accent>1st asst</Pill>
          </div>
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, background: pal.accent, color: pal.bg, textAlign: 'center', padding: '9px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            Stop &amp; save
          </div>
        </div>
      </div>
      <div style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {([
          ['→ ON-DEVICE',       'Captures even without signal. Syncs when you\'re back.'],
          ['→ AUTO-STRUCTURED', 'Extracts role, specialty, supervision — you edit if wrong.'],
          ['→ 30 SECONDS',      'From "open app" to "entry saved". Shorter than a bleep.'],
        ] as [string, string][]).map(([lbl, desc]) => (
          <div key={lbl}>
            <div style={{ fontFamily: font.mono, fontSize: 10, color: pal.accent, letterSpacing: 1 }}>{lbl}</div>
            <div style={{ fontSize: 12, color: pal.inkSoft, marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>
    </MockPanel>
  )
}

function MockInsights() {
  const domains = [
    { label: 'Acute medicine',  pct: 34, count: 62 },
    { label: 'General surgery', pct: 22, count: 40 },
    { label: 'Cardiology',      pct: 16, count: 29 },
    { label: 'Respiratory',     pct: 12, count: 22 },
    { label: 'Endocrine',       pct: 8,  count: 15 },
    { label: 'Other',           pct: 8,  count: 14 },
  ]
  return (
    <MockPanel>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontFamily: font.mono, fontSize: 10, color: pal.inkDim, letterSpacing: 1 }}>
        <span>CLINICAL BREADTH · LAST 12 MO</span>
        <span style={{ color: pal.accent }}>182 entries</span>
      </div>
      <div style={{ height: 28, display: 'flex', borderRadius: 4, overflow: 'hidden', border: `1px solid ${pal.rule}`, marginBottom: 18 }}>
        {domains.map((d, i) => (
          <div key={i} style={{ width: `${d.pct}%`, background: `oklch(${0.62 - i * 0.05} ${0.12 - i * 0.015} ${195 - i * 14})`, borderRight: i < domains.length - 1 ? `1px solid ${pal.bg}` : 'none' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {domains.map((d, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '10px 1fr 36px 40px', gap: 10, alignItems: 'center', fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: `oklch(${0.62 - i * 0.05} ${0.12 - i * 0.015} ${195 - i * 14})` }} />
            <span style={{ color: pal.inkSoft }}>{d.label}</span>
            <span style={{ fontFamily: font.mono, color: pal.inkDim, textAlign: 'right', fontSize: 10 }}>{d.count}</span>
            <span style={{ fontFamily: font.mono, color: pal.ink, textAlign: 'right', fontSize: 10 }}>{d.pct}%</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '10px 12px', background: 'oklch(0.25 0.08 60 / 0.3)', border: '1px solid oklch(0.55 0.13 60)', borderRadius: 5, fontSize: 11, color: 'oklch(0.8 0.14 60)', fontFamily: font.mono, lineHeight: 1.4 }}>
        ▲ Gap flagged — no paediatric entries this year.
      </div>
    </MockPanel>
  )
}

function MockChecklists() {
  const items = [
    { n: 'MSRA · Clinical Problem Solving',   done: true  },
    { n: 'Self-assessment · Communication',   done: true  },
    { n: 'Evidence · Leadership role',        done: true  },
    { n: 'Evidence · QIP completed',          done: false, pri: true },
    { n: 'Evidence · Teaching qualification', done: false },
    { n: 'Self-assessment · Commitment',      done: false },
  ]
  return (
    <MockPanel>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontFamily: font.mono, fontSize: 10, color: pal.inkDim, letterSpacing: 1 }}>
        <span>IMT APPLICATION · 2027</span>
        <span style={{ color: pal.accent }}>3 / 6</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((c, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '14px 1fr auto', alignItems: 'center', gap: 10, padding: '7px 10px', background: pal.bgPanelHi, border: `1px solid ${pal.rule}`, borderRadius: 5, fontSize: 11 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, border: `1px solid ${pal.ruleHi}`, background: c.done ? pal.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: pal.bg, fontSize: 9 }}>{c.done ? '✓' : ''}</div>
            <span style={{ color: c.done ? pal.inkSoft : pal.ink, textDecoration: c.done ? 'line-through' : 'none', opacity: c.done ? 0.7 : 1 }}>{c.n}</span>
            {c.pri && <span style={{ fontFamily: font.mono, fontSize: 9, color: pal.warn, letterSpacing: 1 }}>PRIORITY</span>}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontFamily: font.mono, fontSize: 10, color: pal.inkDim, lineHeight: 1.5 }}>
        Checklists for specialties that publish defined criteria.
      </div>
    </MockPanel>
  )
}

function MockShareLink() {
  return (
    <MockPanel style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: pal.bg, borderBottom: `1px solid ${pal.rule}` }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 7, height: 7, borderRadius: 4, background: c, opacity: 0.7 }} />)}
        </div>
        <div style={{ flex: 1, fontFamily: font.mono, fontSize: 10, color: pal.inkSoft, background: pal.bgPanelHi, padding: '3px 8px', borderRadius: 4, border: `1px solid ${pal.rule}`, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: pal.accent }}>◉</span>
          <span>cx.app/s/dr-okafor/cardio</span>
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontFamily: font.mono, fontSize: 9, color: pal.inkDim, letterSpacing: 1.2 }}>SHARED PORTFOLIO · READ-ONLY</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>Dr I. Okafor — Cardiology Application</div>
        <div style={{ fontSize: 11, color: pal.inkDim, marginTop: 2, fontFamily: font.mono }}>curated from 312 items • 6 tags applied</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 12 }}>
          {[['Cases','cardiology'],['Procedures','cardiology'],['Audits & QIP','2 complete'],['Reflections','flagged'],['Teaching','regional'],['Publications','first-author']].map(([t, s], i) => (
            <div key={i} style={{ background: pal.bgPanelHi, border: `1px solid ${pal.rule}`, borderRadius: 4, padding: '7px 9px' }}>
              <div style={{ fontSize: 11 }}>{t}</div>
              <div style={{ fontSize: 9, fontFamily: font.mono, color: pal.accent, marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: 10, background: pal.bgPanelHi, border: `1px solid ${pal.rule}`, borderRadius: 5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10 }}>
          <div><div style={{ fontFamily: font.mono, color: pal.inkDim, letterSpacing: 1 }}>EXPIRES</div><div style={{ marginTop: 2 }}>in 14 days</div></div>
          <div><div style={{ fontFamily: font.mono, color: pal.inkDim, letterSpacing: 1 }}>PASSPHRASE</div><div style={{ marginTop: 2, fontFamily: font.mono }}>••••••••</div></div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, background: pal.accent, color: pal.bg, padding: '6px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, textAlign: 'center' }}>Copy link</div>
          <div style={{ background: pal.bgPanelHi, border: `1px solid ${pal.rule}`, color: pal.inkSoft, padding: '6px 10px', borderRadius: 4, fontSize: 11, textAlign: 'center' }}>Download PDF</div>
        </div>
      </div>
    </MockPanel>
  )
}

function MockActivity() {
  const week = [2, 4, 3, 6, 1, 0, 3]
  const max = 6
  const days = ['M','T','W','T','F','S','S']
  const feed = [
    { t: '2h ago', k: 'CASE',       m: 'DKA — T1DM, resolved 18h' },
    { t: '5h ago', k: 'PROCEDURE',  m: 'Radial A-line, USS' },
    { t: 'yday',   k: 'REFLECTION', m: 'Breaking bad news — father of four' },
    { t: 'yday',   k: 'TEACHING',   m: 'ABG interp — F1 induction' },
  ]
  return (
    <MockPanel>
      <div style={{ fontFamily: font.mono, fontSize: 10, color: pal.inkDim, letterSpacing: 1, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
        <span>THIS WEEK</span><span style={{ color: pal.accent }}>19 entries</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, alignItems: 'end', height: 70, marginBottom: 4 }}>
        {week.map((v, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', height: `${Math.max(3, (v / max) * 100)}%`, background: v === 0 ? pal.bgPanelHi : pal.accent, border: v === 0 ? `1px dashed ${pal.rule}` : 'none', borderRadius: 3, opacity: v === 0 ? 0.6 : (0.4 + v / max * 0.6) }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontFamily: font.mono, fontSize: 9, color: pal.inkDim, textAlign: 'center', marginBottom: 14 }}>
        {days.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {feed.map((f, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 70px 1fr', gap: 8, padding: '5px 0', borderTop: i > 0 ? `1px solid ${pal.rule}` : 'none', alignItems: 'center' }}>
            <span style={{ fontFamily: font.mono, fontSize: 9, color: pal.inkDim }}>{f.t}</span>
            <span style={{ fontFamily: font.mono, fontSize: 9, color: pal.accent, letterSpacing: 1 }}>{f.k}</span>
            <span style={{ fontSize: 11, color: pal.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.m}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, padding: '8px 10px', background: pal.bgPanelHi, border: `1px solid ${pal.rule}`, borderRadius: 4, fontSize: 11, color: pal.inkSoft, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: pal.accent, fontFamily: font.mono }}>→</span>
        <span>Saturday is empty. Anything from the on-call?</span>
      </div>
    </MockPanel>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { n: '01', t: 'Log',    d: 'Add cases, procedures, reflections from phone or desktop. Templates by specialty. Offline-safe.' },
    { n: '02', t: 'Tag',    d: 'Apply specialty, curriculum domain, supervisor. Auto-suggested from your past entries.' },
    { n: '03', t: 'Check',  d: 'Tick off application checklists for specialties that publish defined criteria — MSRA, ARCP, IMT and more.' },
    { n: '04', t: 'Export', d: 'Assemble exactly the slice you need. PDF, zip, share link, all in under a minute.' },
  ]
  return (
    <section id="how-it-works" style={{ padding: '140px 56px', borderTop: `1px solid ${pal.rule}`, background: pal.bgPanel }}>
      <SectionHeader number="§ 003" label="HOW IT WORKS" title="Four moves. Repeat forever." />
      <div style={{ marginTop: 80, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: pal.rule, border: `1px solid ${pal.rule}`, borderRadius: 12, overflow: 'hidden' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ background: pal.bgPanel, padding: 36, minHeight: 260, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: pal.accent, letterSpacing: 1, marginBottom: 28 }}>{s.n}</div>
            <h3 style={{ fontSize: 36, fontWeight: 500, letterSpacing: -0.8, margin: 0, marginBottom: 18 }}>{s.t}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: pal.inkSoft, margin: 0 }}>{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Founders ─────────────────────────────────────────────────────────────────

function Founders() {
  return (
    <section id="founders" style={{ padding: '140px 56px' }}>
      <SectionHeader number="§ 004" label="FOUNDERS" title="Built by the people who actually use it." />
      <div style={{ marginTop: 60, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <FounderCard name="Dr [Name]" role="Co-founder · Internal Medicine Trainee" hospital="Royal London Hospital" quote="I wasted weeks every application cycle stitching my portfolio back together. Clinidex is the thing I wished existed in FY1." />
        <FounderCard name="Dr [Name]" role="Co-founder · Core Surgical Trainee"    hospital="Guy's & St Thomas'"    quote="Your career should leave a trail. We built Clinidex so it actually does — in a form you can hand over, share, and own." />
      </div>
      <div style={{ marginTop: 60, padding: 28, background: pal.bgPanel, border: `1px solid ${pal.rule}`, borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {([
          ['UK-hosted',    'London data-centre, ISO 27001'],
          ['AES-256',      'Encrypted at rest and in transit'],
          ['GDPR-aligned', 'Your data, exportable at any time'],
          ['Independent',  'Not affiliated with NHS or Royal Colleges'],
        ] as [string, string][]).map(([t, d], i) => (
          <div key={i}>
            <div style={{ fontFamily: font.mono, fontSize: 12, color: pal.accent, letterSpacing: 1, marginBottom: 6 }}>◆ {t.toUpperCase()}</div>
            <div style={{ fontSize: 13, color: pal.inkSoft, lineHeight: 1.5 }}>{d}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FounderCard({ name, role, hospital, quote }: { name: string; role: string; hospital: string; quote: string }) {
  return (
    <div style={{ background: pal.bgPanel, border: `1px solid ${pal.rule}`, borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 28, background: `linear-gradient(135deg, ${pal.bgPanelHi}, ${pal.bg})`, border: `1px solid ${pal.rule}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.mono, fontSize: 10, color: pal.inkDim, letterSpacing: 1 }}>DR</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 12, color: pal.inkSoft, marginTop: 2 }}>{role}</div>
          <div style={{ fontSize: 11, color: pal.inkDim, marginTop: 2, fontFamily: font.mono }}>{hospital}</div>
        </div>
      </div>
      <p style={{ fontSize: 17, lineHeight: 1.45, color: pal.ink, margin: 0, letterSpacing: -0.2 }}>&ldquo;{quote}&rdquo;</p>
    </div>
  )
}

// ─── CTA / Footer ─────────────────────────────────────────────────────────────

function CtaFooter() {
  return (
    <section style={{ padding: '120px 56px 40px', borderTop: `1px solid ${pal.rule}`, background: `linear-gradient(180deg, ${pal.bg}, oklch(0.2 0.04 195 / 0.1))`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontFamily: font.mono, fontSize: 11, color: pal.accent, letterSpacing: 1.5, marginBottom: 24 }}>§ 005 · BEGIN</div>
        <h2 style={{ fontSize: 'clamp(56px, 7vw, 104px)', lineHeight: 1, letterSpacing: -3.6, fontWeight: 500, margin: 0 }}>
          Start the<br />
          <span style={{ background: `linear-gradient(100deg, ${pal.accent}, oklch(0.7 0.13 260))`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontStyle: 'italic', fontWeight: 400 }}>
            record you&apos;ll keep.
          </span>
        </h2>
        <p style={{ fontSize: 19, color: pal.inkSoft, marginTop: 32, marginBottom: 40, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
          Free during early access. No credit card. Your portfolio, portable for as long as you&apos;re a doctor.
        </p>
        <Link href="/signup" style={{ display: 'inline-block', background: pal.accent, color: pal.bg, padding: '18px 36px', fontSize: 15, fontWeight: 600, fontFamily: font.sans, borderRadius: 10, textDecoration: 'none' }}>
          Create your portfolio — free →
        </Link>
      </div>

      <div style={{ marginTop: 120, paddingTop: 28, borderTop: `1px solid ${pal.rule}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: font.mono, fontSize: 11, color: pal.inkDim, letterSpacing: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo />
          <span>CLINIDEX · § 2026</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>PRIVACY</Link>
          <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>TERMS</Link>
          <a href="mailto:hello@clinidex.co.uk" style={{ color: 'inherit', textDecoration: 'none' }}>CONTACT</a>
        </div>
      </div>
    </section>
  )
}
