import type { ChalkboardMarkId } from '../../lib/chalkboardMarks'

export function ChalkboardMark({ id, className = '' }: { id: ChalkboardMarkId; className?: string }) {
  const stroke = '#f5c542'
  if (id === 'circle') {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <circle cx="24" cy="24" r="16" fill="none" stroke={stroke} strokeWidth="4" />
      </svg>
    )
  }
  if (id === 'target') {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <circle cx="24" cy="24" r="16" fill="none" stroke={stroke} strokeWidth="3" />
        <circle cx="24" cy="24" r="8" fill="none" stroke={stroke} strokeWidth="3" />
        <circle cx="24" cy="24" r="2.5" fill={stroke} />
      </svg>
    )
  }
  const rotate =
    id === 'arrow-down'
      ? 180
      : id === 'arrow-left'
        ? 270
        : id === 'arrow-right'
          ? 90
          : id === 'arrow-ne'
            ? 45
            : id === 'arrow-nw'
              ? -45
              : 0
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path
        d="M24 6 L24 36 M14 18 L24 6 L34 18"
        fill="none"
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
