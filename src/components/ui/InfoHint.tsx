import { useId, useState, type ReactNode } from 'react'

type Props = {
  label?: string
  children: ReactNode
  className?: string
}

/** Extra navigation copy behind a compact “i”, so the page stays short. */
export function InfoHint({ label = 'About this', children, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-[11px] font-bold text-white/70 hover:border-white/40 hover:text-white"
      >
        i
      </button>
      {open ? (
        <span
          id={id}
          role="note"
          className="absolute left-0 top-7 z-20 w-64 rounded-xl border border-white/15 bg-[#121820] p-3 text-xs font-normal leading-relaxed text-[var(--muted)] shadow-xl"
        >
          {children}
        </span>
      ) : null}
    </span>
  )
}
