/**
 * One-screen Tasks training board: body position, live feed, coach still,
 * live score, and delay cam together. Fullscreen camera puts delay cam
 * bottom-right, the reference still bottom-left, and the live score on top.
 */

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { Landmark, ReferencePhoto, ScoreResult, ShapeDef } from '../types'
import { CameraStage } from './CameraStage'
import { HitCheckOverlay } from './HitCheckOverlay'
import { ReferenceStill } from './ReferenceStill'
import { TaskDelayCam } from './TaskDelayCam'

export type TaskLiveKind = 'looking' | 'close' | 'holding' | 'gotit'

export type TaskLiveUi = {
  liveKind: TaskLiveKind
  holdProgress: number
  holdRequired: number
}

type Props = {
  shape: ShapeDef
  score: ScoreResult
  qualityThreshold: number
  referencePhotos: ReferencePhoto[]
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  landmarks: Landmark[] | null
  mirror: boolean
  showAngles: boolean
  cameraRunning: boolean
  demoMode: boolean
  stream: MediaStream | null
  cameraControls: ReactNode
  cameraError: string | null
  hitPreviewUrl: string | null
  liveUi?: TaskLiveUi | null
  onSkipNextTask?: () => void
}

function scoreColor(n: number): string {
  if (n >= 85) return 'var(--good)'
  if (n >= 70) return 'var(--accent)'
  if (n >= 50) return 'var(--warn)'
  return 'var(--bad)'
}

