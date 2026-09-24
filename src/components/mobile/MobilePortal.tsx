import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/** Render mobile sheets on document.body so sticky headers cannot trap z-index. */
export function MobilePortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
