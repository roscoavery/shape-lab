/**
 * Shared Compare split / full-screen controls.
 * Shown on the Compare page and on both the reference and athlete camera cards
 * so the full-screen split is not buried above the library.
 */

import { useCompareLayout, type CompareSplit } from './compareLayout'

type Where = 'page' | 'reference' | 'camera' | 'overlay'

export function CompareSplitBar({ where }: { where: Where }) {
  const { fullscreen, split, setFullscreen, setSplit, setFocus, setChromeOpen } =
    useCompareLayout()
  if (fullscreen && where !== 'overlay') return null

  const enter =
    where === 'reference'
      ? 'Full screen with delay cam'
      : where === 'camera'
        ? 'Full screen with reference'
        : 'Full screen split'

  const pick = (next: CompareSplit) => {
    setSplit(next)
    setFocus('split')
    if (where === 'reference' || where === 'camera') {
      setChromeOpen(true)
      setFullscreen(true)
    }
  }

  const enterFull = () => {
    setFocus('split')
    setChromeOpen(true)
    setFullscreen(true)
  }

  if (where === 'overlay') return null

  const idleBtn = 'border border-[var(--panel-border)] text-[var(--muted)]'

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={enterFull}
        className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#06281f]"
      >
        {enter}
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
      {where === 'page' && (
        <p className="text-[11px] text-[var(--muted)]">
          Looping reference + delay cam. Hide the side menu in full screen for a clean split.
        </p>
      )}
    </div>
  )
}
