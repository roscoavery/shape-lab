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

export function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  if (m > 0) return `${m}:${sec.toFixed(1).padStart(4, '0')}`
  return `${sec.toFixed(1)}s`
}
