/**
 * Compare tab — side-by-side video study.
 * Reference video next to the athlete camera (live / delay cam / replay).
 * Full screen defaults to top/bottom; drag the middle border to give
 * reference or delay cam more of the window (videos stay object-contain).
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CameraPane } from './CameraPane'
import { ReferencePane } from './ReferencePane'
import { CompareSplitBar } from './CompareSplitBar'
import { CompareChromeRail } from './CompareChromeRail'
import { CompareSplitDivider } from './CompareSplitDivider'
import {
  CompareLayoutContext,
  type CompareFocus,
  type CompareSplit,
} from './compareLayout'
import { IgStillContext, type IgCropDraft } from './IgStillContext'
import { StillOverlayPicker } from '../StillOverlayPicker'
import { FloatingStillOverlay } from '../FloatingStillOverlay'
import { VideoLibraryPanel } from '../VideoLibraryPanel'
import type { ReferencePhoto } from '../../types'
import type { AthleteVideoSource } from '../../lib/athleteVideoStore'

type Props = {
  onSaveIgStill: (draft: IgCropDraft) => void
  referencePhotos: ReferencePhoto[]
  persistIgToApp?: boolean
  athleteId?: string | null
  athleteName?: string | null
  gymEditor?: boolean
  personalEditor?: boolean
  videoSource?: AthleteVideoSource
  lessonId?: string | null
  skillId?: string | null
  skillLabel?: string | null
  lessonBar?: ReactNode
  /** Reference handoff may request fullscreen without touching camera ownership. */
  enterFullscreenTick?: number
}

