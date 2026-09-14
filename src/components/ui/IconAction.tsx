import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type IconActionKind = 'like' | 'repost' | 'plus' | 'remove' | 'tag' | 'clip'

const ICONS: Record<IconActionKind, ReactNode> = {
  like: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 21s-6.2-4.35-9.33-8.4C.5 9.7 1.2 6.2 4.05 4.7 6.1 3.6 8.55 4.15 12 7.15c3.45-3 5.9-3.55 7.95-2.45 2.85 1.5 3.55 5 1.38 7.9C18.2 16.65 12 21 12 21z" />
    </svg>
  ),
  repost: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M7 7h10l-2-2M17 17H7l2 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 7v4M7 17v-4" strokeLinecap="round" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),
  remove: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M7 7l10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c1.2-3.2 3.6-5 7-5s5.8 1.8 7 5" strokeLinecap="round" />
    </svg>
  ),
  clip: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="m10 9 6 3.5L10 16V9z" fill="currentColor" stroke="none" />
    </svg>
  ),
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind: IconActionKind
  label: string
  on?: boolean
  count?: number
}

export function IconAction({
  kind,
  label,
  on = false,
  count,
  className = '',
  ...rest
}: Props) {
  const danger = kind === 'remove'
  const tone = danger
    ? 'text-[var(--bad)] hover:bg-[var(--bad)]/15'
    : on
      ? 'bg-[var(--accent)] text-[var(--on-accent)]'
      : 'text-white/80 hover:bg-white/10'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-2 ${tone} ${className}`}
      {...rest}
    >
      {ICONS[kind]}
      {typeof count === 'number' && count > 0 ? (
        <span className="text-[11px] font-semibold tabular-nums">{count}</span>
      ) : null}
    </button>
  )
}

export function IconMark({ kind, className = '' }: { kind: IconActionKind; className?: string }) {
  return <span className={`inline-flex ${className}`}>{ICONS[kind]}</span>
}
