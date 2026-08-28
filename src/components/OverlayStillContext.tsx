/**
 * Shared still overlay: any coach-library or IG-library picture can sit on the live camera.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { OverlayStillOption } from '../lib/igStills'

type OverlayStillCtx = {
  selected: OverlayStillOption | null
  opacity: number
  setSelected: (still: OverlayStillOption | null) => void
  setOpacity: (n: number) => void
}

const OverlayStillContext = createContext<OverlayStillCtx | null>(null)

export function OverlayStillProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<OverlayStillOption | null>(null)
  const [opacity, setOpacity] = useState(0.35)
  const value = useMemo(
    () => ({ selected, opacity, setSelected, setOpacity }),
    [selected, opacity],
  )
  return (
    <OverlayStillContext.Provider value={value}>{children}</OverlayStillContext.Provider>
  )
}

export function useOverlayStill(): OverlayStillCtx {
  const ctx = useContext(OverlayStillContext)
  if (!ctx) {
    return {
      selected: null,
      opacity: 0.35,
      setSelected: () => {},
      setOpacity: () => {},
    }
  }
  return ctx
}
