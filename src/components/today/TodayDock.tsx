import { useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'shape-lab.today.dock.v1'

export type TodayDockId = string

type Stored = Partial<Record<TodayDockId, boolean>>

function readDock(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Stored
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeDock(next: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
}

type Props = {
  id: TodayDockId
  icon: string
  eyebrow: string
  title: string
  hint: string
  defaultOpen?: boolean
  children: ReactNode
}

export function TodayDock({
  id,
  icon,
  eyebrow,
  title,
  hint,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    const stored = readDock()[id]
    if (typeof stored === 'boolean') setOpen(stored)
  }, [id])

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      writeDock({ ...readDock(), [id]: next })
      return next
    })
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#141c24] to-[#0b1016] shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:gap-4 sm:px-5 sm:py-4"
      >
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)]/15 text-2xl shadow-[inset_0_0_0_1px_rgba(45,212,168,0.18)]"
          aria-hidden
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            {eyebrow}
          </span>
          <span className="mt-0.5 block text-lg font-bold tracking-tight text-white">{title}</span>
          {!open ? (
            <span className="mt-0.5 block truncate text-sm text-white/50">{hint}</span>
          ) : null}
        </span>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg font-semibold transition ${
            open
              ? 'border-[var(--accent)]/50 bg-[var(--accent)] text-[#06281f]'
              : 'border-white/15 bg-white/5 text-white'
          }`}
          aria-hidden
        >
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? (
        <div className="border-t border-white/8 px-4 pb-4 pt-3 sm:px-5">{children}</div>
      ) : null}
    </section>
  )
}
