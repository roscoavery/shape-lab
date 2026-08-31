import { useState, type ReactNode } from 'react'

type Props = {
  title: string
  hint?: string
  defaultOpen?: boolean
  /** Controlled open state. When set, the section ignores defaultOpen after mount. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
  /** Tighter chrome for nesting inside an already-bordered card. */
  inset?: boolean
}

export function CollapsibleSection({
  title,
  hint,
  defaultOpen = false,
  open,
  onOpenChange,
  children,
  inset = false,
}: Props) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const isOpen = open ?? uncontrolled
  const toggle = () => {
    const next = !isOpen
    if (open === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }

  return (
    <section
      className={
        inset
          ? 'rounded-xl bg-[#0d1218]/80'
          : 'rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)]'
      }
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={toggle}
        className={`flex w-full items-center justify-between gap-3 text-left ${
          inset ? 'px-3 py-2.5' : 'px-4 py-3'
        }`}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
          {hint && !isOpen ? (
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{hint}</p>
          ) : null}
        </div>
        <span
          className={`shrink-0 text-[var(--muted)] transition ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {isOpen ? (
        <div className={inset ? 'px-3 pb-3' : 'px-4 pb-4'}>
          {children}
        </div>
      ) : null}
    </section>
  )
}
