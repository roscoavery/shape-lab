/**
 * Shared Compare split / full-screen controls.
 * Shown on the Compare page and on both the reference and athlete camera cards
 * so the full-screen split is not buried above the library.
 */

import { useCompareLayout, type CompareSplit } from './compareLayout'

type Where = 'page' | 'reference' | 'camera' | 'overlay'

export function CompareSplitBar({ where }: { where: Where }) {
  const { fullscreen, split, setFullscreen, setSplit } = useCompareLayout()
  if (fullscreen && where !== 'overlay') return null

  const enter =
    where === 'reference'
      ? 'Full screen with delay cam'
      : where === 'camera'
        ? 'Full screen with reference'
        : 'Full screen split'

  const pick = (next: CompareSplit) => {
    setSplit(next)
    if (where === 'reference' || where === 'camera') setFullscreen(true)
  }

  const onSurface = where === 'overlay' || fullscreen
  const idleBtn = onSurface
    ? 'border border-white/25 text-white/80'
    : 'border border-[var(--panel-border)] text-[var(--muted)]'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setFullscreen(!fullscreen)}
        className={
          fullscreen
            ? 'rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]'
            : 'rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]'
        }
      >
        {fullscreen ? 'Exit full screen' : enter}
      </button>
      <button
        type="button"
        onClick={() => pick('lr')}
        className={`rounded-lg px-3 py-2 text-sm ${
          split === 'lr' ? 'bg-[var(--accent-dim)] font-semibold text-white' : idleBtn
        }`}
      >
        Left / right
      </button>
      <button
        type="button"
        onClick={() => pick('tb')}
        className={`rounded-lg px-3 py-2 text-sm ${
          split === 'tb' ? 'bg-[var(--accent-dim)] font-semibold text-white' : idleBtn
        }`}
      >
        Top / bottom
      </button>
      {(where === 'overlay' || where === 'page') && (
        <p className={`text-xs ${onSurface ? 'text-white/70' : 'text-[var(--muted)]'}`}>
          Looping reference + delay cam or replay. Scrub each side.
        </p>
      )}
    </div>
  )
}
