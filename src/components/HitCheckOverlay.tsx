/**
 * Big green check when the athlete first hits a shape, and again when the
 * hold completes. Meant to feel like a clear “you got it” beat.
 */

import { useEffect, useState } from 'react'

type Props = {
  /** Increment to replay the animation. */
  burst: number
  kind?: 'hit' | 'gotit'
}

export function HitCheckOverlay({ burst, kind = 'hit' }: Props) {
  const [visible, setVisible] = useState(false)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (burst <= 0 || burst === shown) return
    setShown(burst)
    setVisible(true)
    const hide = window.setTimeout(() => setVisible(false), kind === 'gotit' ? 1600 : 1100)
    return () => window.clearTimeout(hide)
  }, [burst, kind, shown])

  if (!visible || burst <= 0) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
      aria-live="polite"
      aria-label={kind === 'gotit' ? 'Shape complete' : 'Shape hit'}
    >
      <div className={kind === 'gotit' ? 'hit-check hit-check-gotit' : 'hit-check'}>
        <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
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
      </div>
    </div>
  )
}
