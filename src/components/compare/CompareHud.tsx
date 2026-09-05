import type { ReactNode } from 'react'
import { useCompareLayout } from './compareLayout'

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
  const dim = size === 'lg' ? 'h-[3.25rem] w-[3.25rem]' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
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

export function HudRecord({
  onClick,
  busy = false,
  disabled = false,
  recording = false,
  seconds = 0,
  size = 'md',
}: {
  onClick: () => void
  busy?: boolean
  disabled?: boolean
  recording?: boolean
  seconds?: number
  size?: 'sm' | 'md'
}) {
  const ring = size === 'sm' ? 'h-12 w-12 border-[2.5px]' : 'h-[4.25rem] w-[4.25rem] border-[3px]'
  const dot = size === 'sm' ? 'h-8 w-8' : 'h-12 w-12'
  const stop = size === 'sm' ? 'h-5 w-5' : 'h-7 w-7'
  const label = busy ? 'Saving…' : recording ? `Stop ${seconds}s` : 'Record'
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 disabled:opacity-40"
    >
      <span className={`flex ${ring} items-center justify-center rounded-full border-white`}>
        {recording ? (
          <span className={`${stop} rounded-sm bg-[#e03131]`} />
        ) : (
          <span className={`${dot} rounded-full bg-[#e03131]`} />
        )}
      </span>
      <span className="text-[10px] font-medium tracking-wide text-white">{label}</span>
    </button>
  )
}

export function IconShare() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 2 11.4 12.6" />
      <path d="M22 2 15 22l-3.6-8.4L3 10.2 22 2z" />
    </svg>
  )
}

export function IconPhotos() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <circle cx="10" cy="12" r="2.1" />
      <path d="m14 16 2.2-2.4a1 1 0 0 1 1.5 0L20 16" />
    </svg>
  )
}

export function IconHide() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M9 9 5 5M9 9H5m4 0V5" />
      <path d="m15 15 4 4M15 15h4m-4 0v4" />
    </svg>
  )
}

export function IconShow() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
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
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M11 4.5v15L4.2 12z" />
      <path d="M13 4.5v15L19.8 12z" />
    </svg>
  )
}

export function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </svg>
  )
}

export function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  )
}

export function IconClips() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M8 6V4.8M12 6V4.8M16 6V4.8M8 19.2V18M12 19.2V18M16 19.2V18" />
    </svg>
  )
}

export function IconPip() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <rect x="12.5" y="12" width="6.5" height="5.5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconSwap() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 8h11" />
      <path d="m15 5 3 3-3 3" />
      <path d="M17 16H6" />
      <path d="m9 13-3 3 3 3" />
    </svg>
  )
}

export function IconSplit() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="4" width="17" height="7" rx="1.2" />
      <rect x="3.5" y="13" width="17" height="7" rx="1.2" />
    </svg>
  )
}

export function IconControls() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="6.5" r="1.7" fill="currentColor" stroke="none" />
      <path d="M4 6.5h6.2M13.8 6.5H20" />
      <circle cx="8" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <path d="M4 12h2.2M9.8 12H20" />
      <circle cx="16" cy="17.5" r="1.7" fill="currentColor" stroke="none" />
      <path d="M4 17.5h10.2M17.8 17.5H20" />
    </svg>
  )
}

export function CompareControlsButton() {
  const { fullscreen, chromeOpen, setChromeOpen } = useCompareLayout()
  if (!fullscreen || chromeOpen) return null
  return (
    <HudCircle label="Controls" onClick={() => setChromeOpen(true)}>
      <IconControls />
    </HudCircle>
  )
}

export function IconLine() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M5 17 19 7" />
      <circle cx="5" cy="17" r="1.6" fill="currentColor" />
      <circle cx="19" cy="7" r="1.6" fill="currentColor" />
    </svg>
  )
}

export function IconDraw() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 16c2-5 4 2 7-2s4-6 7-1" />
    </svg>
  )
}

export function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 17 18 6" />
      <path d="M12 6h6v6" />
    </svg>
  )
}

export function IconShot() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  )
}
