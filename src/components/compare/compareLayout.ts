import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'

export type CompareSplit = 'lr' | 'tb'
export type CompareFocus = 'split' | 'ref' | 'cam'

export type CompareLayoutValue = {
  fullscreen: boolean
  split: CompareSplit
  focus: CompareFocus
  chromeOpen: boolean
  camRail: HTMLElement | null
  refRail: HTMLElement | null
  tbRatio: number
  lrRatio: number
  setFullscreen: (on: boolean) => void
  setSplit: (split: CompareSplit) => void
  setFocus: (focus: CompareFocus) => void
  setChromeOpen: (on: boolean) => void
  setCamRail: Dispatch<SetStateAction<HTMLElement | null>>
  setRefRail: Dispatch<SetStateAction<HTMLElement | null>>
  setTbRatio: (n: number) => void
  setLrRatio: (n: number) => void
}

const noop = () => {}

export const CompareLayoutContext = createContext<CompareLayoutValue>({
  fullscreen: false,
  split: 'tb',
  focus: 'split',
  chromeOpen: true,
  camRail: null,
  refRail: null,
  tbRatio: 0.64,
  lrRatio: 0.5,
  setFullscreen: noop,
  setSplit: noop,
  setFocus: noop,
  setChromeOpen: noop,
  setCamRail: noop,
  setRefRail: noop,
  setTbRatio: noop,
  setLrRatio: noop,
})

export function useCompareLayout() {
  return useContext(CompareLayoutContext)
}
