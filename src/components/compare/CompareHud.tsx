import type { ReactNode } from 'react'

export function HudCircle({
  label,
  onClick,
  active = false,
  disabled = false,
  children,
  size = 'md',
}: {
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const dim = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 disabled:opacity-40"
    >
      <span
        className={`flex ${dim} items-center justify-center rounded-full bg-white text-black ${
          active ? 'ring-2 ring-[#f0c400]' : ''
        }`}
      >
        {children}
      </span>
      <span className="text-[10px] font-medium tracking-wide text-white">{label}</span>
    </button>
  )
}

export function HudRecord({ onClick, busy = false, disabled = false }: { onClick: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 disabled:opacity-40"
    >
      <span className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border-[3px] border-white">
        <span className="h-12 w-12 rounded-full bg-[#e03131]" />
      </span>
      <span className="text-[10px] font-medium tracking-wide text-white">{busy ? 'Saving…' : 'Record'}</span>
    </button>
  )
}

export function IconHide() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M9 9 5 5M9 9H5m4 0V5" />
      <path d="m15 15 4 4M15 15h4m-4 0v4" />
    </svg>
  )
}

export function IconShow() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M8 8 4 4M4 4h4M4 4v4" />
      <path d="m16 16 4 4M20 20h-4M20 20v-4" />
    </svg>
  )
}

export function IconReplayArrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7.2 7.4A7 7 0 1 1 5 12.2" />
      <path d="M7.2 4.4v3.5H3.8" />
    </svg>
  )
}

export function IconFlip() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M11 4.5v15L4.2 12z" />
      <path d="M13 4.5v15L19.8 12z" />
    </svg>
  )
}

export function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </svg>
  )
}

export function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  )
}

export function IconLine() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M5 17 19 7" />
      <circle cx="5" cy="17" r="1.6" fill="currentColor" />
      <circle cx="19" cy="7" r="1.6" fill="currentColor" />
    </svg>
  )
}

export function IconDraw() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 16c2-5 4 2 7-2s4-6 7-1" />
    </svg>
  )
}

export function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 17 18 6" />
      <path d="M12 6h6v6" />
    </svg>
  )
}

export function IconShot() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  )
}