function NextTaskArrow({ onClick, large }: { onClick: () => void; large?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="App not working right? Next task"
      className={`pointer-events-auto flex flex-col items-center justify-center rounded-2xl border border-white/25 bg-black/55 text-white shadow-lg backdrop-blur-sm hover:bg-black/75 ${
        large ? 'h-24 w-20' : 'h-16 w-14'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className={large ? 'h-12 w-12' : 'h-8 w-8'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
      <span className={`font-semibold uppercase tracking-wide ${large ? 'text-[11px]' : 'text-[9px]'}`}>
        Next task
      </span>
    </button>
  )
}

export function TasksWorkspace({
  shape,
  score,
  qualityThreshold,
  referencePhotos,
  videoRef,
  canvasRef,
  landmarks,
  mirror,
  showAngles,
  cameraRunning,
  demoMode,
  stream,
  cameraControls,
  cameraError,
  hitPreviewUrl,
  liveUi,
  onSkipNextTask,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const [hitBurst, setHitBurst] = useState(0)
  const [hitKind, setHitKind] = useState<'hit' | 'gotit'>('hit')
  const wasReady = useRef(false)
  const wasGotit = useRef(false)

  const holding = Boolean(score.holdReady) || liveUi?.liveKind === 'holding'
  const close = Boolean(score.nearHit)
  const status = holding ? 'HOLDING' : close ? 'ALMOST — one piece off' : 'Looking'
  const snapshotShoulders = score.criteria.find(
    (c) => c.id === 'shoulders' || c.id === 'shoulders_open',
  )
  const showShoulderNote =
    holding &&
    (shape.id === 'lunge_start' ||
      shape.id === 'lunge_land' ||
      shape.id === 'lever' ||
      shape.id === 'passe') &&
    snapshotShoulders &&
    snapshotShoulders.score < 85

  const remain =
    liveUi && liveUi.liveKind === 'holding' && liveUi.holdRequired > 0.2
      ? Math.max(0, liveUi.holdRequired - liveUi.holdProgress)
      : null
  const countdown =
    remain !== null && liveUi && liveUi.holdRequired <= 3.05 && liveUi.holdRequired >= 2.5
      ? Math.max(1, Math.ceil(remain))
      : null

  useEffect(() => {
    if (score.holdReady && !wasReady.current) {
      wasReady.current = true
      setHitKind('hit')
      setHitBurst((n) => n + 1)
    }
    if (!score.holdReady) wasReady.current = false
  }, [score.holdReady])

  useEffect(() => {
    if (liveUi?.liveKind === 'gotit' && !wasGotit.current) {
      wasGotit.current = true
      setHitKind('gotit')
      setHitBurst((n) => n + 1)
    }
    if (liveUi?.liveKind !== 'gotit') wasGotit.current = false
  }, [liveUi?.liveKind])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [fullscreen])

  const pipReference = (
    <div
      className={
        fullscreen
          ? 'pointer-events-none fixed bottom-3 left-3 z-[90] w-[min(38vw,220px)] overflow-hidden rounded-xl border border-white/30 bg-black/70 shadow-2xl sm:bottom-4 sm:left-4'
          : 'overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[#0d1218]'
      }
    >
      <p
        className={`px-2 py-1 font-semibold uppercase tracking-wider ${
          fullscreen
            ? 'text-[10px] text-white/80'
            : 'px-3 py-1.5 text-[10px] text-[var(--muted)]'
        }`}
      >
        {fullscreen ? 'Reference' : 'Coach still — picture of the idea, not a photo match'}
      </p>
      <ReferenceStill
        shapeId={shape.id}
        photos={referencePhotos}
        alt={shape.name}
        className={
          fullscreen
            ? 'max-h-36 w-full object-contain sm:max-h-44'
            : 'max-h-56 w-full object-contain sm:max-h-64'
        }
        emptyLabel="No coach still for this shape yet"
      />
    </div>
  )

  const delayWrap = (
    <div
      className={
        fullscreen
          ? 'pointer-events-auto fixed bottom-3 right-3 z-[90] w-[min(42vw,260px)] sm:bottom-4 sm:right-4'
          : ''
      }
    >
      <TaskDelayCam
        stream={stream}
        cameraOn={cameraRunning}
        mirror={mirror}
        compact
        pip={fullscreen}
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <section className={`rounded-xl border border-[var(--accent)]/35 bg-[#121f1a] p-3 ${fullscreen ? 'hidden' : ''}`}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Hit this body position
        </p>
        <h2 className="text-xl font-semibold text-[var(--text)]">{shape.name}</h2>
        <p className="mt-1 text-sm leading-snug text-[var(--text)] sm:text-base">
          {shape.bodyPosition ?? shape.description}
        </p>
        <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
          Pass when this body position is true. The still is a picture of the
          idea — you do not have to match the photo.
          {shape.id === 'lunge_start' || shape.id === 'lunge_land' || shape.id === 'lever'
            ? ' Starting and landing lunges: hit the lunge first, then open your shoulders as far as you can. We count 3, 2, 1 and snapshot your best open — open shoulders do not block the pass. Legs need 85%.'
            : ''}
          {shape.id === 'passe'
            ? ' Passé: pull the knee up and keep the stance leg straight. Open shoulders are graded on the snapshot, not required to move on.'
            : ''}
          {shape.id === 'lunge_arms_low_v'
            ? ' Low V lunge: we look for the long line from the back foot to the shoulders, plus arms in a low V slightly back. A fake bent back knee from shorts does not block the pass.'
            : ''}
        </p>
        {holding && (
          <p className="mt-2 text-base font-semibold text-[var(--good)]">Hold it.</p>
        )}
        {showShoulderNote && snapshotShoulders && (
          <p className="mt-1 text-sm text-[var(--warn)]">
            Open shoulders {snapshotShoulders.score}/100 on this snapshot — keep reaching
            arms by the ears. This does not block the pass.
          </p>
        )}
        {close && score.mainCorrection && (
          <p className="mt-2 text-base font-semibold text-[var(--warn)]">{score.mainCorrection}</p>
        )}
      </section>

      <div className={`grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)] ${fullscreen ? 'block' : ''}`}>
        <div className={fullscreen ? 'contents' : 'min-w-0'}>
          <div
            className={
              fullscreen
                ? 'fixed inset-0 z-[80] flex flex-col bg-black'
                : 'relative min-w-0'
            }
          >
            <CameraStage
              videoRef={videoRef}
              canvasRef={canvasRef}
              landmarks={landmarks}
              mirror={mirror}
              showAngles={showAngles}
              running={cameraRunning}
              demoMode={demoMode}
              shape={shape}
              score={score}
              fill={fullscreen}
              className={fullscreen ? 'h-full min-h-0 flex-1' : ''}
              overlay={
                <div className="pointer-events-none absolute inset-0 z-20">
                  <HitCheckOverlay burst={hitBurst} kind={hitKind} holding={holding} />

                  <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-end gap-4 rounded-2xl bg-black/55 px-4 py-2 text-center shadow-lg backdrop-blur-sm">
                    <div>
                      <p
                        className="text-4xl font-bold tabular-nums leading-none sm:text-5xl"
                        style={{ color: scoreColor(score.overall) }}
                      >
                        {score.overall}
                      </p>
                      <p
                        className={`mt-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                          holding
                            ? 'text-[var(--good)]'
                            : close
                              ? 'text-[var(--warn)]'
                              : 'text-white/70'
                        }`}
                      >
                        {status}
                      </p>
                    </div>
                    {countdown !== null && (
                      <p className="min-w-[1.2em] text-5xl font-black tabular-nums text-white sm:text-6xl">
                        {countdown}
                      </p>
                    )}
                  </div>

                  <div className="pointer-events-auto absolute right-2 top-2 flex gap-2 sm:right-3 sm:top-3">
                    <button
                      type="button"
                      onClick={() => setFullscreen((v) => !v)}
                      className="rounded-xl border border-white/25 bg-black/55 px-2.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-black/75"
                    >
                      {fullscreen ? 'Exit full screen' : 'Full screen'}
                    </button>
                  </div>

                  {onSkipNextTask && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 sm:right-3">
                      <NextTaskArrow onClick={onSkipNextTask} large={fullscreen} />
                    </div>
                  )}
                </div>
              }
            />
            {!fullscreen && (
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Skeleton: green = that line is in, yellow = close, red = the correction.
                Full screen puts delay cam bottom right and the reference bottom left.
              </p>
            )}
          </div>
        </div>

        <div className={`flex min-w-0 flex-col gap-2 ${fullscreen ? 'pointer-events-none' : ''}`}>
          {pipReference}

          {hitPreviewUrl && !fullscreen && (
            <div className="overflow-hidden rounded-lg border border-[var(--good)]/40 bg-black/40">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--good)]">
                Your last hit
              </p>
              <img src={hitPreviewUrl} alt="Last hit" className="max-h-28 w-full object-contain" />
            </div>
          )}

          {!fullscreen && (
            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Score</p>
                  <p
                    className="text-4xl font-bold tabular-nums leading-none"
                    style={{ color: scoreColor(score.overall) }}
                  >
                    {score.overall}
                  </p>
                </div>
                <p
                  className={`text-right text-sm font-semibold ${
                    holding
                      ? 'text-[var(--good)]'
                      : close
                        ? 'text-[var(--warn)]'
                        : 'text-[var(--muted)]'
                  }`}
                >
                  {status}
                </p>
              </div>
              <div className="mt-2 space-y-1">
                {score.criteria
                  .filter((c) => c.weight >= 10)
                  .sort((a, b) => a.score - b.score)
                  .slice(0, 6)
                  .map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate">{c.label}</span>
                      <span className="tabular-nums font-semibold" style={{ color: scoreColor(c.score) }}>
                        {c.score}
                      </span>
                      <div className="h-1.5 w-16 overflow-hidden rounded bg-[#0d1218]">
                        <div
                          className="h-full rounded"
                          style={{ width: `${c.score}%`, background: scoreColor(c.score) }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
              <p className="mt-2 text-[10px] text-[var(--muted)]">Gate {qualityThreshold}</p>
            </div>
          )}

          {delayWrap}
        </div>
      </div>

      {!fullscreen && cameraControls}
      {cameraError && !fullscreen && (
        <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          {cameraError}
        </p>
      )}
    </div>
  )
}
