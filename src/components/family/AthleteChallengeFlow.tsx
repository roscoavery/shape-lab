import { useEffect, useMemo, useRef, useState } from 'react'
import type { Athlete, HomeworkLog } from '../../types'
import { createId, loadHomeworkLogs, saveHomeworkLogs } from '../../lib/storage'
import { usePoseCamera } from '../../hooks/usePoseCamera'
import { poseLooksHollow, poseLooksLongBody, poseLooksWallSit, poseLooksSidePlank, poseLooksLever } from '../../lib/homeworkPose'
import { RepDetector, PUSHUP_REP_CONFIG, VUP_REP_CONFIG, elbowAngleDeg, hipFoldAngleDeg } from '../../lib/repDetect'
import { perShapeHoldStats, formatSecondsShort } from '../../lib/holdStats'
import {
  FOUNDATION_EXERCISES,
  getFoundationExercise,
  type FoundationExercise,
  type FoundationExerciseId,
} from '../../config/foundationExercises'

/**
 * Foundation challenge flow: pick → angle guidance → challenge → review.
 * Holds run on the camera with a pose gate (timer only counts in position);
 * reps are an arcade stepper. Every next step glows. Results log to the
 * athlete's homework logs and feed personal bests.
 */

type Phase = 'pick' | 'angle' | 'challenge' | 'review'

const AMBER = '#fcd34d'
const GREEN_GLOW = '0 0 12px rgba(74,222,128,0.55), 0 0 32px rgba(74,222,128,0.25)'

function gateCheck(ex: FoundationExercise, landmarks: any): boolean {
  if (!landmarks) return false
  if (ex.gate === 'hollow') return poseLooksHollow(landmarks)
  if (ex.gate === 'longbody') return poseLooksLongBody(landmarks)
  if (ex.gate === 'wallsit') return poseLooksWallSit(landmarks)
  if (ex.gate === 'sideplank') return poseLooksSidePlank(landmarks)
  if (ex.gate === 'lever') return poseLooksLever(landmarks)
  return false
}

function logChallenge(
  athlete: Athlete,
  ex: FoundationExercise,
  value: number,
  method: 'camera' | 'manual',
): void {
  const log: HomeworkLog = {
    id: createId('log'),
    athleteId: athlete.id,
    homeworkId: `foundation:${ex.id}`,
    shapeId: ex.shapeId,
    date: new Date().toISOString(),
    totalHoldSeconds: ex.kind === 'hold' ? Math.round(value) : 0,
    properHoldSeconds: ex.kind === 'hold' && method === 'camera' ? Math.round(value) : undefined,
    method,
    kind: ex.kind === 'hold' ? 'hold' : 'reps',
    reps: ex.kind === 'reps' ? Math.round(value) : undefined,
    sets: ex.kind === 'reps' ? 1 : undefined,
    score: 0,
    sourceLabel: ex.sourceLabel,
    loggedFrom: 'today',
  }
  saveHomeworkLogs([...loadHomeworkLogs(), log])
}

