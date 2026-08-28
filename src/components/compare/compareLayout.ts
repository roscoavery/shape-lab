import { createContext, useContext } from 'react'

export type CompareSplit = 'lr' | 'tb'

export type CompareLayoutValue = {
  fullscreen: boolean
  split: CompareSplit
  setFullscreen: (on: boolean) => void
  setSplit: (split: CompareSplit) => void
}

export const CompareLayoutContext = createContext<CompareLayoutValue>({
  fullscreen: false,
  split: 'lr',
  setFullscreen: () => {},
  setSplit: () => {},
})

export function useCompareLayout() {
  return useContext(CompareLayoutContext)
}
