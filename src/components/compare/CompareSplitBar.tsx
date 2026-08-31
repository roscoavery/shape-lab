/**
 * Shared Compare split / full-screen controls.
 * Page chrome uses a large “Replay with reference cam” button in ComparePanel.
 * Cards keep a compact entry so split is not buried above the library.
 */

import { useCompareLayout, type CompareSplit } from './compareLayout'

type Where = 'page' | 'reference' | 'camera' | 'overlay'

export function CompareSplitBar({ where }: { where: Where }) {
  const { fullscreen, split, setFullscreen, setSplit, setFocus, setChromeOpen, setReplayStart } =
    useCompareLayout()
  if (fullscreen && where !== 'overlay') return null
  if (where === 'overlay' || where === 'page') return null

  const pick = (next: CompareSplit) => {
    setSplit(next)
    setFocus('cam')
    setChromeOpen(false)
    setReplayStart(true)
    setFullscreen(true)
  }

  const enterFull = () => {
    setSplit('tb')
    setFocus('cam')
    setChromeOpen(false)
    setReplayStart(true)
    setFullscreen(true)
  }

  const idleBtn = 'border border-[var(--panel-border)] text-[var(--muted)]'

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={enterFull}
        className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#06281f]"
      >
        Replay with reference cam
      </button>
      <button
        type="button"
        onClick={() => pick('lr')}
        className={`rounded-full px-2.5 py-1.5 text-xs ${
          split === 'lr' ? 'bg-[var(--accent-dim)] font-semibold text-white' : idleBtn
        }`}
      >
        Left / right
      </button>
      <button
        type="button"
        onClick={() => pick('tb')}
        className={`rounded-full px-2.5 py-1.5 text-xs ${
          split === 'tb' ? 'bg-[var(--accent-dim)] font-semibold text-white' : idleBtn
        }`}
      >
        Top / bottom
      </button>
    </div>
  )
}
