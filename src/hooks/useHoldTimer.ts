/**
 * Hold timers: total time in frame vs quality time above threshold
 */

import { useEffect, useRef, useState } from 'react'

export function useHoldTimer(
  active: boolean,
  overallScore: number,
  qualityThreshold: number,
) {
  const [totalHoldSeconds, setTotal] = useState(0)
  const [qualityHoldSeconds, setQuality] = useState(0)
  const lastRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      lastRef.current = null
      return
    }

    let raf = 0
    const tick = (now: number) => {
      if (lastRef.current != null) {
        const dt = (now - lastRef.current) / 1000
        // Only accumulate when we have a meaningful pose score signal
        if (overallScore > 5) {
          setTotal((t) => t + dt)
          if (overallScore >= qualityThreshold) {
            setQuality((q) => q + dt)
          }
        }
      }
      lastRef.current = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, overallScore, qualityThreshold])

  const reset = () => {
    setTotal(0)
    setQuality(0)
    lastRef.current = null
  }

  return { totalHoldSeconds, qualityHoldSeconds, reset }
}

/** Stopwatch holds round up to the nearest 0.01s for logs and display. */
export function roundHoldSecondsUp(s: number): number {
  if (!Number.isFinite(s) || s <= 0) return 0
  return Math.ceil(s * 100) / 100
}

export function formatSeconds(s: number): string {
  const r = roundHoldSecondsUp(s)
  const m = Math.floor(r / 60)
  const sec = r - m * 60
  if (m > 0) return `${m}:${sec.toFixed(2).padStart(5, '0')}`
  return `${sec.toFixed(2)}s`
}
