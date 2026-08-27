/**
 * Tasks 2 — class-pace guided sequences.
 * Voice leads at gym speed. Grades do not gate. After the run: replay,
 * snapshotted shapes, scores, and written cues for next time.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { FLOW_SEQUENCES, getFlowSequence, type FlowSequence } from '../config/tasks2'
import { getShape } from '../config/shapes'
import { DELAY_MAX, useDelayCam } from '../hooks/useDelayCam'
import { useSpeechCoach } from '../hooks/useSpeechCoach'
import {
  getCaptureBlob,
  saveCapture,
  snapshotCanvas,
} from '../lib/captureStore'
import {
  createId,
  flowHistoryForSequence,
  loadFlowProgress,
  recordFlowCompletion,
  saveFlowAnalysis,
  saveFlowProgress,
} from '../lib/storage'
import { writtenCues } from '../lib/taskAnalysis'
import type {
  Athlete,
  FlowProgress,
  FlowRunReport,
  FlowStepSnap,
  ReferencePhoto,
  ScoreResult,
} from '../types'
import { FlowShareActions } from './FlowShareActions'
import { ShapeStillStrip } from './ShapeStillStrip'

type Phase = 'idle' | 'preview' | 'running' | 'replay' | 'review'

type SnapView = FlowStepSnap & { url: string | null }

type Props = {
  athleteId: string | null
  athlete?: Athlete | null
  score: ScoreResult
  scoredShapeId: string
  onRequestShape: (
    shapeId: string,
    stance?: 'left' | 'right' | 'auto',
    opts?: { profileOk?: boolean },
  ) => void
  referencePhotos: ReferencePhoto[]
  voiceEnabled: boolean
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  cameraRunning: boolean
  stream: MediaStream | null
  onEnsureCamera?: () => void
  onCue?: (line: string | null) => void
  onPreviewItems?: (items: { shapeId: string; label: string }[] | null) => void
  onHitPreview?: (blob: Blob) => void
  /** Jump the live camera to fullscreen when the sequence starts. */
  onRequestFullscreen?: () => void
  onExitFullscreen?: () => void
  cameraFullscreen?: boolean
}

function scoreColor(n: number): string {
  if (n >= 85) return 'var(--good)'
  if (n >= 70) return 'var(--accent)'
  if (n >= 50) return 'var(--warn)'
  return 'var(--bad)'
}

function speakDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(650, words * 310 + 220)
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function summaryFor(seq: FlowSequence, steps: FlowStepSnap[]): string {
  const bits = steps.map((s) => `${s.shapeName} ${s.overall}`)
  const avg =
    steps.length > 0
      ? Math.round(steps.reduce((n, s) => n + s.overall, 0) / steps.length)
      : 0
  return `${seq.name}. Average ${avg}/100. ${bits.join(', ')}. These grades do not block you — read the cues and go again.`
}

