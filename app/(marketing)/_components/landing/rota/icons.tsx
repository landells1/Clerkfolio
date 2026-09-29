import type { ReactNode } from 'react'

// One drawn icon family for the landing: 20px box, 1.75 stroke, round caps.
type IconProps = { className?: string }

function Icon({ className = '', children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-5 w-5 flex-shrink-0 ${className}`}
    >
      {children}
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return <Icon {...props}><path d="M4.5 10.5l3.5 3.5 7.5-8" /></Icon>
}

export function DashIcon(props: IconProps) {
  return <Icon {...props}><path d="M6 10h8" /></Icon>
}

export function PlusIcon(props: IconProps) {
  return <Icon {...props}><path d="M10 4v12M4 10h12" /></Icon>
}

export function ArrowIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 10h11M11 5.5L15.5 10 11 14.5" /></Icon>
}

export function LockIcon(props: IconProps) {
  return <Icon {...props}><rect x="4.5" y="9" width="11" height="8" rx="1" /><path d="M7 9V6.5a3 3 0 016 0V9" /></Icon>
}

export function ClockIcon(props: IconProps) {
  return <Icon {...props}><circle cx="10" cy="10" r="6.5" /><path d="M10 6.5V10l2.5 1.5" /></Icon>
}

export function MenuIcon({ open, ...props }: IconProps & { open: boolean }) {
  return (
    <Icon {...props}>
      {open ? <><path d="M5 5l10 10" /><path d="M15 5L5 15" /></> : <><path d="M3 6h14" /><path d="M3 10h14" /><path d="M3 14h14" /></>}
    </Icon>
  )
}

// The Clerkfolio mark (bars rising to a ticked sheet), redrawn for the rota
// palette: ink tile, ground-coloured bars, the tick in the selection green.
export function RotaLogo() {
  return (
    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-[var(--r-ink)]" aria-hidden="true">
      <svg viewBox="0 0 64 64" width="20" height="20" fill="none">
        <rect x="8" y="32" width="9" height="24" fill="var(--r-ground)" fillOpacity="0.55" />
        <rect x="20" y="26" width="9" height="30" fill="var(--r-ground)" fillOpacity="0.7" />
        <rect x="32" y="20" width="9" height="36" fill="var(--r-ground)" fillOpacity="0.85" />
        <rect x="44" y="12" width="14" height="44" fill="var(--r-ground)" />
        <path d="M47.5 34l4 4 4.5-10" stroke="var(--r-select)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
