import { useState, type ReactNode } from 'react'

type Props = {
  title: string
  hint?: string
  defaultOpen?: boolean
  children: ReactNode
  /** Tighter chrome for nesting inside an already-bordered card. */
  inset?: boolean
}

export function CollapsibleSection({
  title,
  hint,
  defaultOpen = false,
  children,
  inset = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section
      className={
        inset
          ? 'rounded-lg border border-[var(--panel-border)] bg-[#0d1218]'
          : 'rounded-xl border border-[var(--panel-border)] bg-[var(--panel)]'
      }
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-center justify-between gap-3 text-left ${
          inset ? 'px-3 py-2' : 'px-4 py-3'
        }`}
      >
        <div className="min-w-0">
          <h3 className="font-semibold text-[var(--text)]">{title}</h3>
          {hint ? (
            <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs font-semibold text-[var(--muted)]">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>
      {open ? (
        <div
          className={`border-t border-[var(--panel-border)] ${
            inset ? 'px-3 py-2' : 'px-4 pb-4 pt-3'
          }`}
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}