export function Tasks2Panel({
  athleteId,
  athlete = null,
  score,
  scoredShapeId,
  onRequestShape,
  referencePhotos,
  voiceEnabled,
  canvasRef,
  cameraRunning,
  stream,
  onEnsureCamera,
  onCue,
  onPreviewItems,
  onHitPreview,
  onRequestFullscreen,
  onExitFullscreen,
  cameraFullscreen = false,
}: Props) {
  const [progress, setProgress] = useState<FlowProgress | null>(null)
  const [seqId, setSeqId] = useState(FLOW_SEQUENCES[0]!.id)
  const [phase, setPhase] = useState<Phase>('idle')
  const [beatIndex, setBeatIndex] = useState(-1)
  const [cue, setCue] = useState('')
  const [report, setReport] = useState<FlowRunReport | null>(null)
  const [snaps, setSnaps] = useState<SnapView[]>([])
  const [replayUrl, setReplayUrl] = useState<string | null>(null)
  const [history, setHistory] = useState<FlowRunReport[]>([])
  const [flash, setFlash] = useState<string | null>(null)
  const [seekTo, setSeekTo] = useState<number | null>(null)

  const seq = getFlowSequence(seqId) ?? FLOW_SEQUENCES[0]!
  const runGen = useRef(0)
  const scoreRef = useRef(score)
  const shapeIdRef = useRef(scoredShapeId)
  const streamRef = useRef(stream)
  const snapsRef = useRef<SnapView[]>([])
  const replayUrlRef = useRef<string | null>(null)
  const replayVideoRef = useRef<HTMLVideoElement | null>(null)

  scoreRef.current = score
  shapeIdRef.current = scoredShapeId
  streamRef.current = stream

  const { speakEvent, reset: resetSpeech, supported: speechSupported } = useSpeechCoach(voiceEnabled)
  const delay = useDelayCam(stream, DELAY_MAX, cameraRunning && Boolean(stream))

  useEffect(() => {
    if (!athleteId) {
      setProgress(null)
      setHistory([])
      return
    }
    const p = loadFlowProgress(athleteId)
    setProgress(p)
    if (p.currentId && getFlowSequence(p.currentId)) setSeqId(p.currentId)
    setHistory(flowHistoryForSequence(athleteId, p.currentId ?? seqId))
  }, [athleteId])

  useEffect(() => {
    if (!athleteId) return
    setHistory(flowHistoryForSequence(athleteId, seqId))
  }, [athleteId, seqId, report])

  useEffect(() => {
    onPreviewItems?.(seq.previewShapes)
    const first = seq.previewShapes[0] ?? seq.beats.find((b) => b.shapeId)
    if (first?.shapeId) onRequestShape(first.shapeId)
    return () => onPreviewItems?.(null)
  }, [seq.id, onPreviewItems, onRequestShape])

  useEffect(() => {
    onCue?.(cue || null)
  }, [cue, onCue])

  useEffect(
    () => () => {
      onCue?.(null)
      onPreviewItems?.(null)
      if (replayUrlRef.current) URL.revokeObjectURL(replayUrlRef.current)
      for (const s of snapsRef.current) {
        if (s.url) URL.revokeObjectURL(s.url)
      }
    },
    [onCue, onPreviewItems],
  )

  const speakLine = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        let settled = false
        const done = () => {
          if (settled) return
          settled = true
          resolve()
        }
        const estimate = speakDurationMs(text)
        if (!voiceEnabled || !speechSupported) {
          window.setTimeout(done, estimate)
          return
        }
        speakEvent(text, false, done)
        window.setTimeout(done, estimate + 8000)
      }),
    [speakEvent, voiceEnabled, speechSupported],
  )

  const takeSnapshot = useCallback(
    async (
      shapeId: string,
      atSec: number,
      frozen?: ScoreResult,
      blobOverride?: Blob | null,
    ): Promise<SnapView | null> => {
      if (!athleteId) return null
      const shape = getShape(shapeId)
      const live = frozen ?? scoreRef.current
      const blob = blobOverride ?? snapshotCanvas(canvasRef.current)
      const captureId = createId('snap')
      if (blob) {
        onHitPreview?.(blob)
        try {
          await saveCapture(
            {
              id: captureId,
              athleteId,
              taskId: seq.id,
              shapeId,
              shapeName: shape?.name ?? shapeId,
              kind: 'snapshot',
              createdAt: new Date().toISOString(),
              holdSeconds: 0,
            },
            blob,
          )
        } catch {
          /* optional */
        }
      }
      const view: SnapView = {
        shapeId,
        shapeName: shape?.name ?? shapeId,
        overall: live.overall,
        cues: writtenCues(live, shapeId, 3),
        captureId: blob ? captureId : null,
        atSec,
        url: blob ? URL.createObjectURL(blob) : null,
      }
      return view
    },
    [athleteId, canvasRef, onHitPreview, seq.id],
  )

  const stopRun = useCallback(() => {
    runGen.current += 1
    resetSpeech()
    setPhase('idle')
    setBeatIndex(-1)
    setCue('')
    onExitFullscreen?.()
    setFlash('Stopped. The show can start again whenever you are ready.')
    window.setTimeout(() => setFlash(null), 2500)
  }, [onExitFullscreen, resetSpeech])

  const finishRun = useCallback(
    async (seqRun: FlowSequence, collected: SnapView[]) => {
      const blob = await delay.flushRollingBlob()
      if (replayUrlRef.current) URL.revokeObjectURL(replayUrlRef.current)
      const url = blob && blob.size > 800 ? URL.createObjectURL(blob) : null
      replayUrlRef.current = url
      setReplayUrl(url)

      let replayCaptureId: string | null = null
      if (athleteId && blob && blob.size > 800) {
        replayCaptureId = createId('clip')
        try {
          await saveCapture(
            {
              id: replayCaptureId,
              athleteId,
              taskId: seqRun.id,
              shapeId: seqRun.previewShapes[0]?.shapeId ?? 'handstand',
              shapeName: seqRun.nickname,
              kind: 'clip',
              createdAt: new Date().toISOString(),
              holdSeconds: delay.capturedSec(),
            },
            blob,
          )
        } catch {
          replayCaptureId = null
        }
      }

      const steps: FlowStepSnap[] = collected.map((s) => ({
        shapeId: s.shapeId,
        shapeName: s.shapeName,
        overall: s.overall,
        cues: s.cues,
        captureId: s.captureId,
        atSec: s.atSec,
        clipId: replayCaptureId,
      }))
      const built: FlowRunReport = {
        id: createId('flow'),
        athleteId: athleteId ?? 'none',
        sequenceId: seqRun.id,
        sequenceName: seqRun.name,
        nickname: seqRun.nickname,
        createdAt: new Date().toISOString(),
        replayCaptureId,
        steps,
        summary: summaryFor(seqRun, steps),
        instagramHandle: athlete?.instagramHandle,
      }
      if (athleteId) {
        saveFlowAnalysis(built)
        const next = recordFlowCompletion(athleteId, seqRun.id)
        setProgress(next)
      }
      setReport(built)
      setSnaps(collected)
      snapsRef.current = collected
      onExitFullscreen?.()
      setPhase('replay')
      setCue('Watch your run. Scrub, then continue to the grades.')
    },
    [athlete?.instagramHandle, athleteId, delay, onExitFullscreen],
  )

  const startSequence = useCallback(
    async (seqRun: FlowSequence) => {
      if (!athleteId) {
        setFlash('Select or create an athlete first.')
        window.setTimeout(() => setFlash(null), 2500)
        return
      }
      onEnsureCamera?.()
      onRequestFullscreen?.()
      runGen.current += 1
      const gen = runGen.current
      const alive = () => gen === runGen.current

      for (const s of snapsRef.current) {
        if (s.url) URL.revokeObjectURL(s.url)
      }
      snapsRef.current = []
      setSnaps([])
      setReport(null)
      setSeekTo(null)
      resetSpeech()
      for (let i = 0; i < 25 && !streamRef.current; i++) {
        await wait(120)
        if (!alive()) return
      }
      delay.restartRolling(streamRef.current)
      onRequestFullscreen?.()
      await wait(350)
      if (!alive()) return
      setPhase('preview')
      setBeatIndex(-1)
      setCue(seqRun.previewSpeak)
      const first = seqRun.previewShapes[0]
      if (first) onRequestShape(first.shapeId)

      await speakLine(seqRun.previewSpeak)
      if (!alive()) return
      await wait(700)
      if (!alive()) return

      setPhase('running')
      const collected: SnapView[] = []
      let currentShape = first?.shapeId ?? seqRun.beats.find((b) => b.shapeId)?.shapeId ?? 'stand_clean'

      const huntBest = async (shapeId: string, windowMs: number, minMs: number) => {
        const started = performance.now()
        let bestOverall = -1
        let bestFrozen: ScoreResult | null = null
        let bestBlob: Blob | null = null
        let bestAt = delay.capturedSec()
        while (performance.now() - started < windowMs) {
          if (!alive()) return
          await wait(70)
          if (performance.now() - started < minMs) continue
          const live = scoreRef.current
          if (live.overall <= bestOverall) continue
          bestOverall = live.overall
          bestFrozen = {
            ...live,
            criteria: live.criteria.map((c) => ({ ...c })),
          }
          bestBlob = snapshotCanvas(canvasRef.current)
          bestAt = delay.capturedSec()
        }
        if (!bestFrozen) {
          const view = await takeSnapshot(shapeId, delay.capturedSec())
          if (view) collected.push(view)
          return
        }
        const view = await takeSnapshot(shapeId, bestAt, bestFrozen, bestBlob)
        if (view) collected.push(view)
      }

      for (let i = 0; i < seqRun.beats.length; i++) {
        if (!alive()) return
        const beat = seqRun.beats[i]!
        if (beat.shapeId) {
          currentShape = beat.shapeId
          onRequestShape(beat.shapeId, beat.stance ?? 'auto', {
            profileOk: Boolean(beat.profileOk),
          })
        }
        setBeatIndex(i)
        setCue(beat.speak)

        let snapP: Promise<void> = Promise.resolve()
        if (beat.snapshotBestMs != null) {
          snapP = huntBest(currentShape, beat.snapshotBestMs, beat.snapshotMinMs ?? 0)
        } else if (beat.snapshotAtMs != null) {
          snapP = wait(beat.snapshotAtMs).then(async () => {
            if (!alive()) return
            const view = await takeSnapshot(currentShape, delay.capturedSec())
            if (view) collected.push(view)
          })
        }

        await Promise.all([speakLine(beat.speak), snapP])
        if (!alive()) return
        await wait(beat.pauseMs ?? 200)
      }

      if (!alive()) return
      setCue('And clean. Here is your replay.')
      await finishRun(seqRun, collected)
    },
    [
      athleteId,
      delay,
      finishRun,
      onEnsureCamera,
      onRequestFullscreen,
      onRequestShape,
      resetSpeech,
      speakLine,
      takeSnapshot,
    ],
  )

  const selectSeq = (id: string) => {
    if (phase === 'preview' || phase === 'running') return
    setSeqId(id)
    setPhase('idle')
    setReport(null)
    if (athleteId) {
      const p = loadFlowProgress(athleteId)
      const next = { ...p, currentId: id }
      saveFlowProgress(next)
      setProgress(next)
    }
  }

  const nextSequence = () => {
    const idx = FLOW_SEQUENCES.findIndex((s) => s.id === seq.id)
    const next = FLOW_SEQUENCES[idx + 1] ?? FLOW_SEQUENCES[0]!
    selectSeq(next.id)
    setPhase('idle')
    setCue('')
  }

  const openHistoryReplay = async (r: FlowRunReport) => {
    if (!r.replayCaptureId) return
    const blob = await getCaptureBlob(r.replayCaptureId)
    if (!blob) return
    if (replayUrlRef.current) URL.revokeObjectURL(replayUrlRef.current)
    const url = URL.createObjectURL(blob)
    replayUrlRef.current = url
    setReplayUrl(url)
    setReport(r)
    setSeekTo(null)
    const views: SnapView[] = []
    for (const step of r.steps) {
      let urlImg: string | null = null
      if (step.captureId) {
        const b = await getCaptureBlob(step.captureId)
        if (b) urlImg = URL.createObjectURL(b)
      }
      views.push({ ...step, url: urlImg })
    }
    for (const s of snapsRef.current) {
      if (s.url) URL.revokeObjectURL(s.url)
    }
    snapsRef.current = views
    setSnaps(views)
    setPhase('replay')
  }

  useEffect(() => {
    if (seekTo == null) return
    const v = replayVideoRef.current
    if (!v) return
    const apply = () => {
      const t = Math.max(0, seekTo - 0.35)
      if (Number.isFinite(v.duration) && v.duration > 0) {
        v.currentTime = Math.min(t, Math.max(0, v.duration - 0.05))
      } else {
        v.currentTime = t
      }
    }
    if (v.readyState >= 1) apply()
    else v.addEventListener('loadedmetadata', apply, { once: true })
  }, [seekTo, replayUrl])

  const askedBeat = phase === 'running' ? seq.beats[beatIndex] : null
  const askedShapeId =
    askedBeat?.shapeId ??
    [...seq.beats.slice(0, Math.max(0, beatIndex + 1))].reverse().find((b) => b.shapeId)?.shapeId ??
    seq.previewShapes[0]?.shapeId

  const completions = progress?.completions[seq.id] ?? 0
  const busy = phase === 'preview' || phase === 'running'

  const startBar = (
    <div className="flex flex-wrap gap-2">
      {!busy && phase !== 'replay' && (
        <button
          type="button"
          onClick={() => void startSequence(seq)}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
        >
          {completions > 0 ? 'Go again — full screen' : 'Start sequence — full screen'}
        </button>
      )}
      {!busy && !cameraFullscreen && (
        <button
          type="button"
          onClick={() => onRequestFullscreen?.()}
          className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
        >
          Full screen first
        </button>
      )}
      {busy && (
        <button
          type="button"
          onClick={stopRun}
          className="rounded-lg border border-[var(--warn)]/70 px-3 py-2 text-sm text-[var(--warn)]"
        >
          Stop
        </button>
      )}
    </div>
  )

  return (
    <>
      {cameraFullscreen && phase !== 'replay' && (
        <div className="pointer-events-auto fixed bottom-3 left-1/2 z-[95] w-[min(96vw,34rem)] -translate-x-1/2 rounded-2xl border border-white/25 bg-black/80 p-3 text-white shadow-2xl backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
            {busy ? 'Stay with the voice' : seq.nickname}
          </p>
          {busy ? (
            <p className="mt-1 text-sm font-semibold leading-snug">{cue}</p>
          ) : (
            <>
              <label className="mt-1 block text-[11px] text-white/70">
                Sequence
                <select
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/70 px-2 py-1.5 text-sm text-white"
                  value={seq.id}
                  onChange={(e) => selectSeq(e.target.value)}
                >
                  {FLOW_SEQUENCES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-1 text-[11px] text-white/60">{seq.previewSpeak}</p>
            </>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {startBar}
            <button
              type="button"
              onClick={() => onExitFullscreen?.()}
              className="rounded-lg border border-white/25 px-3 py-2 text-sm"
            >
              Exit full screen
            </button>
          </div>
        </div>
      )}

    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3">
      <div className="sticky top-0 z-30 -mx-1 mb-2 rounded-lg border border-[var(--accent)]/35 bg-[var(--panel)] p-2 shadow-lg">
        {startBar}
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          Start jumps into full screen on the live camera so you can get set. Or tap Full screen
          first, then start from the camera.
        </p>
      </div>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Tasks 2 · class flow
          </p>
          <h2 className="text-base font-semibold text-[var(--text)]">Guided sequences</h2>
          <p className="mt-1 text-[12px] leading-snug text-[var(--muted)]">
            Same verbal guides as class. Flaws and accidents are fine — the show goes on.
            We grade after, with a replay and written cues. Nothing here is a gate.
          </p>
        </div>
        <p className="text-[11px] text-[var(--muted)]">
          {completions > 0 ? `${completions}× this sequence` : 'New sequence'}
        </p>
      </div>

      {!athleteId && (
        <p className="mb-2 rounded-lg border border-[var(--warn)]/40 bg-[#2a2410] px-3 py-2 text-sm text-[var(--warn)]">
          Select or create an athlete to save replays and track grades over time.
        </p>
      )}

      <ol className="mb-3 max-h-48 space-y-1 overflow-y-auto text-sm">
        {FLOW_SEQUENCES.map((s) => {
          const count = progress?.completions[s.id] ?? 0
          const selected = s.id === seq.id
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => selectSeq(s.id)}
                className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left ${
                  selected
                    ? 'bg-[var(--accent-dim)] text-white'
                    : 'text-[var(--text)] hover:bg-[#243040]'
                } disabled:opacity-50`}
              >
                <span className="mt-0.5 w-[3.4rem] shrink-0 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  {count > 0 ? `${count}× done` : 'Open'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{s.name}</span>
                  <span className="mt-0.5 block font-mono text-[11px] tracking-wide text-[var(--accent)]">
                    {s.nickname}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[var(--muted)]">{s.description}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="mb-3 rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          This sequence · {seq.nickname}
        </p>
        <p className="mb-2 text-sm font-semibold text-[var(--text)]">{seq.name}</p>
        <ShapeStillStrip
          items={seq.previewShapes}
          photos={referencePhotos}
          activeShapeId={askedShapeId}
        />
        <p className="mt-2 text-[12px] leading-snug text-[var(--muted)]">{seq.previewSpeak}</p>

        {busy && (
          <div className="mt-3 rounded-lg border border-[var(--accent)]/40 bg-[#102820] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              {phase === 'preview' ? 'Naming the sequence' : 'Class flow — stay with the voice'}
            </p>
            <p className="text-sm font-semibold leading-snug text-[var(--text)]">{cue}</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Live grade {score.overall}/100 on {getShape(shapeIdRef.current)?.name ?? 'this shape'} — not a
              gate.
            </p>
          </div>
        )}

        <div className="mt-3">{startBar}</div>
      </div>

      {flash && <p className="mb-2 text-sm text-[var(--accent)]">{flash}</p>}

      {phase === 'replay' && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2 text-white">
            <p className="text-sm font-semibold">Your run · {seq.nickname} — scrub to each shape</p>
            <button
              type="button"
              onClick={() => {
                setPhase('review')
                setCue('')
              }}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f]"
            >
              Continue to grades
            </button>
          </div>
          {replayUrl ? (
            <video
              ref={replayVideoRef}
              src={replayUrl}
              className="min-h-0 flex-1 w-full bg-black object-contain"
              controls
              autoPlay
              playsInline
            />
          ) : (
            <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/70">
              No replay buffer this time (keep the camera on for the whole sequence). Your snapshots and
              grades are still saved.
            </p>
          )}
          {snaps.length > 0 && (
            <div className="shrink-0 border-t border-white/15 bg-black/80 px-3 py-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                Snapshots — tap to jump in the replay
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {snaps.map((s, i) => (
                  <button
                    key={`${s.shapeId}-${i}`}
                    type="button"
                    onClick={() => s.atSec != null && setSeekTo(s.atSec)}
                    className="w-24 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-black text-left"
                  >
                    {s.url ? (
                      <img src={s.url} alt={s.shapeName} className="h-16 w-full object-contain" />
                    ) : (
                      <div className="flex h-16 items-center justify-center text-[10px] text-white/50">
                        No still
                      </div>
                    )}
                    <p className="px-1 py-0.5 text-[10px] font-semibold text-white">{s.shapeName}</p>
                    <p className="px-1 pb-1 text-[10px] tabular-nums" style={{ color: scoreColor(s.overall) }}>
                      {s.overall}/100
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'review' && report && (
        <div className="rounded-lg border border-[var(--accent)]/40 bg-[#121f1a] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Written analysis · not a gate
          </p>
          <h3 className="text-sm font-semibold text-[var(--text)]">{report.sequenceName}</h3>
          <p className="mt-1 text-sm leading-snug text-[var(--text)]">{report.summary}</p>
          {replayUrl && (
            <video
              src={replayUrl}
              className="mt-2 max-h-48 w-full rounded-lg bg-black object-contain"
              controls
              playsInline
            />
          )}
          <ol className="mt-3 space-y-2">
            {snaps.map((s, i) => (
              <li
                key={`${s.shapeId}-${i}`}
                className="overflow-hidden rounded-md border border-[var(--panel-border)] bg-[#0d1218]"
              >
                <div className="flex gap-2">
                  {s.url && (
                    <img src={s.url} alt={s.shapeName} className="h-24 w-24 shrink-0 object-contain bg-black" />
                  )}
                  <div className="min-w-0 flex-1 p-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-[var(--text)]">{s.shapeName}</span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: scoreColor(s.overall) }}>
                        {s.overall}/100
                      </span>
                    </div>
                    {s.cues.length > 0 ? (
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] leading-snug text-[var(--text)]">
                        {s.cues.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-[12px] text-[var(--good)]">
                        Lines look in on this snapshot. Keep that body position next time.
                      </p>
                    )}
                    {s.atSec != null && replayUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhase('replay')
                          setSeekTo(s.atSec ?? 0)
                        }}
                        className="mt-1 text-[11px] text-[var(--accent)] underline"
                      >
                        Jump to this shape in the replay
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void startSequence(seq)}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
            >
              Go again
            </button>
            <button
              type="button"
              onClick={nextSequence}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
            >
              Next sequence
            </button>
            {replayUrl && (
              <button
                type="button"
                onClick={() => setPhase('replay')}
                className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
              >
                Watch replay again
              </button>
            )}
          </div>
          <div className="mt-3">
            <FlowShareActions
              report={report}
              athlete={athlete}
              onUpdated={(next) => {
                setReport(next)
                if (athleteId) setHistory(flowHistoryForSequence(athleteId, seqId))
              }}
            />
          </div>
        </div>
      )}

      {history.length > 0 && phase !== 'replay' && (
        <div className="mt-3 rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Progress on {seq.nickname}
          </p>
          <p className="mb-2 text-[11px] text-[var(--muted)]">
            Watch the grades climb over time. Open a run, or download the video and written
            analysis to keep or post.
          </p>
          <ul className="space-y-2">
            {history.slice(0, 8).map((h) => {
              const avg =
                h.steps.length > 0
                  ? Math.round(h.steps.reduce((n, s) => n + s.overall, 0) / h.steps.length)
                  : 0
              return (
                <li
                  key={h.id}
                  className="rounded-md border border-[var(--panel-border)] bg-[#0d1218] p-2"
                >
                  <button
                    type="button"
                    onClick={() => void openHistoryReplay(h)}
                    className="flex w-full items-center justify-between gap-2 text-left text-sm hover:text-[var(--accent)]"
                  >
                    <span className="text-[12px] text-[var(--muted)]">
                      {new Date(h.createdAt).toLocaleString()}
                    </span>
                    <span className="font-semibold tabular-nums" style={{ color: scoreColor(avg) }}>
                      {avg}/100
                    </span>
                  </button>
                  <div className="mt-2">
                    <FlowShareActions
                      report={h}
                      athlete={athlete}
                      compact
                      onUpdated={(next) => {
                        setHistory((list) => list.map((x) => (x.id === next.id ? next : x)))
                        if (report?.id === next.id) setReport(next)
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
    </>
  )
}
