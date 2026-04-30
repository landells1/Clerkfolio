import { DomainPill, SpecialtyPill } from './pills'

export function FloatingCaseCard() {
  return (
    <div className="w-[280px] rounded-xl border border-white/[0.15] bg-[#141416] p-3.5 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-accent">◉ Case logged · 2h ago</div>
      <div className="mb-2 text-[13px] font-medium">STEMI - anterior, primary PCI</div>
      <div className="mb-2 flex gap-1.5"><DomainPill>Cardiology</DomainPill><SpecialtyPill>IMT</SpecialtyPill></div>
      <p className="text-[11px] leading-5 text-ink-soft">Door-to-balloon 38 min. Followed up on CCU.</p>
    </div>
  )
}
