/**
 * Shared still overlay: any coach-library or IG-library picture can sit on the live camera.
 * Scale + drag so a wide still can live in a corner instead of covering the whole frame.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { OverlayStillOption } from '../lib/igStills'

export type OverlayStillCtx = {
  selected: OverlayStillOption | null
  visible: boolean
  opacity: number
  /** 0.18–1, portion of the video frame (or fullscreen stage) the still occupies. */
  scale: number
  /** Center of the still, 0–100% of the parent. */
  offsetX: number
  offsetY: number
  menuOpen: boolean
  setSelected: (still: OverlayStillOption | null) => void
  setVisible: (on: boolean) => void
  setOpacity: (n: number) => void
  setScale: (n: number) => void
  setOffset: (x: number, y: number) => void
  setMenuOpen: (on: boolean) => void
}

const OverlayStillContext = createContext<OverlayStillCtx | null>(null)

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

const FALLBACK: OverlayStillCtx = {
  selected: null,
  visible: true,
  opacity: 0.35,
  scale: 0.42,
  offsetX: 82,
  offsetY: 18,
  menuOpen: false,
  setSelected: () => {},
  setVisible: () => {},
  setOpacity: () => {},
  setScale: () => {},
  setOffset: () => {},
  setMenuOpen: () => {},
}

export function OverlayStillProvider({ children }: { children: ReactNode }) {
  const [selected, setSelectedState] = useState<OverlayStillOption | null>(null)
  const [visible, setVisible] = useState(true)
  const [opacity, setOpacity] = useState(0.45)
  const [scale, setScaleState] = useState(0.42)
  const [offsetX, setOffsetX] = useState(82)
  const [offsetY, setOffsetY] = useState(18)
  const [menuOpen, setMenuOpen] = useState(false)

  const setSelected = useCallback((still: OverlayStillOption | null) => {
    setSelectedState(still)
    if (still) {
      setVisible(true)
      setMenuOpen(false)
    } else {
      setVisible(false)
    }
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
      visible,
      opacity,
      scale,
      offsetX,
      offsetY,
      menuOpen,
      setSelected,
      setVisible,
      setOpacity,
      setScale,
      setOffset,
      setMenuOpen,
    }),
    [selected, visible, opacity, scale, offsetX, offsetY, menuOpen, setSelected, setScale, setOffset],
  )
  return (
    <OverlayStillContext.Provider value={value}>{children}</OverlayStillContext.Provider>
  )
}

export function useOverlayStill(): OverlayStillCtx {
  return useContext(OverlayStillContext) ?? FALLBACK
}
