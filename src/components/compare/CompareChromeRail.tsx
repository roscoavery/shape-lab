/**
 * Compare fullscreen chrome: a slim side rail so the split stays clean.
 * Hide it for a video-only view; pull it back when you need overlay / layout / camera.
 */

import { StillOverlayPicker } from '../StillOverlayPicker'
import { useCompareLayout, type CompareFocus, type CompareSplit } from './compareLayout'
import type { ReferencePhoto } from '../../types'

type Props = {
  photos: ReferencePhoto[]
}

const pill = (on: boolean) =>
  on
    ? 'bg-white text-black'
    : 'bg-white/8 text-white/80 hover:bg-white/14'

export function CompareChromeRail({ photos }: Props) {
  const {
    split,
    focus,
    chromeOpen,
    setFullscreen,
    setSplit,
    setFocus,
    setChromeOpen,
    setCamRail,
    setRefRail,
  } = useCompareLayout()

  const pickSplit = (next: CompareSplit) => {
    setSplit(next)
    setFocus('split')
  }

  const pickFocus = (next: CompareFocus) => {
    setFocus(next)
  }

  if (!chromeOpen) {
    return (
      <button
        type="button"
        onClick={() => setChromeOpen(true)}
        className="absolute bottom-3 left-3 z-[20] rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/90 shadow-lg backdrop-blur-md hover:bg-black/75"
      >
        Controls
      </button>
    )
  }

  return (
    <aside className="relative z-[20] flex h-full w-[min(17.5rem,42vw)] shrink-0 flex-col gap-2 overflow-y-auto border-r border-white/10 bg-[#0b0f14]/92 px-2 py-2.5 backdrop-blur-xl">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFullscreen(false)}
          className="flex-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black"
        >
          Exit
        </button>
        <button
          type="button"
          onClick={() => setChromeOpen(false)}
          className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/16"
        >
          Hide
        </button>
      </div>

      <section>
        <p className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
          Layout
        </p>
        <div className="grid grid-cols-2 gap-1">
          <button type="button" onClick={() => pickSplit('lr')} className={`rounded-lg px-2 py-1.5 text-[11px] font-medium ${pill(focus === 'split' && split === 'lr')}`}>
            Left / right
          </button>
          <button type="button" onClick={() => pickSplit('tb')} className={`rounded-lg px-2 py-1.5 text-[11px] font-medium ${pill(focus === 'split' && split === 'tb')}`}>
            Top / bottom
          </button>
          <button type="button" onClick={() => pickFocus('ref')} className={`rounded-lg px-2 py-1.5 text-[11px] font-medium ${pill(focus === 'ref')}`}>
            Reference
          </button>
          <button type="button" onClick={() => pickFocus('cam')} className={`rounded-lg px-2 py-1.5 text-[11px] font-medium ${pill(focus === 'cam')}`}>
            Delay cam
          </button>
        </div>
      </section>

      <section>
        <p className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
          Clip
        </p>
        <div
          ref={(el) => setRefRail(el)}
          className="min-h-[2.25rem] rounded-lg bg-white/4 p-1 empty:hidden"
        />
      </section>

      <section>
        <p className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
          Camera
        </p>
        <div
          ref={(el) => setCamRail(el)}
          className="flex flex-col gap-1.5 rounded-lg bg-white/4 p-1.5 empty:hidden"
        />
      </section>

      <section>
        <StillOverlayPicker photos={photos} onVideo rail />
      </section>
    </aside>
  )
}
