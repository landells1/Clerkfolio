import type { ReactNode } from 'react'

type IconProps = { className?: string }

// One drawn icon family: 20px box, 1.75 stroke, round caps and joins.
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

export const CheckIcon = (p: IconProps) => <Icon {...p}><path d="M4.5 10.5l3.5 3.5 7.5-8" /></Icon>
export const ArrowIcon = (p: IconProps) => <Icon {...p}><path d="M4 10h11M11 5.5L15.5 10 11 14.5" /></Icon>
export const ArrowDownIcon = (p: IconProps) => <Icon {...p}><path d="M10 4v11M5.5 11L10 15.5 14.5 11" /></Icon>
export const PlusIcon = (p: IconProps) => <Icon {...p}><path d="M10 4v12M4 10h12" /></Icon>
export const ClockIcon = (p: IconProps) => <Icon {...p}><circle cx="10" cy="10" r="6.75" /><path d="M10 6.5V10l2.5 1.5" /></Icon>
export const LockIcon = (p: IconProps) => <Icon {...p}><rect x="4.5" y="9" width="11" height="8" rx="1.75" /><path d="M7 9V6.5a3 3 0 016 0V9" /></Icon>
export const LinkIcon = (p: IconProps) => <Icon {...p}><path d="M8.5 11.5a3 3 0 004.2 0l2.4-2.4a3 3 0 00-4.2-4.2l-.9.9" /><path d="M11.5 8.5a3 3 0 00-4.2 0l-2.4 2.4a3 3 0 004.2 4.2l.9-.9" /></Icon>
export const DownloadIcon = (p: IconProps) => <Icon {...p}><path d="M10 3.5v9M6 9l4 4 4-4" /><path d="M4 15.5h12" /></Icon>
export const FileIcon = (p: IconProps) => <Icon {...p}><path d="M6 3h5.5L15 6.5V16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M11 3v4h4" /></Icon>
export const SearchIcon = (p: IconProps) => <Icon {...p}><circle cx="9" cy="9" r="5" /><path d="M13 13l3.5 3.5" /></Icon>
export const ShieldIcon = (p: IconProps) => <Icon {...p}><path d="M10 3l5.5 2v4.5c0 3.5-2.4 6-5.5 7-3.1-1-5.5-3.5-5.5-7V5L10 3z" /></Icon>
export const GridIcon = (p: IconProps) => <Icon {...p}><rect x="3.5" y="3.5" width="5" height="5" rx="1" /><rect x="11.5" y="3.5" width="5" height="5" rx="1" /><rect x="3.5" y="11.5" width="5" height="5" rx="1" /><rect x="11.5" y="11.5" width="5" height="5" rx="1" /></Icon>
export const FolderIcon = (p: IconProps) => <Icon {...p}><path d="M3.5 6a1 1 0 011-1h3.5l1.5 1.5h6a1 1 0 011 1V15a1 1 0 01-1 1h-11a1 1 0 01-1-1V6z" /></Icon>
export const HeartIcon = (p: IconProps) => <Icon {...p}><path d="M10 16s-6-3.6-6-8a3.2 3.2 0 016-1.6A3.2 3.2 0 0116 8c0 4.4-6 8-6 8z" /></Icon>
export const TargetIcon = (p: IconProps) => <Icon {...p}><circle cx="10" cy="10" r="6.5" /><circle cx="10" cy="10" r="3" /></Icon>
export const CalendarIcon = (p: IconProps) => <Icon {...p}><rect x="3.5" y="4.5" width="13" height="12" rx="1.5" /><path d="M3.5 8.5h13M7 3v3M13 3v3" /></Icon>
export const MenuIcon = ({ open, ...p }: IconProps & { open: boolean }) => (
  <Icon {...p}>{open ? <><path d="M5 5l10 10" /><path d="M15 5L5 15" /></> : <><path d="M3 6h14" /><path d="M3 10h14" /><path d="M3 14h14" /></>}</Icon>
)
