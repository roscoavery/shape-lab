/**
 * Compare tab — side-by-side video study.
 * Reference video next to the athlete camera (live / delay cam / replay).
 * Full screen defaults to top/bottom; drag the middle border to give
 * reference or delay cam more of the window (videos stay object-contain).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CameraPane } from './CameraPane'
import { ReferencePane } from './ReferencePane'
import { CompareChromeRail } from './CompareChromeRail'
import { CompareSplitDivider } from './CompareSplitDivider'
import {
  CompareLayoutContext,
  flipFocus,
  pipPane,
  type CompareFocus,
  type CompareSplit,
  type PipCorner,
} from './compareLayout'
import { ComparePipSlot } from './ComparePipDock'
import { IgStillContext, type IgCropDraft } from './IgStillContext'
import { StillOverlayPicker } from '../StillOverlayPicker'
import { FloatingStillOverlay } from '../FloatingStillOverlay'
import { VideoLibraryPanel } from '../VideoLibraryPanel'
import { CollapsibleSection } from '../CollapsibleSection'
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
  const [chromeOpen, setChromeOpen] = useState(false)
  const [camRail, setCamRail] = useState<HTMLElement | null>(null)
  const [refRail, setRefRail] = useState<HTMLElement | null>(null)
  const [tbRatio, setTbRatio] = useState(0.64)
  const [lrRatio, setLrRatio] = useState(0.5)
  const [libraryTick, setLibraryTick] = useState(0)
  const [athleteReplay, setAthleteReplay] = useState(false)
  const [pipCorner, setPipCorner] = useState<PipCorner>('br')
  const [replayStart, setReplayStart] = useState(false)

  const enterReplay = (next: CompareSplit) => {
    setSplit(next)
    setFocus('cam')
    setChromeOpen(false)
    setReplayStart(true)
    setFullscreen(true)
  }

  const exitReplay = () => {
    setChromeOpen(false)
    setReplayStart(false)
    setFullscreen(false)
  }

  useEffect(() => {
    if (enterFullscreenTick > 0) enterReplay('tb')
    // enterReplay is stable enough for this tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterFullscreenTick])

  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitReplay()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen])

  const prevFsRef = useRef(false)
  useEffect(() => {
    if (fullscreen && !prevFsRef.current) setChromeOpen(false)
    prevFsRef.current = fullscreen
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
      pipCorner,
      replayStart,
      setFullscreen,
      setSplit,
      setFocus,
      setChromeOpen,
      setReplayStart,
      setCamRail,
      setRefRail,
      setTbRatio,
      setLrRatio,
      setAthleteReplay,
      setPipCorner,
    }),
    [fullscreen, split, focus, chromeOpen, camRail, refRail, tbRatio, lrRatio, athleteReplay, pipCorner, replayStart],
  )

  const showRef = focus !== 'cam'
  const showCam = focus !== 'ref'
  const corner = pipPane(fullscreen, focus)
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
            <button
              type="button"
              onClick={() => enterReplay('tb')}
              className="group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#5cf0c8] via-[#2dd4a8] to-[#147a62] px-5 py-6 text-center shadow-[0_16px_40px_rgba(45,212,168,0.32)] sm:py-8"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#06281f]/70">
                Videos · Compare
              </span>
              <span className="mt-1 text-2xl font-bold tracking-tight text-[#06281f] sm:text-3xl">
                Replay with reference cam
              </span>
              <span className="mt-2 max-w-lg text-sm font-medium text-[#06281f]/80">
                Full-screen split: looping reference on one side, delay cam on the other.
                Drag the bar between them — the pictures stay true.
              </span>
            </button>
          )}
          {!fullscreen && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => enterReplay('lr')}
                className="rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                Open left / right
              </button>
              <button
                type="button"
                onClick={() => enterReplay('tb')}
                className="rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                Open top / bottom
              </button>
            </div>
          )}
          {!fullscreen && (
            <CollapsibleSection
              title="How Compare works"
              hint="Delay cam, Record, screenshots, and who can edit the gym list"
              defaultOpen={false}
            >
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                Replay with reference cam opens top / bottom. Drag the bar so the
                reference or delay cam takes more of the window — pictures are not
                stretched. On delay cam, tap{' '}
                <strong className="text-[var(--text)]">Record</strong> after the skill;
                that clip lands in this profile’s video library.{' '}
                <strong className="text-[var(--text)]">Screenshot</strong> on a looping
                clip: press one corner, drag to the opposite corner, and it lands in{' '}
                <strong className="text-[var(--text)]">Learn → IG shapes</strong>
                {gymEditor
                  ? '. Ryan is unlocked — gym Compare URLs save into the shared library. After you add or rename, tap Save into the app so every link and browser has them.'
                  : personalEditor
                    ? '. Your Compare collections save on this profile only. Gym collections stay as Ryan left them — watch, don’t edit.'
                    : '. Anyone can watch the gym library. Unlock a coach profile to add URLs in your own collections, or unlock Ryan to edit the gym list.'}
              </p>
            </CollapsibleSection>
          )}
          {fullscreen ? (
            <div
              className={
                splitScreen
                  ? split === 'tb'
                    ? 'flex min-h-0 flex-1 flex-col'
                    : 'flex min-h-0 flex-1 flex-row'
                  : 'relative min-h-0 flex-1'
              }
            >
              <ComparePipSlot
                active={corner === 'ref' && !replayStart}
                onSwap={() => setFocus(flipFocus(focus))}
                onSplit={() => {
                  setSplit('tb')
                  setFocus('split')
                }}
                splitClass={
                  corner === 'cam'
                    ? 'absolute inset-0 z-[10] min-h-0 overflow-hidden'
                    : `min-h-0 overflow-hidden ${split === 'lr' ? 'min-w-0' : ''}`
                }
                splitStyle={
                  splitScreen
                    ? split === 'tb'
                      ? { flex: `${tbRatio} 1 0%` }
                      : { flex: `${lrRatio} 1 0%` }
                    : undefined
                }
              >
                <ReferencePane
                  key={athleteId ?? 'none'}
                  gymEditor={gymEditor}
                  personalEditor={personalEditor}
                  profileId={athleteId}
                />
              </ComparePipSlot>
              {splitScreen ? (
                <CompareSplitDivider
                  axis={split === 'tb' ? 'y' : 'x'}
                  value={split === 'tb' ? tbRatio : lrRatio}
                  onChange={split === 'tb' ? setTbRatio : setLrRatio}
                  flush={athleteReplay}
                />
              ) : null}
              <ComparePipSlot
                active={corner === 'cam'}
                onSwap={() => setFocus(flipFocus(focus))}
                onSplit={() => {
                  setSplit('tb')
                  setFocus('split')
                }}
                splitClass={
                  corner === 'ref'
                    ? 'absolute inset-0 z-[10] min-h-0 overflow-hidden'
                    : `min-h-0 overflow-hidden ${split === 'lr' ? 'min-w-0' : ''}`
                }
                splitStyle={
                  splitScreen
                    ? split === 'tb'
                      ? { flex: `${1 - tbRatio} 1 0%` }
                      : { flex: `${1 - lrRatio} 1 0%` }
                    : undefined
                }
              >
                <CameraPane
                  athleteId={athleteId}
                  onLibrarySaved={onLibrarySaved}
                  videoSource={videoSource}
                  lessonId={lessonId}
                  skillId={skillId}
                  skillLabel={skillLabel}
                />
              </ComparePipSlot>
            </div>
          ) : (
            <div
              className={
                split === 'tb'
                  ? athleteReplay
                    ? 'grid gap-0'
                    : 'grid gap-4'
                  : athleteReplay
                    ? 'grid gap-0 md:grid-cols-2'
                    : 'grid gap-4 md:grid-cols-2'
              }
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
            <CollapsibleSection
              title="Video library"
              hint={
                athleteName
                  ? `${athleteName} · delay cam and Compare clips — open to play`
                  : 'Delay cam and Compare clips — open to play'
              }
              defaultOpen={false}
            >
              <VideoLibraryPanel
                embedded
                athleteId={athleteId}
                athleteName={athleteName}
                refreshKey={libraryTick}
                folder={lessonId ? 'lesson' : 'all'}
                lessonId={lessonId}
              />
            </CollapsibleSection>
          )}
        </div>
        {fullscreen && (
          <button
            type="button"
            aria-label="Close replay with reference cam"
            onClick={exitReplay}
            className="pointer-events-auto absolute right-3 top-3 z-[80] flex h-8 w-8 items-center justify-center rounded-full bg-[#e03131] text-[1.35rem] font-bold leading-none text-white shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
          >
            ×
          </button>
        )}
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
