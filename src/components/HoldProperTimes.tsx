import { formatSeconds } from '../hooks/useHoldTimer'

type Props = {
  total: number
  proper?: number | null
  className?: string
}

/** Logged hold (grey) and proper (green) at the same size. */
export function HoldProperTimes({ total, proper, className = '' }: Props) {
  return (
    <span
      className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-semibold tabular-nums ${className}`}
    >
      <span className="text-[var(--muted)]">{formatSeconds(total)} hold</span>
      {proper != null ? (
        <span className="text-[var(--good)]">{formatSeconds(proper)} proper</span>
      ) : null}
    </span>
  )
}
