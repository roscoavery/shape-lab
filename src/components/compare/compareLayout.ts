import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'

export type CompareSplit = 'lr' | 'tb'
export type CompareFocus = 'split' | 'ref' | 'cam'
export type PipCorner = 'tl' | 'tr' | 'bl' | 'br'

/** Which pane is shrunk to a corner chip (the other stays full screen). */
export function pipPane(
  fullscreen: boolean,
  focus: CompareFocus,
): 'ref' | 'cam' | null {
  if (!fullscreen || focus === 'split') return null
  return focus === 'cam' ? 'ref' : 'cam'
}

/** Flip which pane is full vs in the corner. Split is unchanged. */
export function flipFocus(focus: CompareFocus): CompareFocus {
  if (focus === 'cam') return 'ref'
  if (focus === 'ref') return 'cam'
  return 'cam'
}

export function pipCornerClass(corner: PipCorner): string {
  switch (corner) {
    case 'tl':
      return 'top-3 left-3'
    case 'tr':
      return 'top-3 right-3'
    case 'bl':
      return 'bottom-3 left-3'
    case 'br':
      return 'bottom-3 right-3'
  }
}

export const COMPARE_PIP_BOX =
  'overflow-hidden rounded-xl border-2 border-white/75 bg-black shadow-[0_12px_32px_rgba(0,0,0,0.65)] h-[9.75rem] w-[7rem]'

export type CompareLayoutValue = {
  fullscreen: boolean
  split: CompareSplit
  focus: CompareFocus
  chromeOpen: boolean
  camRail: HTMLElement | null
  refRail: HTMLElement | null
  tbRatio: number
  lrRatio: number
  /** Athlete pane is showing Replay Last — flush the split and overlay transport. */
  athleteReplay: boolean
  pipCorner: PipCorner
  /** First-open buffer picker covers the camera; hide the reference chip. */
  replayStart: boolean
  setFullscreen: (on: boolean) => void
  setSplit: (split: CompareSplit) => void
  setFocus: (focus: CompareFocus) => void
  setChromeOpen: (on: boolean) => void
  setReplayStart: (on: boolean) => void
  setCamRail: Dispatch<SetStateAction<HTMLElement | null>>
  setRefRail: Dispatch<SetStateAction<HTMLElement | null>>
  setTbRatio: (n: number) => void
  setLrRatio: (n: number) => void
  setAthleteReplay: (on: boolean) => void
  setPipCorner: (corner: PipCorner) => void
}

const noop = () => {}

export const CompareLayoutContext = createContext<CompareLayoutValue>({
  fullscreen: false,
  split: 'tb',
  focus: 'split',
  chromeOpen: false,
  camRail: null,
  refRail: null,
  tbRatio: 0.64,
  lrRatio: 0.5,
  athleteReplay: false,
  pipCorner: 'br',
  replayStart: false,
  setFullscreen: noop,
  setSplit: noop,
  setFocus: noop,
  setChromeOpen: noop,
  setReplayStart: noop,
  setCamRail: noop,
  setRefRail: noop,
  setTbRatio: noop,
  setLrRatio: noop,
  setAthleteReplay: noop,
  setPipCorner: noop,
})

export function useCompareLayout() {
  return useContext(CompareLayoutContext)
}
