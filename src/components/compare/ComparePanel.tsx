/**
 * Compare tab — side-by-side video study.
 * Reference video next to the athlete camera (live / delay cam / replay).
 * Full screen is a clean split with a hideable side rail for overlay, layout, and camera.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CameraPane } from './CameraPane'
import { ReferencePane } from './ReferencePane'
import { CompareSplitBar } from './CompareSplitBar'
import { CompareChromeRail } from './CompareChromeRail'
import {
  CompareLayoutContext,
  type CompareFocus,
  type CompareSplit,
} from './compareLayout'
import { IgStillContext, type IgCropDraft } from './IgStillContext'
import { StillOverlayPicker } from '../StillOverlayPicker'
import type { ReferencePhoto } from '../../types'

type Props = {
  onSaveIgStill: (draft: IgCropDraft) => void
  referencePhotos: ReferencePhoto[]
  persistIgToApp?: boolean
}

export function ComparePanel({
  onSaveIgStill,
  referencePhotos,
  persistIgToApp = false,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const [split, setSplit] = useState<CompareSplit>('lr')
  const [focus, setFocus] = useState<CompareFocus>('split')
  const [chromeOpen, setChromeOpen] = useState(true)
  const [camRail, setCamRail] = useState<HTMLElement | null>(null)
  const [refRail, setRefRail] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen])

  const saveCrop = useCallback(
    (draft: IgCropDraft) => {
      onSaveIgStill(draft)
    },
    [onSaveIgStill],
  )

  const layout = useMemo(
    () => ({
      fullscreen,
      split,
      focus,
      chromeOpen,
      camRail,
      refRail,
      setFullscreen,
      setSplit,
      setFocus,
      setChromeOpen,
      setCamRail,
      setRefRail,
    }),
    [fullscreen, split, focus, chromeOpen, camRail, refRail],
  )

  const showRef = focus !== 'cam'
  const showCam = focus !== 'ref'

  const grid = fullscreen
    ? focus !== 'split'
      ? 'grid min-h-0 flex-1 grid-cols-1'
      : split === 'tb'
        ? 'grid min-h-0 flex-1 grid-rows-2 gap-px'
        : 'grid min-h-0 flex-1 grid-cols-2 gap-px'
    : split === 'tb'
      ? 'grid gap-4'
      : 'grid gap-4 md:grid-cols-2'

  return (
    <IgStillContext.Provider value={{ saveCrop, persistToApp: persistIgToApp }}>
    <CompareLayoutContext.Provider value={layout}>
      <div
        className={
          fullscreen
            ? 'fixed inset-0 z-[250] flex h-[100dvh] w-screen bg-black'
            : 'flex flex-col gap-4'
        }
      >
        {fullscreen && <CompareChromeRail photos={referencePhotos} />}
        <div className={fullscreen ? 'relative flex min-h-0 min-w-0 flex-1 flex-col' : 'flex flex-col gap-4'}>
          {!fullscreen && (
            <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
              <strong className="text-[var(--text)]">Full screen split is on both cards below.</strong>{' '}
              Tap <strong className="text-[var(--text)]">Full screen with delay cam</strong> on the
              reference, or <strong className="text-[var(--text)]">Full screen with reference</strong> on
              the athlete camera. In full screen, controls sit on the side — hide them for a clean
              split, then pull the menu back to pick a still, shrink it, and drag it to a corner.
              You can also make just the reference or just the delay cam fill the window.{' '}
              <strong className="text-[var(--text)]">Screenshot</strong> on a looping clip: press one
              corner, drag to the opposite corner, and it lands in{' '}
              <strong className="text-[var(--text)]">Learn → IG shapes</strong>
              {persistIgToApp
                ? '. Ryan is selected, so that still is saved into the app — every link will have it.'
                : '. Select the Ryan profile first if you want that still saved into the app for every browser and link.'}
            </section>
          )}
          {!fullscreen && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <CompareSplitBar where="page" />
            </div>
          )}
          <div className={`min-h-0 ${fullscreen ? 'flex-1' : ''} ${grid}`}>
            <div className={showRef ? 'h-full min-h-0 min-w-0' : 'hidden'}>
              <ReferencePane />
            </div>
            <div className={showCam ? 'h-full min-h-0 min-w-0' : 'hidden'}>
              <CameraPane />
            </div>
          </div>
          {!fullscreen && (
            <StillOverlayPicker photos={referencePhotos} compact />
          )}
        </div>
      </div>
    </CompareLayoutContext.Provider>
    </IgStillContext.Provider>
  )
}
