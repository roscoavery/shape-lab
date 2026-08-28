import { useRef, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Accessible name for the row (e.g. Shape library). */
  label: string
  className?: string
}

export function HScrollRow({ children, label, className = '' }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  const scrollBy = (dir: -1 | 1) => {
    const el = ref.current
    if (!el) return
    const step = Math.max(180, Math.round(el.clientWidth * 0.75))
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const arrow =
    'flex h-9 w-8 shrink-0 items-center justify-center rounded-md border border-white/25 bg-black/55 text-lg font-semibold text-white hover:bg-black/75 disabled:opacity-30'

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button type="button" className={arrow} onClick={() => scrollBy(-1)} aria-label={`Scroll ${label} left`}>
        ‹
      </button>
      <div
        ref={ref}
        className="flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]"
        role="listbox"
        aria-label={label}
      >
        {children}
      </div>
      <button type="button" className={arrow} onClick={() => scrollBy(1)} aria-label={`Scroll ${label} right`}>
        ›
      </button>
    </div>
  )
}
