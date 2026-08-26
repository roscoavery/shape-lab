/**
 * Big green check when the athlete first hits a shape, and a smaller check
 * that stays up while they are holding so the “you got it” beat is obvious.
 */

type Props = {
  /** Increment to replay the pop animation. */
  burst: number
  kind?: 'hit' | 'gotit'
  /** Keep a check visible the whole time the shape is in. */
  holding?: boolean
}

function CheckSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden>
      <circle cx="48" cy="48" r="44" className="hit-check-ring" />
      <circle cx="48" cy="48" r="38" fill="#145c48" />
      <path
        d="M28 50.5 L41 64 L70 32"
        fill="none"
        stroke="#7dffc8"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function HitCheckOverlay({ burst, kind = 'hit', holding = false }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30" aria-live="polite">
      {burst > 0 && (
        <div
          key={`${burst}-${kind}`}
          className="absolute inset-0 flex items-center justify-center"
          aria-label={kind === 'gotit' ? 'Shape complete' : 'Shape hit'}
        >
          <div className={kind === 'gotit' ? 'hit-check hit-check-gotit' : 'hit-check'}>
            <CheckSvg className="h-full w-full" />
          </div>
        </div>
      )}
      {holding && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#145c48]/95 px-3 py-1.5 shadow-lg ring-2 ring-[#7dffc8]">
          <CheckSvg className="h-8 w-8" />
          <span className="text-sm font-bold uppercase tracking-wide text-[#7dffc8]">Got it</span>
        </div>
      )}
    </div>
  )
}
