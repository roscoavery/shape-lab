/**
 * Shared still overlay: any coach-library or IG-library picture can sit on the live camera.
 * Scale + drag so a wide still can live in a corner instead of covering the whole frame.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { OverlayStillOption } from '../lib/igStills'

export type OverlayStillCtx = {
  selected: OverlayStillOption | null
  opacity: number
  /** 0.18–1, portion of the video frame the still occupies. */
  scale: number
  /** Center of the still, 0–100% of the video frame. */
  offsetX: number
  offsetY: number
  menuOpen: boolean
  setSelected: (still: OverlayStillOption | null) => void
  setOpacity: (n: number) => void
  setScale: (n: number) => void
  setOffset: (x: number, y: number) => void
  setMenuOpen: (on: boolean) => void
}

const OverlayStillContext = createContext<OverlayStillCtx | null>(null)

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

const FALLBACK: OverlayStillCtx = {
  selected: null,
  opacity: 0.35,
  scale: 0.42,
  offsetX: 82,
  offsetY: 18,
  menuOpen: false,
  setSelected: () => {},
  setOpacity: () => {},
  setScale: () => {},
  setOffset: () => {},
  setMenuOpen: () => {},
}

export function OverlayStillProvider({ children }: { children: ReactNode }) {
  const [selected, setSelectedState] = useState<OverlayStillOption | null>(null)
  const [opacity, setOpacity] = useState(0.45)
  const [scale, setScaleState] = useState(0.42)
  const [offsetX, setOffsetX] = useState(82)
  const [offsetY, setOffsetY] = useState(18)
  const [menuOpen, setMenuOpen] = useState(false)

  const setSelected = useCallback((still: OverlayStillOption | null) => {
    setSelectedState(still)
    if (still) setMenuOpen(false)
  }, [])

  const setScale = useCallback((n: number) => {
    setScaleState(clamp(n, 0.18, 1))
  }, [])

  const setOffset = useCallback((x: number, y: number) => {
    setOffsetX(clamp(x, 0, 100))
    setOffsetY(clamp(y, 0, 100))
  }, [])

  const value = useMemo(
    () => ({
      selected,
      opacity,
      scale,
      offsetX,
      offsetY,
      menuOpen,
      setSelected,
      setOpacity,
      setScale,
      setOffset,
      setMenuOpen,
    }),
    [selected, opacity, scale, offsetX, offsetY, menuOpen, setSelected, setScale, setOffset],
  )
  return (
    <OverlayStillContext.Provider value={value}>{children}</OverlayStillContext.Provider>
  )
}

export function useOverlayStill(): OverlayStillCtx {
  return useContext(OverlayStillContext) ?? FALLBACK
}
