/**
 * Compare tab — side-by-side video study.
 * Reference video next to the athlete camera (live / delay cam / replay).
 * Full screen covers the whole window: looping IG + delay/replay, left/right or top/bottom.
 */

import { useCallback, useEffect, useState } from 'react'
import { CameraPane } from './CameraPane'
import { ReferencePane } from './ReferencePane'
import { CompareSplitBar } from './CompareSplitBar'
import { CompareLayoutContext, type CompareSplit } from './compareLayout'
import { IgStillContext, type IgCropDraft } from './IgStillContext'

type Props = {
  onSaveIgStill: (draft: IgCropDraft) => void
}

export function ComparePanel({ onSaveIgStill }: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const [split, setSplit] = useState<CompareSplit>('lr')

  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [fullscreen])

  const saveCrop = useCallback(
    (draft: IgCropDraft) => {
      onSaveIgStill(draft)
    },
    [onSaveIgStill],
  )

  const grid = fullscreen
    ? split === 'tb'
      ? 'grid min-h-0 flex-1 grid-rows-2 gap-1'
      : 'grid min-h-0 flex-1 grid-cols-2 gap-1'
    : split === 'tb'
      ? 'grid gap-4'
      : 'grid gap-4 md:grid-cols-2'

  return (
    <IgStillContext.Provider value={{ saveCrop }}>
    <CompareLayoutContext.Provider
      value={{ fullscreen, split, setFullscreen, setSplit }}
    >
      <div
        className={
          fullscreen
            ? 'fixed inset-0 z-[250] flex h-[100dvh] w-screen flex-col bg-black'
            : 'flex flex-col gap-4'
        }
      >
        {!fullscreen && (
          <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
            <strong className="text-[var(--text)]">Full screen split is on both cards below.</strong>{' '}
            Tap <strong className="text-[var(--text)]">Full screen with delay cam</strong> on the
            reference, or <strong className="text-[var(--text)]">Full screen with reference</strong> on
            the athlete camera. Left/right or top/bottom is the looping clip plus delay cam /
            replay — scrub each side. Paste Instagram URLs here; they save into the app.{' '}
            <strong className="text-[var(--text)]">Screenshot</strong> on a looping clip or replay:
            press one corner, drag to the opposite corner, tag the shape, and it lands in{' '}
            <strong className="text-[var(--text)]">Learn → IG shapes</strong>.
          </section>
        )}
        <div
          className={`flex shrink-0 flex-wrap items-center gap-2 ${
            fullscreen ? 'bg-black px-3 py-2 text-white' : ''
          }`}
        >
          <CompareSplitBar where={fullscreen ? 'overlay' : 'page'} />
        </div>
        <div className={`min-h-0 ${fullscreen ? 'flex-1' : ''} ${grid}`}>
          <ReferencePane />
          <CameraPane />
        </div>
      </div>
    </CompareLayoutContext.Provider>
    </IgStillContext.Provider>
  )
}
