/**
 * One-screen Tasks training board: body position, live feed, coach still,
 * live score, and delay cam together.
 */

import type { ReactNode, RefObject } from 'react'
import type { Landmark, ReferencePhoto, ScoreResult, ShapeDef } from '../types'
import { CameraStage } from './CameraStage'
import { ReferenceStill } from './ReferenceStill'
import { TaskDelayCam } from './TaskDelayCam'

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
}

function scoreColor(n: number): string {
  if (n >= 85) return 'var(--good)'
  if (n >= 70) return 'var(--accent)'
  if (n >= 50) return 'var(--warn)'
  return 'var(--bad)'
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
}: Props) {
  const holding = Boolean(score.holdReady)
  const close = Boolean(score.nearHit)
  const status = holding ? 'HOLDING' : close ? 'ALMOST — one piece off' : 'Looking'

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-xl border border-[var(--accent)]/35 bg-[#121f1a] p-3">
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
        </p>
        {holding && (
          <p className="mt-2 text-base font-semibold text-[var(--good)]">Hold it.</p>
        )}
        {close && score.mainCorrection && (
          <p className="mt-2 text-base font-semibold text-[var(--warn)]">{score.mainCorrection}</p>
        )}
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)]">
        <div className="min-w-0">
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
          />
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Skeleton: green = that line is in, yellow = close, red = the correction.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[#0d1218]">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Coach still — picture of the idea, not a photo match
            </p>
            <ReferenceStill
              shapeId={shape.id}
              photos={referencePhotos}
              alt={shape.name}
              className="max-h-56 w-full object-contain sm:max-h-64"
              emptyLabel="No coach still for this shape yet"
            />
          </div>

          {hitPreviewUrl && (
            <div className="overflow-hidden rounded-lg border border-[var(--good)]/40 bg-black/40">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--good)]">
                Your last hit
              </p>
              <img src={hitPreviewUrl} alt="Last hit" className="max-h-28 w-full object-contain" />
            </div>
          )}

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

          <TaskDelayCam stream={stream} cameraOn={cameraRunning} mirror={mirror} compact />
        </div>
      </div>

      {cameraControls}
      {cameraError && (
        <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          {cameraError}
        </p>
      )}
    </div>
  )
}