export function ComparePanel({
  onSaveIgStill,
  referencePhotos,
  persistIgToApp = false,
  athleteId = null,
  athleteName = null,
  gymEditor = false,
  personalEditor = false,
  videoSource,
  lessonId = null,
  skillId = null,
  skillLabel = null,
  lessonBar = null,
  enterFullscreenTick = 0,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const [split, setSplit] = useState<CompareSplit>('tb')
  const [focus, setFocus] = useState<CompareFocus>('split')
  const [chromeOpen, setChromeOpen] = useState(true)
  const [camRail, setCamRail] = useState<HTMLElement | null>(null)
  const [refRail, setRefRail] = useState<HTMLElement | null>(null)
  const [tbRatio, setTbRatio] = useState(0.64)
  const [lrRatio, setLrRatio] = useState(0.5)
  const [libraryTick, setLibraryTick] = useState(0)
  const [athleteReplay, setAthleteReplay] = useState(false)

  useEffect(() => {
    if (enterFullscreenTick > 0) setFullscreen(true)
  }, [enterFullscreenTick])

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
      tbRatio,
      lrRatio,
      athleteReplay,
      setFullscreen,
      setSplit,
      setFocus,
      setChromeOpen,
      setCamRail,
      setRefRail,
      setTbRatio,
      setLrRatio,
      setAthleteReplay,
    }),
    [fullscreen, split, focus, chromeOpen, camRail, refRail, tbRatio, lrRatio, athleteReplay],
  )

  const showRef = focus !== 'cam'
  const showCam = focus !== 'ref'
  const splitScreen = fullscreen && focus === 'split'

  const onLibrarySaved = useCallback(() => {
    setLibraryTick((n) => n + 1)
  }, [])

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
              It opens top / bottom. Drag the bar between the videos so the
              reference or delay cam takes more of the window — the pictures are
              not stretched. On delay cam, tap <strong className="text-[var(--text)]">Record</strong> after
              the skill; that clip lands in this profile’s video library.{' '}
              <strong className="text-[var(--text)]">Screenshot</strong> on a looping clip: press one
              corner, drag to the opposite corner, and it lands in{' '}
              <strong className="text-[var(--text)]">Learn → IG shapes</strong>
              {gymEditor
                ? '. Ryan is unlocked — gym Compare URLs save into the shared library. After you add or rename, tap Save into the app so every link and browser has them.'
                : personalEditor
                  ? '. Your Compare collections save on this profile only (Instagram URLs included). Gym collections stay as Ryan left them — watch, don’t edit. Shape descriptions and picture sizes stay Ryan-only.'
                  : '. Anyone can watch the gym library. Unlock a coach profile to add URLs in your own collections, or unlock Ryan to edit the gym list.'}
            </section>
          )}
          {!fullscreen && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <CompareSplitBar where="page" />
            </div>
          )}
          {splitScreen && split === 'tb' ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                className="min-h-0 overflow-hidden"
                style={{ flex: `${tbRatio} 1 0%` }}
              >
                <ReferencePane
                  key={athleteId ?? 'none'}
                  gymEditor={gymEditor}
                  personalEditor={personalEditor}
                  profileId={athleteId}
                />
              </div>
              <CompareSplitDivider axis="y" value={tbRatio} onChange={setTbRatio} flush={athleteReplay} />
              <div
                className="min-h-0 overflow-hidden"
                style={{ flex: `${1 - tbRatio} 1 0%` }}
              >
                <CameraPane
                  athleteId={athleteId}
                  onLibrarySaved={onLibrarySaved}
                  videoSource={videoSource}
                  lessonId={lessonId}
                  skillId={skillId}
                  skillLabel={skillLabel}
                />
              </div>
            </div>
          ) : splitScreen && split === 'lr' ? (
            <div className="flex min-h-0 flex-1 flex-row">
              <div
                className="min-h-0 min-w-0 overflow-hidden"
                style={{ flex: `${lrRatio} 1 0%` }}
              >
                <ReferencePane
                  key={athleteId ?? 'none'}
                  gymEditor={gymEditor}
                  personalEditor={personalEditor}
                  profileId={athleteId}
                />
              </div>
              <CompareSplitDivider axis="x" value={lrRatio} onChange={setLrRatio} flush={athleteReplay} />
              <div
                className="min-h-0 min-w-0 overflow-hidden"
                style={{ flex: `${1 - lrRatio} 1 0%` }}
              >
                <CameraPane
                  athleteId={athleteId}
                  onLibrarySaved={onLibrarySaved}
                  videoSource={videoSource}
                  lessonId={lessonId}
                  skillId={skillId}
                  skillLabel={skillLabel}
                />
              </div>
            </div>
          ) : (
            <div
              className={`min-h-0 ${fullscreen ? 'flex-1' : ''} ${
                fullscreen
                  ? 'grid min-h-0 flex-1 grid-cols-1'
                  : split === 'tb'
                    ? athleteReplay
                      ? 'grid gap-0'
                      : 'grid gap-4'
                    : athleteReplay
                      ? 'grid gap-0 md:grid-cols-2'
                      : 'grid gap-4 md:grid-cols-2'
              }`}
            >
              <div className={showRef ? 'h-full min-h-0 min-w-0' : 'hidden'}>
                <ReferencePane
                  key={athleteId ?? 'none'}
                  gymEditor={gymEditor}
                  personalEditor={personalEditor}
                  profileId={athleteId}
                />
              </div>
              <div className={showCam ? 'h-full min-h-0 min-w-0' : 'hidden'}>
                <CameraPane
                  athleteId={athleteId}
                  onLibrarySaved={onLibrarySaved}
                  videoSource={videoSource}
                  lessonId={lessonId}
                  skillId={skillId}
                  skillLabel={skillLabel}
                />
              </div>
            </div>
          )}
          {!fullscreen && lessonBar}
          {!fullscreen && (
            <StillOverlayPicker photos={referencePhotos} compact />
          )}
          {!fullscreen && (
            <VideoLibraryPanel
              athleteId={athleteId}
              athleteName={athleteName}
              refreshKey={libraryTick}
              folder={lessonId ? 'lesson' : 'all'}
              lessonId={lessonId}
            />
          )}
        </div>
        {fullscreen && (
          <div className="pointer-events-none absolute inset-0 z-[18]">
            <FloatingStillOverlay />
          </div>
        )}
      </div>
    </CompareLayoutContext.Provider>
    </IgStillContext.Provider>
  )
}