function HoldChallenge({
  ex,
  best,
  onDone,
}: {
  ex: FoundationExercise
  best: number
  onDone: (seconds: number) => void
}) {
  const pose = usePoseCamera()
  const [seconds, setSeconds] = useState(0)
  const [inPosition, setInPosition] = useState(false)
  const [started, setStarted] = useState(false)
  const accRef = useRef(0)
  const lastRef = useRef<number | null>(null)

  useEffect(() => {
    void pose.start()
    return () => pose.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!started || !pose.running) return
    let raf = 0
    const tick = (now: number) => {
      const ok = gateCheck(ex, pose.landmarks)
      setInPosition(ok)
      if (lastRef.current != null && ok) {
        const dt = (now - lastRef.current) / 1000
        accRef.current += dt
        setSeconds(accRef.current)
      }
      lastRef.current = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, pose.running, pose.landmarks, ex])

  const beatBest = best > 0 && seconds > best

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video
          ref={pose.videoRef}
          playsInline
          muted
          className="max-h-[42vh] w-full object-contain"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas ref={pose.canvasRef} className="hidden" />
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${
              inPosition ? 'bg-green-500/90 text-black' : 'bg-black/70 text-white/80'
            }`}
          >
            {inPosition ? '● In position' : '○ Get in position'}
          </span>
          {best > 0 && (
            <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-bold tabular-nums text-amber-200">
              Best {formatSecondsShort(best)}
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <p
            className="text-6xl font-black tabular-nums text-white"
            style={{ textShadow: beatBest ? GREEN_GLOW : '0 0 18px rgba(0,0,0,0.8)' }}
          >
            {formatSecondsShort(seconds)}
          </p>
          {beatBest && (
            <p className="mt-1 text-sm font-black uppercase tracking-widest text-green-300" style={{ textShadow: GREEN_GLOW }}>
              ★ New best!
            </p>
          )}
        </div>
      </div>
      {!pose.running && !pose.error && (
        <p className="text-center text-sm text-[var(--muted)]">Starting camera…</p>
      )}
      {pose.error && (
        <p className="text-center text-sm text-[var(--bad)]">
          Camera unavailable, you can still time yourself with any stopwatch and log it manually.
        </p>
      )}
      {!started ? (
        <button
          type="button"
          onClick={() => {
            accRef.current = 0
            setSeconds(0)
            setStarted(true)
          }}
          disabled={!pose.running}
          className="w-full rounded-2xl bg-amber-300 px-4 py-4 text-lg font-black text-black disabled:opacity-40"
          style={{ animation: 'sl-skill-pulse 2.4s ease-in-out infinite' }}
        >
          Start challenge
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            pose.stop()
            onDone(accRef.current)
          }}
          className="w-full rounded-2xl border border-[var(--panel-border)] px-4 py-4 text-lg font-black text-[var(--text)]"
        >
          Finish, log {formatSecondsShort(accRef.current)}
        </button>
      )}
      <p className="text-center text-xs text-[var(--muted)]">
        The clock only runs while the camera sees your {ex.name.toLowerCase()}. Break form and it pauses.
      </p>
    </div>
  )
}

function RepChallenge({
  ex,
  best,
  onDone,
}: {
  ex: FoundationExercise
  best: number
  onDone: (reps: number) => void
}) {
  const [mode, setMode] = useState<'manual' | 'camera'>('manual')
  const [reps, setReps] = useState(0)
  const [correction, setCorrection] = useState(0)
  const beatBest = best > 0 && reps + correction > best
  const total = Math.max(0, reps + correction)

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['manual', 'camera'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-black ${
              mode === m
                ? 'border-amber-300/60 bg-amber-300/15 text-amber-200'
                : 'border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            {m === 'manual' ? 'Count myself' : 'Camera beta'}
          </button>
        ))}
      </div>

      {mode === 'camera' ? (
        <CameraRepCounter
          ex={ex}
          onRep={() => setReps((r) => r + 1)}
          onCorrect={(d) => setCorrection((c) => c + d)}
          total={total}
          beatBest={beatBest}
          best={best}
        />
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-[var(--muted)]">
            Do your {ex.name.toLowerCase()}, quality reps only, then count them here.
          </p>
          {best > 0 && (
            <p className="text-xs font-bold uppercase tracking-widest text-amber-200">
              Best so far: {best}
            </p>
          )}
          <p
            className="text-8xl font-black tabular-nums text-[var(--text)]"
            style={{ textShadow: beatBest ? GREEN_GLOW : undefined }}
          >
            {total}
          </p>
          {beatBest && (
            <p className="text-sm font-black uppercase tracking-widest text-green-300" style={{ textShadow: GREEN_GLOW }}>
              ★ New best!
            </p>
          )}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setCorrection((c) => c - 1)}
              className="h-16 w-16 rounded-2xl border border-[var(--panel-border)] text-3xl font-black text-[var(--text)]"
              aria-label="One fewer rep"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setCorrection((c) => c + 1)}
              className="h-20 w-20 rounded-2xl bg-amber-300 text-4xl font-black text-black"
              style={{ animation: 'sl-skill-pulse 2.4s ease-in-out infinite' }}
              aria-label="One more rep"
            >
              +
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onDone(total)}
        disabled={total <= 0}
        className="w-full rounded-2xl bg-amber-300 px-4 py-4 text-lg font-black text-black disabled:opacity-40"
        style={total > 0 ? { animation: 'sl-skill-pulse 2.4s ease-in-out infinite' } : undefined}
      >
        Log {total} rep{total === 1 ? '' : 's'}
      </button>
      {mode === 'camera' && (
        <p className="text-center text-[11px] text-[var(--muted)]">
          Beta: the camera can miscount. Tap − / + to fix the count before logging.
        </p>
      )}
    </div>
  )
}

/** Camera rep counter (beta): pose-driven counting with manual correction. */
function CameraRepCounter({
  ex,
  onRep,
  onCorrect,
  total,
  beatBest,
  best,
}: {
  ex: FoundationExercise
  onRep: () => void
  onCorrect: (d: number) => void
  total: number
  beatBest: boolean
  best: number
}) {
  const pose = usePoseCamera()
  const detectorRef = useRef<RepDetector | null>(null)
  const [angle, setAngle] = useState<number | null>(null)
  const [running, setRunning] = useState(false)

  if (!detectorRef.current) {
    detectorRef.current = new RepDetector(ex.id === 'pushup' ? PUSHUP_REP_CONFIG : VUP_REP_CONFIG)
  }

  useEffect(() => {
    void pose.start()
    return () => pose.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!running) return
    let raf = 0
    const tick = () => {
      const lm = pose.landmarks
      const a = ex.id === 'pushup' ? elbowAngleDeg(lm) : hipFoldAngleDeg(lm)
      setAngle(a != null ? Math.round(a) : null)
      if (detectorRef.current?.push(a, performance.now())) {
        onRep()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, pose.landmarks, ex.id])

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video
          ref={pose.videoRef}
          playsInline
          muted
          className="max-h-[36vh] w-full object-contain"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas ref={pose.canvasRef} className="hidden" />
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-3">
          <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-black uppercase tracking-widest text-amber-200">
            Beta counter
          </span>
          {angle != null && (
            <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-bold tabular-nums text-white/80">
              {ex.id === 'pushup' ? 'elbow' : 'hip'} {angle}°
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <p
            className="text-6xl font-black tabular-nums text-white"
            style={{ textShadow: beatBest ? GREEN_GLOW : '0 0 18px rgba(0,0,0,0.8)' }}
          >
            {total}
          </p>
          {best > 0 && (
            <p className="mt-1 text-xs font-bold tabular-nums text-white/70">best {best}</p>
          )}
        </div>
      </div>
      {!running ? (
        <button
          type="button"
          onClick={() => {
            detectorRef.current?.reset()
            setRunning(true)
          }}
          disabled={!pose.running}
          className="w-full rounded-2xl bg-amber-300 px-4 py-3 text-base font-black text-black disabled:opacity-40"
          style={{ animation: 'sl-skill-pulse 2.4s ease-in-out infinite' }}
        >
          Start camera counting
        </button>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onCorrect(-1)}
            className="h-12 w-12 rounded-xl border border-[var(--panel-border)] text-2xl font-black text-[var(--text)]"
            aria-label="Remove one rep"
          >
            −
          </button>
          <p className="text-xs text-[var(--muted)]">fix the count</p>
          <button
            type="button"
            onClick={() => onCorrect(1)}
            className="h-12 w-12 rounded-xl border border-[var(--panel-border)] text-2xl font-black text-[var(--text)]"
            aria-label="Add one rep"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}

export function AthleteChallengeFlow({
  athlete,
  onClose,
}: {
  athlete: Athlete
  onClose: () => void
}) {
  const [phase, setPhase] = useState<Phase>('pick')
  const [exerciseId, setExerciseId] = useState<FoundationExerciseId | null>(null)
  const [result, setResult] = useState<number | null>(null)
  const [wasBest, setWasBest] = useState(false)
  const [tick, setTick] = useState(0)

  const logs = useMemo(() => {
    void tick
    return loadHomeworkLogs().filter((l) => l.athleteId === athlete.id)
  }, [athlete.id, tick])
  const shapeStats = useMemo(() => perShapeHoldStats(logs), [logs])

  const bestFor = (ex: FoundationExercise): number => {
    if (ex.kind === 'hold') {
      const s = shapeStats.find((r) => r.shapeId === ex.shapeId)
      return s?.longest ?? 0
    }
    // Best single session (not lifetime total) — the number to beat.
    const sessionReps = logs
      .filter((l) => (l.kind === 'reps' || l.kind === 'set') && l.shapeId === ex.shapeId)
      .map((l) => Math.round((l.reps ?? 0) * (l.sets ?? 1)))
    return sessionReps.length ? Math.max(...sessionReps) : 0
  }

  const ex = exerciseId ? getFoundationExercise(exerciseId) : null

  const finish = (value: number) => {
    if (!ex) return
    const prevBest = bestFor(ex)
    const isBest = value > prevBest && value > 0
    setWasBest(isBest)
    setResult(value)
    if (value > 0) {
      logChallenge(athlete, ex, value, ex.kind === 'hold' ? 'camera' : 'manual')
      setTick((n) => n + 1)
    }
    setPhase('review')
  }

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-black/80 px-4 pb-36 pt-4"
      style={{ touchAction: 'pan-y' }}
      role="dialog"
      aria-modal
    >
      <div className="mx-auto max-w-lg rounded-3xl border border-amber-300/30 bg-[#141008] p-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
            Foundation challenge
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-xs font-bold text-[var(--muted)]"
          >
            ✕ Close
          </button>
        </div>

        {/* Step indicator */}
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {(['pick', 'angle', 'challenge', 'review'] as Phase[]).map((p, i) => {
            const order: Phase[] = ['pick', 'angle', 'challenge', 'review']
            const active = order.indexOf(phase) >= i
            return (
              <span
                key={p}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  background: active ? AMBER : 'rgba(255,255,255,0.12)',
                  boxShadow: active ? '0 0 8px rgba(251,191,36,0.7)' : undefined,
                }}
              />
            )
          })}
        </div>

        <div className="mt-4">
          {phase === 'pick' && (
            <div className="space-y-2">
              <h3 className="text-lg font-black text-[var(--text)]">Pick your challenge</h3>
              {FOUNDATION_EXERCISES.map((e) => {
                const best = bestFor(e)
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      setExerciseId(e.id)
                      setPhase('angle')
                    }}
                    className="block w-full rounded-2xl border border-amber-300/25 bg-black/40 p-4 text-left"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-black text-[var(--text)]">{e.name}</span>
                      <span className="text-xs tabular-nums text-amber-200/90">
                        {best > 0 ? `best ${e.kind === 'hold' ? formatSecondsShort(best) : best}` : 'no best yet'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{e.tagline}</p>
                  </button>
                )
              })}
            </div>
          )}

          {phase === 'angle' && ex && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-[var(--text)]">{ex.name}</h3>
                {ex.demoVideoUrl ? (
                  <video
                    src={ex.demoVideoUrl}
                    className="mt-2 max-h-56 w-full rounded-2xl bg-black object-contain"
                    controls
                    playsInline
                    loop
                  />
                ) : (
                  <p className="mt-2 rounded-xl border border-dashed border-[var(--panel-border)] bg-black/30 p-3 text-center text-xs text-[var(--muted)]">
                    Coach Ryan's perfect {ex.name.toLowerCase()} demo goes here, coming soon.
                  </p>
                )}
                <p className="mt-1 text-sm font-bold text-amber-200">📷 {ex.angle.best}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{ex.angle.why}</p>
                <p className="mt-2 rounded-xl bg-black/40 p-3 text-xs leading-relaxed text-[var(--muted)]">
                  <span className="font-bold text-[var(--text)]">Set up: </span>{ex.angle.setup}
                </p>
              </div>
              {ex.angle.options.length > 1 && (
                <div className="space-y-2">
                  {ex.angle.options.map((o) => (
                    <div key={o.label} className="rounded-xl border border-[var(--panel-border)] p-3">
                      <p className="text-sm font-bold text-[var(--text)]">
                        {o.label}{' '}
                        <span className="ml-1 rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-200">
                          {o.bestFor === 'both' ? 'best all-round' : `best for ${o.bestFor}`}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{o.why}</p>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setPhase('challenge')}
                className="w-full rounded-2xl bg-amber-300 px-4 py-4 text-lg font-black text-black"
                style={{ animation: 'sl-skill-pulse 2.4s ease-in-out infinite' }}
              >
                I'm set up, start
              </button>
              <button
                type="button"
                onClick={() => setPhase('pick')}
                className="w-full text-center text-xs font-bold text-[var(--muted)]"
              >
                ← Pick a different exercise
              </button>
            </div>
          )}

          {phase === 'challenge' && ex && (
            ex.kind === 'hold' ? (
              <HoldChallenge
                ex={ex}
                best={bestFor(ex)}
                onDone={finish}
              />
            ) : (
              <RepChallenge ex={ex} best={bestFor(ex)} onDone={finish} />
            )
          )}

          {phase === 'review' && ex && result != null && (
            <div className="space-y-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Challenge complete</p>
              <p
                className="text-7xl font-black tabular-nums text-[var(--text)]"
                style={{ textShadow: wasBest ? GREEN_GLOW : undefined }}
              >
                {ex.kind === 'hold' ? formatSecondsShort(result) : result}
              </p>
              <p className="text-sm font-bold text-[var(--muted)]">
                {ex.name} · {ex.kind === 'hold' ? 'hold' : result === 1 ? 'rep' : 'reps'}
              </p>
              {wasBest ? (
                <p
                  className="text-lg font-black uppercase tracking-widest text-green-300"
                  style={{ textShadow: GREEN_GLOW, animation: 'sl-skill-pulse 2.4s ease-in-out infinite' }}
                >
                  ★ New personal best! ★
                </p>
              ) : (
                <p className="text-xs text-[var(--muted)]">Logged. Beat it next time.</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setResult(null)
                  setWasBest(false)
                  setPhase('pick')
                }}
                className="w-full rounded-2xl bg-amber-300 px-4 py-4 text-lg font-black text-black"
                style={{ animation: 'sl-skill-pulse 2.4s ease-in-out infinite' }}
              >
                Next challenge →
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full text-center text-xs font-bold text-[var(--muted)]"
              >
                Done for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
