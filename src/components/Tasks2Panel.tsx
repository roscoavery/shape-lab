/**
 * Tasks 2 — class-pace guided sequences.
 * Voice leads at gym speed. Grades do not gate. After the run: replay,
 * snapshotted shapes, scores, and written cues for next time.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FLOW_SEQUENCES,
  getFlowSequence,
  resolveFlowRun,
  type FlowSequence,
} from '../config/tasks2'
import { getShape } from '../config/shapes'
import { DELAY_MAX, useDelayCam } from '../hooks/useDelayCam'
import { expandLeadCount, useSpeechCoach } from '../hooks/useSpeechCoach'
import { cameraPromptCue, isPhoneBrowser } from '../lib/delayCameraPipeline'
import {
  getCaptureBlob,
  getPoseTrackJson,
  deleteCapture,
  saveCapture,
  savePoseTrackJson,
  snapshotCanvas,
} from '../lib/captureStore'
import { videoFileName } from '../lib/flowShare'
import { uploadAthleteVideo } from '../lib/athleteVideoStore'
import {
  attachHoldClips,
  formatSeconds,
  runHandstandHoldSession,
  type HoldTick,
} from '../lib/handstandHold'
import { saveHoldClipWithOverlay } from '../lib/overlayExport'
import {
  forgetCaptureBlob,
  getRememberedBlob,
  rememberCaptureBlob,
  saveImageToDevice,
  saveResultMessage,
  saveVideoToDevice,
} from '../lib/saveMedia'
import {
  getRememberedPoseTrack,
  parsePoseTrack,
  rememberPoseTrack,
  serializePoseTrack,
} from '../lib/poseTrack'
import { getPoseCandidates } from '../lib/poseCandidates'
import {
  HOLD_BUILD_BANNER,
  HOLD_BUILD_CHIP,
  HOLD_BUILD_LABEL,
  HOLD_PINK_BTN,
  HOLD_PINK_TEXT,
} from '../lib/holdBuild'
import { unlockHoldTones } from '../lib/sounds'
import { HoldDetectHud } from './HoldDetectHud'
import { HoldReplayPlayer } from './HoldReplayPlayer'
import {
  createId,
  flowHistoryForSequence,
  loadFlowProgress,
  recordFlowCompletion,
  removeFlowAnalysis,
  removeHomeworkLog,
  saveFlowAnalysis,
  saveFlowProgress,
} from '../lib/storage'
import { chosenFlowCounts, logHomeworkSequenceRun } from '../lib/homeworkFlow'
import { recordHoldSession, sessionHoldTotal, todayHoldSeconds } from '../lib/holdDay'
import { handstandPeakScore, snapshotLooksRight } from '../lib/scoring'
import { writtenCues } from '../lib/taskAnalysis'
import type {
  Athlete,
  FlowHoldAttempt,
  FlowProgress,
  FlowRunReport,
  FlowStepSnap,
  Landmark,
  ReferencePhoto,
  ScoreResult,
} from '../types'
import { FlowShareActions } from './FlowShareActions'
import { ShapeStillStrip } from './ShapeStillStrip'
import { ReferenceStill } from './ReferenceStill'

type Phase = 'idle' | 'preview' | 'running' | 'holding' | 'finishing' | 'replay' | 'review'

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
  onVoiceEnabledChange?: (on: boolean) => void
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  cameraRunning: boolean
  stream: MediaStream | null
  onEnsureCamera?: () => void | Promise<void>
  onCue?: (line: string | null) => void
  onPreviewItems?: (items: { shapeId: string; label: string }[] | null) => void
  onHitPreview?: (blob: Blob) => void
  /** Jump the live camera to fullscreen when the sequence starts. */
  onRequestFullscreen?: () => void
  onExitFullscreen?: () => void
  cameraFullscreen?: boolean
  landmarks?: Landmark[] | null
  onHoldClock?: (seconds: number | null) => void
  mirror?: boolean
  cameraError?: string | null
  /** Homework / coach assign — select this Class Flow when the page opens. */
  assignedSequenceId?: string | null
  onAssignedSequenceConsumed?: () => void
  onFlowPhase?: (phase: Phase) => void
  onHoldChallenge?: (on: boolean) => void
  onRegisterStart?: (fn: () => void) => void
  onRegisterHoldDone?: (fn: () => void) => void
}

function scoreColor(n: number): string {
  if (n >= 85) return 'var(--good)'
  if (n >= 70) return 'var(--accent)'
  if (n >= 50) return 'var(--warn)'
  return 'var(--bad)'
}

function speakDurationMs(text: string): number {
  const spoken = expandLeadCount(text.trim())
  const words = spoken.split(/\s+/).filter(Boolean).length
  return Math.max(720, words * 310 + 220)
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function snapTitle(s: { shapeId: string; shapeName: string; marker?: 'playhead'; rep?: number; holdSeconds?: number }): string {
  if (s.holdSeconds != null && s.rep != null) return `Hold ${s.rep}`
  if (s.rep != null && s.shapeId === 'handstand') return `Handstand ${s.rep}`
  if (s.marker === 'playhead') return `${s.shapeName} · marker`
  return s.shapeName
}

function summaryFor(seq: FlowSequence, steps: FlowStepSnap[]): string {
  const graded = seq.reviewShapeIds
    ? steps.filter((s) => seq.reviewShapeIds!.includes(s.shapeId))
    : steps
  if (seq.mode === 'hs-hold') {
    const holds = steps.filter((s) => s.holdSeconds != null)
    if (holds.length === 0) {
      return `${seq.name}. No timed handstands this run. Hands on the floor, kick up so both feet leave, then tap Done. Not a gate.`
    }
    const longest = [...holds].sort((a, b) => (b.holdSeconds ?? 0) - (a.holdSeconds ?? 0))[0]!
    const bits = holds.map(
      (s) => `Hold ${s.rep ?? '?'}: ${formatSeconds(s.holdSeconds ?? 0)}`,
    )
    return `${seq.name}. ${holds.length} hold${holds.length === 1 ? '' : 's'}. Longest ${formatSeconds(longest.holdSeconds ?? 0)} (hold ${longest.rep}). ${bits.join(' · ')}. Best-frame stills are graded. Not a gate.`
  }
  const hsReps = graded.filter((s) => s.shapeId === 'handstand' && s.rep != null)
  if (hsReps.length > 1) {
    const bits = hsReps.map((s) => `${s.rep}: ${s.overall}`)
    const avg = Math.round(hsReps.reduce((n, s) => n + s.overall, 0) / hsReps.length)
    return `${seq.name}. ${bits.join(' · ')}. Average ${avg}/100. Assisted or not — we grade the tallest, straightest line on each kick. Not a gate.`
  }
  if (seq.reviewShapeIds?.length === 1 && seq.reviewShapeIds[0] === 'handstand') {
    const hs = graded.find((s) => s.shapeId === 'handstand')
    const score = hs ? `${hs.overall}/100` : 'no clear snapshot'
    const cues = hs?.cues?.length ? ` ${hs.cues.join(' ')}` : ''
    return `${seq.name}. Handstand form ${score}.${cues} Mountain climber and landing lunge are not graded on this run. Not a gate — read the handstand cues and go again.`
  }
  const bits = graded.map((s) => `${s.shapeName} ${s.overall}`)
  const avg =
    graded.length > 0
      ? Math.round(graded.reduce((n, s) => n + s.overall, 0) / graded.length)
      : 0
  return `${seq.name}. Average ${avg}/100. ${bits.join(', ')}. These grades do not block you — read the cues and go again.`
}

const LAST_FLOW_KEY = 'shape-lab.tasks2.lastSeq'

function readLastFlowId(): string | null {
  try {
    const id = sessionStorage.getItem(LAST_FLOW_KEY)
    return id && getFlowSequence(id) ? id : null
  } catch {
    return null
  }
}

function writeLastFlowId(id: string) {
  try {
    sessionStorage.setItem(LAST_FLOW_KEY, id)
  } catch {
    /* private mode */
  }
}

export function Tasks2Panel({
  athleteId,
  athlete = null,
  score,
  scoredShapeId,
  onRequestShape,
  referencePhotos,
  voiceEnabled: _voiceEnabled,
  onVoiceEnabledChange,
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
  landmarks = null,
  onHoldClock,
  mirror = true,
  cameraError = null,
  assignedSequenceId = null,
  onAssignedSequenceConsumed,
  onFlowPhase,
  onHoldChallenge,
  onRegisterStart,
  onRegisterHoldDone,
}: Props) {
  const [progress, setProgress] = useState<FlowProgress | null>(null)
  const [seqId, setSeqId] = useState(() => readLastFlowId() ?? FLOW_SEQUENCES[0]!.id)
  const [runSeq, setRunSeq] = useState<FlowSequence | null>(null)
  const [phaMode, setPhaMode] = useState<'learn' | 'reps'>('reps')
  const [phaReps, setPhaReps] = useState(5)
  const [lemonPlan, setLemonPlan] = useState<'default' | 'custom'>('default')
  const [lemonSets, setLemonSets] = useState(3)
  const [lemonReps, setLemonReps] = useState(10)
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
  const liveSeq = runSeq ?? seq
  const assignedConsumedRef = useRef(onAssignedSequenceConsumed)
  assignedConsumedRef.current = onAssignedSequenceConsumed
  const runGen = useRef(0)
  const scoreRef = useRef(score)
  const shapeIdRef = useRef(scoredShapeId)
  const streamRef = useRef(stream)
  const overlayStreamRef = useRef<MediaStream | null>(null)
  const snapsRef = useRef<SnapView[]>([])
  const replayUrlRef = useRef<string | null>(null)
  const replayVideoRef = useRef<HTMLVideoElement | null>(null)
  const seqListRef = useRef<HTMLOListElement | null>(null)
  const [overlayStream, setOverlayStream] = useState<MediaStream | null>(null)
  const [holdTick, setHoldTick] = useState<HoldTick | null>(null)
  const [activeClipId, setActiveClipId] = useState<string | null>(null)
  const [deviceSave, setDeviceSave] = useState<{
    blob: Blob
    filename: string
    label: string
  } | null>(null)
  const [hitsAsk, setHitsAsk] = useState<{
    id: string
    blob: Blob
    filename: string
    seconds: number
    seqId: string
    nickname: string
  } | null>(null)
  const clipUrlsRef = useRef<Map<string, string>>(new Map())
  const holdDoneRef = useRef(false)
  const flushedHoldRef = useRef<Promise<Blob | null> | null>(null)
  const holdPersistRef = useRef<{ reportId: string; logId: string | null } | null>(null)
  const [holdLogged, setHoldLogged] = useState(true)
  const [holdClipPending, setHoldClipPending] = useState(false)
  const [holdDay, setHoldDay] = useState<{ session: number; today: number } | null>(null)
  const holdWallSecRef = useRef(0)
  const pendingStillsRef = useRef<
    { id: string; blob: Blob; shapeId: string; shapeName: string; seqId: string }[]
  >([])
  const landmarksRef = useRef(landmarks)
  const onHoldClockRef = useRef(onHoldClock)
  const onCueRef = useRef(onCue)
  const onPreviewItemsRef = useRef(onPreviewItems)

  scoreRef.current = score
  shapeIdRef.current = scoredShapeId
  streamRef.current = stream
  overlayStreamRef.current = overlayStream
  landmarksRef.current = landmarks
  onHoldClockRef.current = onHoldClock
  onCueRef.current = onCue
  onPreviewItemsRef.current = onPreviewItems

  const {
    speakEvent,
    reset: resetSpeech,
    unlock: unlockSpeech,
    holdAudio,
    supported: speechSupported,
  } = useSpeechCoach(true)
  const holdChallenge = seq.mode === 'hs-hold' || runSeq?.mode === 'hs-hold'
  // Canvas captureStream is empty / unplayable on iPad. Hold clips use the camera.
  const recordStream = holdChallenge ? stream : overlayStream ?? stream
  const delay = useDelayCam(recordStream, DELAY_MAX, cameraRunning && Boolean(recordStream))

  useEffect(() => {
    onHoldChallenge?.(holdChallenge)
  }, [holdChallenge, onHoldChallenge])

  useEffect(() => {
    if (!cameraRunning) {
      const overlay = overlayStreamRef.current
      const cam = streamRef.current
      if (overlay) {
        for (const t of overlay.getTracks()) {
          if (cam?.getTracks().includes(t)) continue
          try {
            t.stop()
          } catch {
            /* already stopped */
          }
        }
      }
      overlayStreamRef.current = null
      setOverlayStream(null)
      return
    }
    let cancelled = false
    let tries = 0
    const grab = () => {
      if (cancelled) return
      const canvas = canvasRef.current
      if (canvas && canvas.width > 16 && canvas.height > 16) {
        try {
          const captured = canvas.captureStream(30)
          captured.getVideoTracks().forEach((t) => {
            try {
              t.contentHint = 'motion'
            } catch {
              /* Safari may ignore */
            }
          })
          if (!cancelled) {
            overlayStreamRef.current = captured
            setOverlayStream(captured)
          }
          return
        } catch {
          if (!cancelled) {
            overlayStreamRef.current = streamRef.current
            setOverlayStream(streamRef.current)
          }
          return
        }
      }
      if (++tries < 50) window.setTimeout(grab, 120)
      else if (!cancelled) {
        overlayStreamRef.current = streamRef.current
        setOverlayStream(streamRef.current)
      }
    }
    grab()
    return () => {
      cancelled = true
    }
  }, [cameraRunning, canvasRef])

  useEffect(() => {
    if (!athleteId) {
      setProgress(null)
      setHistory([])
      return
    }
    const p = loadFlowProgress(athleteId)
    setProgress(p)
    const assigned =
      assignedSequenceId && getFlowSequence(assignedSequenceId)
        ? assignedSequenceId
        : null
    if (assigned) {
      setSeqId(assigned)
      writeLastFlowId(assigned)
      if (p.currentId !== assigned) {
        const saved = { ...p, currentId: assigned }
        saveFlowProgress(saved)
        setProgress(saved)
      }
      setHistory(flowHistoryForSequence(athleteId, assigned))
      assignedConsumedRef.current?.()
      return
    }
    const last = readLastFlowId()
    if (last) {
      setSeqId(last)
      if (p.currentId !== last) {
        const saved = { ...p, currentId: last }
        saveFlowProgress(saved)
        setProgress(saved)
      }
      setHistory(flowHistoryForSequence(athleteId, last))
      return
    }
    const nextId =
      p.currentId && getFlowSequence(p.currentId) ? p.currentId : FLOW_SEQUENCES[0]!.id
    setSeqId(nextId)
    writeLastFlowId(nextId)
    setHistory(flowHistoryForSequence(athleteId, nextId))
  }, [athleteId, assignedSequenceId])

  useEffect(() => {
    if (!athleteId) return
    setHistory(flowHistoryForSequence(athleteId, seqId))
  }, [athleteId, seqId, report])

  useEffect(() => {
    setHoldDay((prev) => ({
      session: prev?.session ?? 0,
      today: todayHoldSeconds(athleteId),
    }))
  }, [athleteId])

  useEffect(() => {
    onPreviewItems?.(seq.previewShapes)
    const setup = seq.setupShapeId
    const first = setup
      ? { shapeId: setup }
      : (seq.previewShapes[0] ?? seq.beats.find((b) => b.shapeId))
    if (first?.shapeId) onRequestShape(first.shapeId, 'auto', { profileOk: true })
    return () => onPreviewItems?.(null)
  }, [seq.id, onPreviewItems, onRequestShape])

  useEffect(() => {
    onCue?.(cue || null)
  }, [cue, onCue])

  useEffect(
    () => () => {
      onCueRef.current?.(null)
      onPreviewItemsRef.current?.(null)
      for (const s of snapsRef.current) {
        if (s.url) URL.revokeObjectURL(s.url)
      }
      for (const url of clipUrlsRef.current.values()) URL.revokeObjectURL(url)
      clipUrlsRef.current.clear()
      replayUrlRef.current = null
      onHoldClockRef.current?.(null)
    },
    [],
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
        const spoken = text.trim()
        if (!spoken || holdDoneRef.current) {
          done()
          return
        }
        const estimate = speakDurationMs(spoken)
        if (!speechSupported) {
          window.setTimeout(done, estimate)
          return
        }
        speakEvent(spoken, false, done)
        // Phone Safari often never fires utterance onend — don't wait 8s per beat.
        const extra = isPhoneBrowser() ? 700 : 1600
        window.setTimeout(done, estimate + extra)
      }),
    [speakEvent, speechSupported],
  )

  const takeSnapshot = useCallback(
    async (
      shapeId: string,
      atSec: number,
      frozen?: ScoreResult,
      blobOverride?: Blob | null,
      rep?: number,
      snapLabel?: string,
    ): Promise<SnapView | null> => {
      if (!athleteId) return null
      const shape = getShape(shapeId)
      const live = frozen ?? scoreRef.current
      const blob = blobOverride ?? snapshotCanvas(canvasRef.current)
      const captureId = createId('snap')
      if (blob) {
        onHitPreview?.(blob)
        rememberCaptureBlob(captureId, blob)
        pendingStillsRef.current.push({
          id: captureId,
          blob,
          shapeId,
          shapeName: snapLabel ?? shape?.name ?? shapeId,
          seqId: seq.id,
        })
      }
      const view: SnapView = {
        shapeId,
        shapeName: snapLabel ?? shape?.name ?? shapeId,
        overall: live.overall,
        cues: writtenCues(live, shapeId, shapeId === 'handstand' ? 6 : 3),
        captureId: blob ? captureId : null,
        atSec,
        url: blob ? URL.createObjectURL(blob) : null,
        rep,
      }
      return view
    },
    [athleteId, canvasRef, onHitPreview, seq.id],
  )

  const stopRun = useCallback(() => {
    runGen.current += 1
    holdDoneRef.current = true
    resetSpeech()
    setRunSeq(null)
    setPhase('idle')
    setBeatIndex(-1)
    setCue('')
    setHoldTick(null)
    onHoldClockRef.current?.(null)
    onExitFullscreen?.()
    setFlash('Stopped. The show can start again whenever you are ready.')
    window.setTimeout(() => setFlash(null), 2500)
  }, [onExitFullscreen, resetSpeech])

  const finishRun = useCallback(
    async (seqRun: FlowSequence, collected: SnapView[], replayBlob?: Blob | null) => {
      const lastClean = seqRun.reviewShapeIds
        ? null
        : [...collected].reverse().find((s) => s.shapeId === 'stand_clean')
      if (lastClean) {
        lastClean.atSec = Math.max(0, delay.capturedSec() - 0.08)
      }
      const blob =
        replayBlob && replayBlob.size > 800 ? replayBlob : await delay.flushRollingBlob()
      if (replayUrlRef.current) URL.revokeObjectURL(replayUrlRef.current)
      const url = blob && blob.size > 800 ? URL.createObjectURL(blob) : null
      replayUrlRef.current = url
      setReplayUrl(url)

      let replayCaptureId: string | null = null
      if (blob && blob.size > 800) {
        replayCaptureId = createId('clip')
        rememberCaptureBlob(replayCaptureId, blob)
      }

      const steps: FlowStepSnap[] = collected.map((s) => ({
        shapeId: s.shapeId,
        shapeName: s.shapeName,
        overall: s.overall,
        cues: s.cues,
        captureId: s.captureId,
        atSec: s.atSec,
        clipId: replayCaptureId,
        marker: s.marker,
        rep: s.rep,
      }))
      const counts = chosenFlowCounts(seqRun.id, {
        pikeHollowArchMode: phaMode,
        pikeHollowArchReps: phaReps,
        lemonPlan,
        lemonSets,
        lemonReps,
      })
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
        ...(counts.reps ? { chosenReps: counts.reps } : {}),
        ...(counts.sets ? { chosenSets: counts.sets } : {}),
      }
      if (athleteId) {
        saveFlowAnalysis(built)
        const next = recordFlowCompletion(athleteId, seqRun.id)
        setProgress(next)
        logHomeworkSequenceRun(built)
      }
      if (blob && blob.size > 800 && replayCaptureId) {
        const filename = videoFileName(built, blob.type)
        setDeviceSave({ blob, filename, label: 'this run' })
        setHitsAsk({
          id: replayCaptureId,
          blob,
          filename,
          seconds: delay.capturedSec(),
          seqId: seqRun.id,
          nickname: seqRun.nickname,
        })
      } else if (pendingStillsRef.current.length > 0) {
        setDeviceSave(null)
        setHitsAsk({
          id: pendingStillsRef.current[0]!.id,
          blob: pendingStillsRef.current[0]!.blob,
          filename: `${seqRun.nickname}-still.jpg`,
          seconds: 0,
          seqId: seqRun.id,
          nickname: seqRun.nickname,
        })
      } else {
        setDeviceSave(null)
        setHitsAsk(null)
      }
      setReport(built)
      setSnaps(collected)
      snapsRef.current = collected
      onExitFullscreen?.()
      setPhase('replay')
      setCue(
        seqRun.id === 'flow_mc_hs_5reps'
          ? 'Watch your 5 reps. Each handstand is numbered in the grades. After that, choose whether to keep the clip.'
          : seqRun.id === 'flow_mc_hs_lg_assist'
            ? 'Watch your run — mountain climber through landing lunge. Then read the handstand grade and choose whether to keep the video.'
            : 'Watch your run. Then read the grades and choose whether to keep the clip.',
      )
    },
    [athlete?.instagramHandle, athleteId, delay, lemonPlan, lemonReps, lemonSets, onExitFullscreen, phaMode, phaReps],
  )

  const revokeClipUrls = useCallback(() => {
    for (const url of clipUrlsRef.current.values()) URL.revokeObjectURL(url)
    clipUrlsRef.current.clear()
  }, [])

  const finishHoldRun = useCallback(
    async (seqRun: FlowSequence, rawIn: Awaited<ReturnType<typeof runHandstandHoldSession>>) => {
      onHoldClockRef.current?.(null)
      setHoldTick(null)
      const wallSec = holdWallSecRef.current || delay.capturedSec()
      let rolled = delay.peekRollingBlob()
      const raw = await attachHoldClips(rawIn, rolled && rolled.size > 800 ? rolled : null, { trim: true })

      revokeClipUrls()
      if (replayUrlRef.current) URL.revokeObjectURL(replayUrlRef.current)
      replayUrlRef.current = null
      setReplayUrl(null)
      setActiveClipId(null)

      for (const s of snapsRef.current) {
        if (s.url) URL.revokeObjectURL(s.url)
      }

      if (raw.length === 0) {
        const built: FlowRunReport = {
          id: createId('flow'),
          athleteId: athleteId ?? 'none',
          sequenceId: seqRun.id,
          sequenceName: seqRun.name,
          nickname: seqRun.nickname,
          createdAt: new Date().toISOString(),
          replayCaptureId: null,
          steps: [],
          holdAttempts: [],
          bestHoldSeconds: 0,
          summary: summaryFor(seqRun, []),
          instagramHandle: athlete?.instagramHandle,
          chosenReps: 1,
        }
        if (athleteId) {
          saveFlowAnalysis(built)
          const next = recordFlowCompletion(athleteId, seqRun.id)
          setProgress(next)
          logHomeworkSequenceRun(built)
        }
        setReport(built)
        setSnaps([])
        snapsRef.current = []
        onExitFullscreen?.()
        setHoldClipPending(false)
        setPhase('review')
        setCue('No timed handstands this run. Kick up, hold, then tap Done.')
        return
      }

      const longestIdx = raw.reduce(
        (best, a, i) => (a.holdSeconds > raw[best]!.holdSeconds ? i : best),
        0,
      )
      const collected: SnapView[] = []
      const holds: FlowHoldAttempt[] = []

      for (let i = 0; i < raw.length; i++) {
        const a = raw[i]!
        const highlighted = i === longestIdx
        const clipId = createId('clip')
        if (a.poseTrack.length) {
          rememberPoseTrack(clipId, a.poseTrack)
          void savePoseTrackJson(clipId, serializePoseTrack(a.poseTrack)).catch(() => {
            /* pose track is still in memory for this session */
          })
        }
        if (a.clipBlob && a.clipBlob.size > 800) {
          rememberCaptureBlob(clipId, a.clipBlob)
          clipUrlsRef.current.set(clipId, URL.createObjectURL(a.clipBlob))
        }

        const live =
          a.livePeak ??
          (scoreRef.current.overall > 0 || scoreRef.current.criteria.length > 0
            ? scoreRef.current
            : null)
        const cues = live ? writtenCues(live, 'handstand', 6) : []
        const livePeak = live ? Math.round(live.overall) : 0
        let snapshotId: string | null = null
        if (a.snapshotBlob) {
          const captureId = createId('snap')
          snapshotId = captureId
          rememberCaptureBlob(captureId, a.snapshotBlob)
          collected.push({
            shapeId: 'handstand',
            shapeName: 'Handstand',
            overall: livePeak || live?.overall || 0,
            cues,
            captureId,
            atSec: a.playheadSec,
            url: URL.createObjectURL(a.snapshotBlob),
            rep: i + 1,
            holdSeconds: a.holdSeconds,
            clipId,
            marker: 'playhead',
          })
        }

        holds.push({
          index: i + 1,
          holdSeconds: a.holdSeconds,
          livePeak,
          cues,
          clipId,
          snapshotId,
          playheadSec: a.playheadSec,
          clockOffsetSec: a.clockOffsetSec,
          highlighted,
        })
      }

      const bestHold = holds[longestIdx]!
      const replayCaptureId = bestHold.clipId
      const replayUrl =
        (replayCaptureId && clipUrlsRef.current.get(replayCaptureId)) ||
        [...clipUrlsRef.current.values()][0] ||
        null
      replayUrlRef.current = replayUrl
      setReplayUrl(replayUrl)
      setActiveClipId(replayCaptureId)

      const steps: FlowStepSnap[] =
        collected.length > 0
          ? collected.map((s) => ({
              shapeId: s.shapeId,
              shapeName: s.shapeName,
              overall: s.overall,
              cues: s.cues,
              captureId: s.captureId,
              atSec: s.atSec,
              clipId: s.clipId,
              marker: 'playhead',
              rep: s.rep,
              holdSeconds: s.holdSeconds,
            }))
          : holds.map((h) => ({
              shapeId: 'handstand',
              shapeName: 'Handstand',
              overall: h.livePeak,
              cues: h.cues,
              captureId: h.snapshotId,
              atSec: h.playheadSec,
              clipId: h.clipId,
              marker: 'playhead' as const,
              rep: h.index,
              holdSeconds: h.holdSeconds,
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
        holdAttempts: holds,
        bestHoldSeconds: bestHold.holdSeconds,
        sessionHoldSeconds: sessionHoldTotal(holds),
        recordedWallSec: wallSec,
        summary: summaryFor(seqRun, steps),
        instagramHandle: athlete?.instagramHandle,
        chosenReps: holds.length || 1,
      }
      holdPersistRef.current = null
      setHoldLogged(Boolean(athleteId))
      const day = recordHoldSession(athleteId, built.id, sessionHoldTotal(holds))
      setHoldDay(day)
      if (athleteId) {
        saveFlowAnalysis(built)
        const next = recordFlowCompletion(athleteId, seqRun.id)
        setProgress(next)
        const log = logHomeworkSequenceRun(built)
        holdPersistRef.current = { reportId: built.id, logId: log?.id ?? null }
      }
      const bestBlob = replayCaptureId ? getRememberedBlob(replayCaptureId) : null
      if (bestBlob && replayCaptureId) {
        const filename = videoFileName(built, bestBlob.type)
        setDeviceSave({ blob: bestBlob, filename, label: 'this hold' })
        setHitsAsk({
          id: replayCaptureId,
          blob: bestBlob,
          filename,
          seconds: bestHold.holdSeconds,
          seqId: seqRun.id,
          nickname: seqRun.nickname,
        })
      } else {
        setDeviceSave(null)
        setHitsAsk(null)
      }
      setReport(built)
      setSnaps(collected)
      snapsRef.current = collected
      setHoldClipPending(!replayUrl)
      onExitFullscreen?.()
      setPhase('replay')
      setCue(
        `Longest hold ${formatSeconds(bestHold.holdSeconds)}. This session ${formatSeconds(day.session)}. Today ${formatSeconds(day.today)}.`,
      )

      if (!replayUrl) {
        try {
          rolled = await (flushedHoldRef.current ?? delay.flushRollingBlob())
        } catch {
          rolled = null
        }
        flushedHoldRef.current = null
        if (rolled && rolled.size > 800) {
          const filled = await attachHoldClips(rawIn, rolled, { trim: true })
          for (let i = 0; i < holds.length; i++) {
            const id = holds[i]!.clipId
            const blob = filled[i]?.clipBlob
            if (!id || !blob || blob.size < 800) continue
            rememberCaptureBlob(id, blob)
            const prev = clipUrlsRef.current.get(id)
            if (prev) URL.revokeObjectURL(prev)
            const url = URL.createObjectURL(blob)
            clipUrlsRef.current.set(id, url)
          }
          const nextUrl =
            (replayCaptureId && clipUrlsRef.current.get(replayCaptureId)) ||
            [...clipUrlsRef.current.values()][0] ||
            null
          replayUrlRef.current = nextUrl
          setReplayUrl(nextUrl)
          setActiveClipId(replayCaptureId)
          const bestBlob = replayCaptureId ? getRememberedBlob(replayCaptureId) : null
          if (bestBlob && replayCaptureId) {
            const filename = videoFileName(built, bestBlob.type)
            setDeviceSave({ blob: bestBlob, filename, label: 'this hold' })
            setHitsAsk({
              id: replayCaptureId,
              blob: bestBlob,
              filename,
              seconds: bestHold.holdSeconds,
              seqId: seqRun.id,
              nickname: seqRun.nickname,
            })
          }
        }
        setHoldClipPending(false)
      } else {
        flushedHoldRef.current = null
      }
    },
    [athlete?.instagramHandle, athleteId, delay, onExitFullscreen, revokeClipUrls, takeSnapshot],
  )

  const startSequence = useCallback(
    async (seqRun: FlowSequence) => {
      if (!athleteId) {
        setFlash('Select or create an athlete first — then tap Start.')
        window.setTimeout(() => setFlash(null), 5000)
        setRunSeq(null)
        return
      }
      setRunSeq(seqRun)
      onVoiceEnabledChange?.(true)
      resetSpeech()
      unlockSpeech()
      unlockHoldTones()
      runGen.current += 1
      const gen = runGen.current
      const alive = () => gen === runGen.current
      holdDoneRef.current = false
      flushedHoldRef.current = null
      setHoldClipPending(false)
      holdWallSecRef.current = 0
      setHoldTick(null)
      onHoldClockRef.current?.(null)
      setActiveClipId(null)
      revokeClipUrls()
      setPhase('preview')
      setBeatIndex(-1)
      setCue(cameraPromptCue('starting'))
      setFlash(null)
      onRequestFullscreen?.()
      const camP = Promise.resolve(onEnsureCamera?.())

      for (const s of snapsRef.current) {
        if (s.url) URL.revokeObjectURL(s.url)
      }
      snapsRef.current = []
      setSnaps([])
      setReport(null)
      setSeekTo(null)
      pendingStillsRef.current = []
      setHitsAsk(null)
      setDeviceSave(null)

      try {
        try {
          await camP
        } catch (err) {
          setCue('Camera did not start.')
          setFlash(
            err instanceof Error
              ? err.message
              : 'Allow the camera, then tap Start again.',
          )
          window.setTimeout(() => setFlash(null), 8000)
          setPhase('idle')
          setRunSeq(null)
          return
        }
        const deadline = Date.now() + 45_000
        while (!streamRef.current && Date.now() < deadline) {
          await wait(200)
          if (!alive()) return
          setCue(cameraPromptCue('waiting'))
        }
        if (!streamRef.current) {
          setCue('Camera did not start.')
          setFlash(cameraPromptCue('blocked'))
          window.setTimeout(() => setFlash(null), 8000)
          setPhase('idle')
          setRunSeq(null)
          return
        }
        if (seqRun.mode !== 'hs-hold' && !seqRun.beats.some((b) => b.replayStart)) {
          for (let i = 0; i < 12 && !overlayStreamRef.current; i++) {
            await wait(80)
            if (!alive()) return
          }
          try {
            await delay.restartRolling(overlayStreamRef.current ?? streamRef.current)
          } catch (err) {
            console.warn('[tasks2] delay cam', err)
            try {
              await delay.restartRolling(streamRef.current)
            } catch {
              /* sequence can still run without a replay buffer */
            }
          }
        }
        onRequestFullscreen?.()
        // Camera / recorder steal the Start-tap speech unlock on iPhone Safari.
        holdAudio()
        unlockSpeech()
        unlockHoldTones()
        await wait(200)
        if (!alive()) return
        setCue(seqRun.previewSpeak)
        if (seqRun.setupShapeId) {
          onRequestShape(seqRun.setupShapeId, 'auto', { profileOk: true })
        } else {
          const first = seqRun.previewShapes[0]
          if (first) onRequestShape(first.shapeId)
        }

        if (seqRun.mode === 'hs-hold') {
          setPhase('holding')
          onRequestShape('handstand', 'auto', { profileOk: true })
          setCue(
            'Kick to a handstand when you are ready. Hold as long as you can. Walking is allowed — try not to. Tap Done when you are finished.',
          )
          let rolling = false
          try {
            rolling = await delay.restartRolling(streamRef.current)
            // If the recorder started, do not attach a second one while
            // waiting for the first timeslice — two recorders empty iPad clips.
          } catch {
            rolling = false
          }
          const holdP = runHandstandHoldSession({
            cancelled: () => !alive(),
            doneRequested: () => holdDoneRef.current || !alive(),
            landmarks: () => landmarksRef.current,
            candidates: () => getPoseCandidates(),
            score: () => scoreRef.current,
            stream: () => (rolling ? null : streamRef.current),
            timelineSec: rolling ? () => delay.capturedSec() : undefined,
            canvas: () => canvasRef.current,
            onTick: (tick) => {
              setHoldTick(tick)
              onHoldClockRef.current?.(tick.running ? tick.seconds : null)
            },
            onCue: (line) => {
              if (alive()) setCue(line)
            },
          })
          void (async () => {
            await speakLine(seqRun.previewSpeak)
            if (!alive() || holdDoneRef.current) return
            if (seqRun.setupSpeak) {
              setCue(seqRun.setupSpeak)
              await speakLine(seqRun.setupSpeak)
            }
            if (!alive() || holdDoneRef.current) return
            if (seqRun.setupExtraSpeak) {
              setCue(seqRun.setupExtraSpeak)
              await speakLine(seqRun.setupExtraSpeak)
            }
          })()
          const raw = await holdP
          if (!alive()) return
          try {
            await finishHoldRun(seqRun, raw)
          } catch (err) {
            console.warn('[tasks2] finish hold', err)
            setPhase('review')
            setCue('Could not open the hold clips. Kick up again, or check that the camera stayed on.')
            onExitFullscreen?.()
          }
          return
        }

        await speakLine(seqRun.previewSpeak)
        if (!alive()) return
        if (seqRun.setupSpeak) {
          setCue(seqRun.setupSpeak)
          if (seqRun.setupShapeId) {
            onRequestShape(seqRun.setupShapeId, 'auto', { profileOk: true })
          }
          await speakLine(seqRun.setupSpeak)
          if (!alive()) return
          await wait(1400)
          if (!alive()) return
        }
        if (seqRun.setupExtraSpeak) {
          setCue(seqRun.setupExtraSpeak)
          if (seqRun.setupShapeId) {
            onRequestShape(seqRun.setupShapeId, 'auto', { profileOk: true })
          }
          await speakLine(seqRun.setupExtraSpeak)
          if (!alive()) return
          await wait(600)
          if (!alive()) return
        }
        if (!seqRun.setupSpeak && !seqRun.setupExtraSpeak) {
          await wait(700)
          if (!alive()) return
        }

        setPhase('running')
      const collected: SnapView[] = []
      let replayBlob: Blob | null = null
      const first = seqRun.previewShapes[0]
      let currentShape =
        first?.shapeId ?? seqRun.beats.find((b) => b.shapeId)?.shapeId ?? 'stand_clean'

      const freezeScore = (live: ScoreResult): ScoreResult => ({
        ...live,
        criteria: live.criteria.map((c) => ({ ...c })),
      })

      const huntBest = async (
        shapeId: string,
        windowMs: number,
        minMs: number,
        marker?: 'playhead',
        rep?: number,
      ) => {
        const started = performance.now()
        let matchRank = -1
        let matchFrozen: ScoreResult | null = null
        let matchBlob: Blob | null = null
        let matchAt = delay.capturedSec()
        let anyRank = -1
        let anyFrozen: ScoreResult | null = null
        let anyBlob: Blob | null = null
        let anyAt = delay.capturedSec()
        let sawMatch = false
        const rankOf = (live: ScoreResult) =>
          shapeId === 'handstand' ? handstandPeakScore(live) : live.overall
        while (performance.now() - started < windowMs) {
          if (!alive()) return
          await wait(70)
          if (performance.now() - started < minMs) continue
          if (shapeIdRef.current !== shapeId) continue
          const live = scoreRef.current
          const looks = snapshotLooksRight(shapeId, live)
          const rank = rankOf(live)
          const laterClean =
            shapeId === 'stand_clean' && looks && live.overall >= matchRank - 8
          if (looks && (laterClean || rank > matchRank)) {
            sawMatch = true
            matchRank = rank
            matchFrozen = freezeScore(live)
            matchBlob = snapshotCanvas(canvasRef.current)
            matchAt = delay.capturedSec()
          }
          if (rank > anyRank) {
            anyRank = rank
            anyFrozen = freezeScore(live)
            anyBlob = snapshotCanvas(canvasRef.current)
            anyAt = delay.capturedSec()
          }
        }
        const pickFrozen = sawMatch ? matchFrozen : anyFrozen
        const pickBlob = sawMatch ? matchBlob : anyBlob
        const pickAt = sawMatch ? matchAt : anyAt
        if (!pickFrozen) {
          const view = await takeSnapshot(shapeId, delay.capturedSec(), undefined, null, rep)
          if (view) collected.push(marker ? { ...view, marker } : view)
          return
        }
        const view = await takeSnapshot(shapeId, pickAt, pickFrozen, pickBlob, rep)
        if (!view) return
        if (!sawMatch && shapeId === 'handstand') {
          view.cues = [
            'No clear handstand picture in this kick — this still is the closest frame. Push tall through the ground, ears covered, ribs in, butt in, legs together.',
            ...view.cues,
          ].slice(0, 6)
        }
        if (!sawMatch && shapeId === 'lever') {
          view.cues = [
            'No clear lever picture in this pass — chest toward parallel, support foot down, back leg lifting. This still is the closest frame, not a hit.',
            ...view.cues,
          ].slice(0, 3)
        }
        if (!sawMatch && shapeId === 'stand_clean') {
          view.cues = [
            'Stand clean is feet together, arms pinned. This still is the closest frame after the landing lunge — we map the replay to the last standing moment we can.',
            ...view.cues,
          ].slice(0, 3)
        }
        collected.push(marker ? { ...view, marker } : view)
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
        if (beat.replayStart) {
          const live = overlayStreamRef.current ?? streamRef.current
          try {
            await delay.restartRolling(live)
          } catch (err) {
            console.warn('[tasks2] replay start', err)
            try {
              await delay.restartRolling(streamRef.current)
            } catch {
              /* keep going — grades still save */
            }
          }
          await wait(180)
          holdAudio()
          if (!alive()) return
          for (const s of collected) {
            s.atSec = undefined
          }
        }
        setBeatIndex(i)
        setCue(beat.speak)

        let snapP: Promise<void> = Promise.resolve()
        if (beat.playheadBestMs != null) {
          snapP = huntBest(
            currentShape,
            beat.playheadBestMs,
            beat.snapshotMinMs ?? 0,
            'playhead',
            beat.rep,
          )
        } else if (beat.snapshotBestMs != null) {
          snapP = huntBest(
            currentShape,
            beat.snapshotBestMs,
            beat.snapshotMinMs ?? 0,
            undefined,
            beat.rep,
          )
        } else if (beat.snapshotAtMs != null) {
          snapP = wait(beat.snapshotAtMs).then(async () => {
            if (!alive()) return
            const view = await takeSnapshot(
              currentShape,
              delay.capturedSec(),
              undefined,
              null,
              beat.rep,
              beat.snapLabel,
            )
            if (view) collected.push(view)
          })
        }

        await Promise.all([speakLine(beat.speak), snapP])
        if (!alive()) return
        await wait(beat.pauseMs ?? 200)
        if (beat.replayEnd) {
          replayBlob = await delay.flushRollingBlob()
        }
        if (
          !seqRun.reviewShapeIds?.length &&
          currentShape === 'stand_clean' &&
          snapshotLooksRight('stand_clean', scoreRef.current)
        ) {
          const later = await takeSnapshot('stand_clean', delay.capturedSec())
          if (later) {
            const idx = collected.findLastIndex((s) => s.shapeId === 'stand_clean')
            if (idx >= 0) {
              const prev = collected[idx]
              if (prev?.url) URL.revokeObjectURL(prev.url)
              collected[idx] = later
            } else {
              collected.push(later)
            }
          }
        }
      }

      if (!alive()) return
      const forReview = seqRun.reviewShapeIds?.length
        ? collected.filter((s) => seqRun.reviewShapeIds!.includes(s.shapeId))
        : collected
      setCue(
        seqRun.id === 'flow_mc_hs_5reps'
          ? 'Watch your 5 reps. Each handstand is numbered in the grades.'
          : seqRun.id === 'flow_mc_hs_lg_assist'
            ? 'Watch your run — mountain climber through landing lunge. Then read the handstand grade.'
            : 'Watch your run. Scrub, then continue to the grades.',
      )
      await finishRun(seqRun, forReview, replayBlob)
      } catch (err) {
        console.warn('[tasks2] start', err)
        if (!alive()) return
        setPhase('idle')
        setCue('')
        setFlash(
          err instanceof Error
            ? err.message
            : 'Could not start this sequence. Allow the camera, then tap Start again.',
        )
        window.setTimeout(() => setFlash(null), 4500)
        onExitFullscreen?.()
      }
    },
    [
      athleteId,
      canvasRef,
      delay,
      finishHoldRun,
      finishRun,
      holdAudio,
      onEnsureCamera,
      onExitFullscreen,
      onRequestFullscreen,
      onRequestShape,
      onVoiceEnabledChange,
      resetSpeech,
      revokeClipUrls,
      speakLine,
      takeSnapshot,
      unlockSpeech,
    ],
  )

  const selectSeq = (id: string) => {
    if (phase === 'preview' || phase === 'running' || phase === 'holding' || phase === 'finishing') return
    setSeqId(id)
    writeLastFlowId(id)
    setRunSeq(null)
    setPhase('idle')
    setReport(null)
    if (athleteId) {
      const p = loadFlowProgress(athleteId)
      const next = { ...p, currentId: id }
      saveFlowProgress(next)
      setProgress(next)
    }
  }

  const flowConfig = () => ({
    pikeHollowArchMode: phaMode,
    pikeHollowArchReps: phaReps,
    lemonPlan,
    lemonSets,
    lemonReps,
  })

  const nextSequence = () => {
    const idx = FLOW_SEQUENCES.findIndex((s) => s.id === seq.id)
    const next = FLOW_SEQUENCES[idx + 1] ?? FLOW_SEQUENCES[0]!
    selectSeq(next.id)
    setPhase('idle')
    setCue('')
  }

  const chooseAnotherSequence = () => {
    setPhase('idle')
    setCue('')
    setFlash('Pick any sequence in the list.')
    window.setTimeout(() => setFlash(null), 2800)
    window.setTimeout(() => {
      seqListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  const openHistoryReplay = async (r: FlowRunReport) => {
    revokeClipUrls()
    if (r.holdAttempts?.length) {
      for (const h of r.holdAttempts) {
        if (!h.clipId) continue
        const b = await getCaptureBlob(h.clipId)
        if (b) {
          rememberCaptureBlob(h.clipId, b)
          clipUrlsRef.current.set(h.clipId, URL.createObjectURL(b))
          const json = await getPoseTrackJson(h.clipId)
          const track = json ? parsePoseTrack(json) : null
          if (track) rememberPoseTrack(h.clipId, track)
        }
      }
    }
    const mainId = r.replayCaptureId
    if (!mainId && clipUrlsRef.current.size === 0) return
    const blob = mainId ? await getCaptureBlob(mainId) : null
    if (mainId && blob) rememberCaptureBlob(mainId, blob)
    if (mainId && blob && !clipUrlsRef.current.has(mainId)) {
      clipUrlsRef.current.set(mainId, URL.createObjectURL(blob))
    }
    const url =
      (mainId && clipUrlsRef.current.get(mainId)) || [...clipUrlsRef.current.values()][0] || null
    if (!url) return
    if (replayUrlRef.current && ![...clipUrlsRef.current.values()].includes(replayUrlRef.current)) {
      URL.revokeObjectURL(replayUrlRef.current)
    }
    replayUrlRef.current = url
    setReplayUrl(url)
    setActiveClipId(mainId)
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

  const ensureClipUrl = useCallback((clipId: string): string | null => {
    const existing = clipUrlsRef.current.get(clipId)
    if (existing) return existing
    const blob = getRememberedBlob(clipId)
    if (!blob) return null
    const url = URL.createObjectURL(blob)
    clipUrlsRef.current.set(clipId, url)
    return url
  }, [])

  const playHoldClip = (clipId: string | null | undefined, atSec?: number) => {
    if (!clipId) {
      if (atSec != null) setSeekTo(atSec)
      return
    }
    const url = ensureClipUrl(clipId)
    if (!url) {
      if (atSec != null) setSeekTo(atSec)
      return
    }
    setReplayUrl(url)
    replayUrlRef.current = url
    setActiveClipId(clipId)
    setSeekTo(atSec ?? 0)
    setPhase('replay')
  }

  const extraHoldBlobs = () => {
    const ids = new Set<string>()
    if (hitsAsk) ids.add(hitsAsk.id)
    const extras: { id: string; blob: Blob; name: string }[] = []
    for (const hold of report?.holdAttempts ?? []) {
      if (!hold.clipId || ids.has(hold.clipId)) continue
      const blob = getRememberedBlob(hold.clipId)
      if (!blob) continue
      ids.add(hold.clipId)
      extras.push({
        id: hold.clipId,
        blob,
        name: `Hold ${hold.index} · ${formatSeconds(hold.holdSeconds)}`,
      })
    }
    return extras
  }

  const dumpPendingMedia = () => {
    if (hitsAsk) {
      forgetCaptureBlob(hitsAsk.id)
      void deleteCapture(hitsAsk.id).catch(() => {})
    }
    for (const extra of extraHoldBlobs()) {
      forgetCaptureBlob(extra.id)
      void deleteCapture(extra.id).catch(() => {})
    }
    for (const still of pendingStillsRef.current) {
      forgetCaptureBlob(still.id)
      void deleteCapture(still.id).catch(() => {})
    }
    pendingStillsRef.current = []
    setHitsAsk(null)
    setDeviceSave(null)
  }

  const keepToPhotos = async () => {
    const clip = hitsAsk?.blob && hitsAsk.blob.type.startsWith('video') ? hitsAsk : deviceSave
    if (clip && 'filename' in clip) {
      const clipId = hitsAsk?.id ?? report?.replayCaptureId
      const hold = report?.holdAttempts?.find((h) => h.clipId === clipId)
      const result = await saveHoldClipWithOverlay({
        source: clip.blob,
        track: clipId ? getRememberedPoseTrack(clipId) : null,
        holdSeconds: hold?.holdSeconds ?? hitsAsk?.seconds ?? report?.bestHoldSeconds ?? 0,
        clockOffsetSec: hold?.clockOffsetSec ?? 0,
        recordedWallSec: report?.recordedWallSec,
        filename: clip.filename,
        clipId,
      })
      setFlash(saveResultMessage(result))
    }
    for (const extra of extraHoldBlobs()) {
      const ext = extra.blob.type.includes('mp4') ? 'mp4' : 'webm'
      await saveVideoToDevice(extra.blob, `shape-lab-hold-${extra.id}.${ext}`)
    }
    for (const still of pendingStillsRef.current) {
      await saveImageToDevice(still.blob, `${still.shapeName.replace(/\s+/g, '-')}.jpg`)
    }
    dumpPendingMedia()
    window.setTimeout(() => setFlash(null), 5000)
  }

  const keepToLibrary = async () => {
    if (!athleteId) {
      setFlash('Unlock a profile first, then save to the video library.')
      window.setTimeout(() => setFlash(null), 4000)
      return
    }
    const blob = hitsAsk?.blob ?? deviceSave?.blob
    if (!blob || !blob.type.startsWith('video')) {
      setFlash('No video to put in the library — keep stills in My shapes if you want them.')
      window.setTimeout(() => setFlash(null), 4000)
      return
    }
    try {
      await uploadAthleteVideo({
        athleteId,
        blob,
        name: hitsAsk?.nickname ?? deviceSave?.label ?? seq.nickname,
        source: liveSeq.mode === 'hs-hold' ? 'hold' : 'tasks2',
        durationSec: hitsAsk?.seconds ?? null,
      })
      for (const extra of extraHoldBlobs()) {
        await uploadAthleteVideo({
          athleteId,
          blob: extra.blob,
          name: extra.name,
          source: 'hold',
        })
      }
      setFlash('Saved into this profile’s video library.')
    } catch {
      setFlash('Could not save into the video library.')
    }
    dumpPendingMedia()
    window.setTimeout(() => setFlash(null), 5000)
  }

  const keepToMyShapes = async () => {
    if (!athleteId) {
      setFlash('Unlock a profile first, then save to My shapes.')
      window.setTimeout(() => setFlash(null), 4000)
      return
    }
    try {
      if (hitsAsk && hitsAsk.blob.type.startsWith('video')) {
        await saveCapture(
          {
            id: hitsAsk.id,
            athleteId,
            taskId: hitsAsk.seqId,
            shapeId: liveSeq.previewShapes[0]?.shapeId ?? 'handstand',
            shapeName: hitsAsk.nickname,
            kind: 'clip',
            createdAt: new Date().toISOString(),
            holdSeconds: hitsAsk.seconds,
          },
          hitsAsk.blob,
        )
      }
      for (const extra of extraHoldBlobs()) {
        await saveCapture(
          {
            id: extra.id,
            athleteId,
            taskId: liveSeq.id,
            shapeId: 'handstand',
            shapeName: extra.name,
            kind: 'clip',
            createdAt: new Date().toISOString(),
            holdSeconds: 0,
          },
          extra.blob,
        )
      }
      for (const still of pendingStillsRef.current) {
        await saveCapture(
          {
            id: still.id,
            athleteId,
            taskId: still.seqId,
            shapeId: still.shapeId,
            shapeName: still.shapeName,
            kind: 'snapshot',
            createdAt: new Date().toISOString(),
            holdSeconds: 0,
          },
          still.blob,
        )
      }
      setFlash('Saved to Learn → My shapes.')
    } catch {
      setFlash('Could not save into My shapes.')
    }
    pendingStillsRef.current = []
    setHitsAsk(null)
    setDeviceSave(null)
    window.setTimeout(() => setFlash(null), 4000)
  }

  useEffect(() => {
    onFlowPhase?.(phase)
  }, [phase, onFlowPhase])

  useEffect(() => {
    if (!onRegisterStart) return
    onRegisterStart(() => {
      void startSequence(resolveFlowRun(seq.id, flowConfig()) ?? seq)
    })
  })

  const requestHoldDone = useCallback(() => {
    if (holdDoneRef.current) return
    holdDoneRef.current = true
    resetSpeech()
    setPhase('finishing')
    setCue('Opening your holds…')
    setFlash('Opening your holds…')
    holdWallSecRef.current = delay.capturedSec()
    if (!flushedHoldRef.current) {
      flushedHoldRef.current = delay.flushRollingBlob().catch(() => null)
    }
  }, [delay, resetSpeech])

  const dropHoldFromLog = useCallback((index: number) => {
    setReport((prev) => {
      if (!prev?.holdAttempts) return prev
      const nextHolds = prev.holdAttempts.filter((h) => h.index !== index)
      if (nextHolds.length === 0) {
        const persist = holdPersistRef.current
        if (persist) {
          removeFlowAnalysis(persist.reportId)
          if (persist.logId) removeHomeworkLog(persist.logId)
          holdPersistRef.current = null
        }
        setHoldLogged(false)
        setFlash('Dropped. This run is not in your log.')
        window.setTimeout(() => setFlash(null), 3500)
        return {
          ...prev,
          holdAttempts: [],
          bestHoldSeconds: 0,
          steps: [],
          replayCaptureId: null,
        }
      }
      const longest = nextHolds.reduce(
        (best, h) => (h.holdSeconds > best.holdSeconds ? h : best),
        nextHolds[0]!,
      )
      const next: FlowRunReport = {
        ...prev,
        holdAttempts: nextHolds.map((h) => ({ ...h, highlighted: h.index === longest.index })),
        bestHoldSeconds: longest.holdSeconds,
        replayCaptureId: longest.clipId ?? prev.replayCaptureId,
        steps: (prev.steps ?? []).filter((s) => s.rep !== index),
      }
      if (holdPersistRef.current) saveFlowAnalysis(next)
      return next
    })
    setSnaps((prev) => prev.filter((s) => s.rep !== index))
  }, [])

  const dontLogHoldRun = useCallback(() => {
    const persist = holdPersistRef.current
    if (persist) {
      removeFlowAnalysis(persist.reportId)
      if (persist.logId) removeHomeworkLog(persist.logId)
      holdPersistRef.current = null
    }
    setHoldLogged(false)
    setFlash('This run is not in your log.')
    window.setTimeout(() => setFlash(null), 3500)
  }, [])

  useEffect(() => {
    onRegisterHoldDone?.(requestHoldDone)
  }, [onRegisterHoldDone, requestHoldDone])

  const closeHoldWatch = useCallback(() => {
    setPhase('idle')
    setCue('')
    onExitFullscreen?.()
  }, [onExitFullscreen])

  const saveHoldToPhotos = useCallback(
    async (clipId: string | null | undefined, index?: number) => {
      if (!clipId || !report) {
        setFlash('That clip is not ready yet.')
        window.setTimeout(() => setFlash(null), 3500)
        return
      }
      const file = getRememberedBlob(clipId)
      if (!file) {
        setFlash('Clip is still loading — wait a moment, then tap Save again.')
        window.setTimeout(() => setFlash(null), 3500)
        return
      }
      const hold = report.holdAttempts?.find((h) => h.clipId === clipId)
      try {
        const result = await saveHoldClipWithOverlay({
          source: file,
          track: getRememberedPoseTrack(clipId),
          holdSeconds: hold?.holdSeconds ?? report.bestHoldSeconds ?? 0,
          clockOffsetSec: hold?.clockOffsetSec ?? 0,
          recordedWallSec: report.recordedWallSec,
          filename: videoFileName(report, file.type || 'video/mp4', index),
          clipId,
        })
        setFlash(saveResultMessage(result))
      } catch {
        setFlash('Could not save that hold clip.')
      }
      window.setTimeout(() => setFlash(null), 5000)
    },
    [report],
  )

  useEffect(() => {
    if (phase !== 'replay' && phase !== 'review' && phase !== 'idle') return
    if (!report?.holdAttempts?.length) return
    let changed = false
    for (const h of report.holdAttempts) {
      if (!h.clipId || clipUrlsRef.current.has(h.clipId)) continue
      const remembered = getRememberedBlob(h.clipId)
      if (!remembered) continue
      clipUrlsRef.current.set(h.clipId, URL.createObjectURL(remembered))
      changed = true
    }
    if (changed) setReplayUrl((cur) => cur ?? [...clipUrlsRef.current.values()][0] ?? null)
  }, [phase, report])

  useEffect(() => {
    if (phase !== 'replay' && phase !== 'review') return
    const onPop = () => {
      if (phase === 'replay') {
        if (seq.mode === 'hs-hold' || report?.holdAttempts?.length) closeHoldWatch()
        else {
          setPhase('review')
          setCue('')
        }
        try {
          window.history.pushState({ shapeLab: 'hold-review' }, '')
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [phase, closeHoldWatch, seq.mode, report])

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

  const askedBeat = phase === 'running' ? liveSeq.beats[beatIndex] : null
  const askedShapeId =
    phase === 'holding' || phase === 'finishing'
      ? 'handstand'
      : askedBeat?.shapeId ??
    [...liveSeq.beats.slice(0, Math.max(0, beatIndex + 1))].reverse().find((b) => b.shapeId)?.shapeId ??
    ((phase === 'idle' || phase === 'preview') && seq.setupShapeId
      ? seq.setupShapeId
      : undefined) ??
    seq.previewShapes[0]?.shapeId

  const completions = progress?.completions[seq.id] ?? 0
  const busy = phase === 'preview' || phase === 'running' || phase === 'holding' || phase === 'finishing'
  const holdMode = seq.mode === 'hs-hold' || Boolean(report?.holdAttempts)
  const nextSeqDef =
    FLOW_SEQUENCES[(FLOW_SEQUENCES.findIndex((s) => s.id === seq.id) + 1) % FLOW_SEQUENCES.length] ??
    FLOW_SEQUENCES[0]!

  const startBar = (
    <div className="flex flex-wrap gap-2">
      {!busy && phase !== 'replay' && (
        <button
          type="button"
          onPointerDown={(e) => {
            if (e.button !== 0) return
            unlockSpeech()
            unlockHoldTones()
            void onEnsureCamera?.()
          }}
          onClick={() => void startSequence(resolveFlowRun(seq.id, flowConfig()) ?? seq)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            seq.mode === 'hs-hold' ? HOLD_PINK_BTN : 'bg-[var(--accent)] text-[#06281f]'
          }`}
        >
          {seq.mode === 'hs-hold'
            ? report
              ? 'Go again'
              : 'Start hold'
            : completions > 0
              ? 'Go again'
              : 'Start'}
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
        <>
          {(phase === 'holding' || phase === 'finishing') && (
            <button
              type="button"
              onClick={requestHoldDone}
              disabled={phase === 'finishing'}
              aria-busy={phase === 'finishing'}
              className={`h-14 min-w-[12rem] flex-1 rounded-2xl px-4 text-base font-bold disabled:opacity-80 ${HOLD_PINK_BTN}`}
            >
              {phase === 'finishing' ? 'Opening…' : 'Done — see my holds'}
            </button>
          )}
          <button
            type="button"
            onClick={stopRun}
            className="rounded-lg border border-[var(--warn)]/70 px-3 py-2 text-sm text-[var(--warn)]"
          >
            Stop
          </button>
        </>
      )}
    </div>
  )

  const holdHud =
    (cameraFullscreen || phase === 'holding' || phase === 'finishing') && phase !== 'replay' ? (
        <div className="pointer-events-auto fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[220] mx-auto w-[min(96vw,34rem)] rounded-2xl border border-white/25 bg-black/85 p-3 text-white shadow-2xl backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
            {phase === 'finishing'
              ? 'Opening your holds'
              : phase === 'holding'
              ? 'Handstand hold challenge'
              : busy
                ? 'Stay with the voice'
                : seq.nickname}
          </p>
          {phase === 'finishing' ? (
            <div className="mt-2 flex items-center gap-3">
              <span
                className="h-7 w-7 shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-[#ff4d9a]"
                aria-hidden
              />
              <div>
                <p className="text-base font-bold leading-snug">Opening your holds…</p>
                <p className="mt-0.5 text-[12px] text-white/70">Watch, save, or go again in a moment.</p>
              </div>
            </div>
          ) : phase === 'holding' ? (
            <>
              <p className={`mt-1 text-3xl font-black tabular-nums ${HOLD_PINK_TEXT}`}>
                {holdTick?.running && holdTick.seconds != null
                  ? formatSeconds(holdTick.seconds)
                  : holdTick?.last != null
                    ? formatSeconds(holdTick.last)
                    : '0.0s'}
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug">{cue}</p>
              {cameraError && (
                <p className="mt-1 text-[12px] text-[#f07178]">{cameraError}</p>
              )}
              <p className="mt-1 text-[11px] text-white/60">
                {holdTick?.running
                  ? `Hold ${(holdTick.tries ?? 0) + 1} · Best ${holdTick.best != null ? formatSeconds(holdTick.best) : '—'}`
                  : holdTick
                    ? `${holdTick.tries} timed · Best ${holdTick.best != null ? formatSeconds(holdTick.best) : '—'}`
                    : 'Clock starts when hands are down and feet leave the ground.'}
                {holdTick && !holdTick.running
                  ? holdTick.inverted
                    ? ' · Starting the clock…'
                    : holdTick.handsDown && holdTick.feetOff
                      ? ' · Hands down, feet up — lining up the handstand'
                      : holdTick.handsDown
                        ? ' · Hands down — kick your feet up'
                        : holdTick.feetOff
                          ? ' · Feet are up — plant both hands'
                          : ' · Place both hands on the floor, then kick up'
                  : ''}
              </p>
            </>
          ) : busy ? (
            <>
              <p className="mt-1 text-sm font-semibold leading-snug">{cue}</p>
              {cameraError && (
                <p className="mt-1 text-[12px] text-[#f07178]">{cameraError}</p>
              )}
              <p className="mt-1 text-[11px] text-white/60">Listen — follow the spoken script.</p>
            </>
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
              {seq.setupSpeak && (
                <p className="mt-1 text-sm font-semibold leading-snug text-white">
                  Before you start: {seq.setupSpeak}
                </p>
              )}
              {seq.setupExtraSpeak && (
                <p className="mt-1 text-[12px] leading-snug text-white/85">{seq.setupExtraSpeak}</p>
              )}
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
          {(flash || cameraError) && (
            <p className="mt-2 text-[12px] font-semibold leading-snug text-[#f07178]">
              {flash || cameraError}
            </p>
          )}
        </div>
    ) : null

  return (
    <>
      {holdHud && createPortal(holdHud, document.body)}
      {phase === 'finishing' &&
        createPortal(
          <div
            className="fixed inset-0 z-[240] flex flex-col items-center justify-center bg-black/80 px-6 text-center text-white"
            role="status"
            aria-live="polite"
          >
            <span
              className="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-[#ff4d9a]"
              aria-hidden
            />
            <p className="mt-4 text-xl font-black">Getting your clips…</p>
            <p className="mt-2 max-w-sm text-sm leading-snug text-white/75">
              Almost there — then watch, save, or go again.
            </p>
          </div>,
          document.body,
        )}

    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-3">
      <div className="sticky top-0 z-30 -mx-1 mb-3 rounded-2xl border border-white/10 bg-[#121820] p-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
              seq.mode === 'hs-hold' ? HOLD_PINK_TEXT : 'text-[var(--accent)]'
            }`}
          >
            Class flows
          </p>
          <span className={HOLD_BUILD_CHIP}>{HOLD_BUILD_LABEL}</span>
        </div>
        <div className={`${HOLD_BUILD_BANNER} mt-2`}>
            {HOLD_BUILD_LABEL} — this bar means the gym rebuilt
        </div>
        <h2 className="mt-0.5 text-lg font-semibold text-[var(--text)]">{seq.nickname}</h2>
        {seq.mode === 'hs-hold' && holdDay && holdDay.today > 0 && (
          <p className={`mt-1 text-[13px] font-semibold ${HOLD_PINK_TEXT}`}>
            Today {formatSeconds(holdDay.today)} in a handstand
            {holdDay.session > 0 ? ` · this session ${formatSeconds(holdDay.session)}` : ''}
          </p>
        )}
        <div className="mt-2">
          <ShapeStillStrip
            items={seq.previewShapes}
            photos={referencePhotos}
            activeShapeId={askedShapeId}
            size="sm"
          />
        </div>
        <div className="mt-3">{startBar}</div>
        {!busy && phase !== 'replay' && seq.id === 'flow_pike_hollow_arch' && (
          <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              How this run talks
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setPhaMode('learn')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  phaMode === 'learn'
                    ? 'bg-[var(--accent)] text-[#06281f]'
                    : 'border border-white/15 text-[var(--muted)]'
                }`}
              >
                Learn
              </button>
              {([3, 4, 5, 6, 7, 8, 9, 10] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setPhaMode('reps')
                    setPhaReps(n)
                  }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    phaMode === 'reps' && phaReps === n
                      ? 'bg-[var(--accent)] text-[#06281f]'
                      : 'border border-white/15 text-[var(--muted)]'
                  }`}
                >
                  {n} reps
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
              {phaMode === 'learn'
                ? 'Full talk-through on the first pike, hollow, and arch, then 4 timed reps (pike 2s, hollow and arch 1.2s).'
                : `First rep names each shape. Then ${phaReps - 1} more at pike 2s, hollow 1.2s, arch 1.2s.`}
            </p>
          </div>
        )}
        {!busy && phase !== 'replay' && seq.id === 'flow_lemon_squeezes' && (
          <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Sets and reps
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setLemonPlan('default')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  lemonPlan === 'default'
                    ? 'bg-[var(--accent)] text-[#06281f]'
                    : 'border border-white/15 text-[var(--muted)]'
                }`}
              >
                Default · 10, 8, 6
              </button>
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setLemonPlan('custom')
                    setLemonSets(n)
                  }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    lemonPlan === 'custom' && lemonSets === n
                      ? 'bg-[var(--accent)] text-[#06281f]'
                      : 'border border-white/15 text-[var(--muted)]'
                  }`}
                >
                  {n} set{n === 1 ? '' : 's'}
                </button>
              ))}
            </div>
            {lemonPlan === 'custom' && (
              <label className="mt-2 block text-[11px] text-[var(--muted)]">
                Reps each set · {lemonReps}
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={lemonReps}
                  onChange={(e) => setLemonReps(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </label>
            )}
            <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
              {lemonPlan === 'default'
                ? '3 sets. Pike with open shoulders, pull a tuck, then hollow–tuck 10, 8, and 6. Reset to pike each set.'
                : `${lemonSets} set${lemonSets === 1 ? '' : 's'} of ${lemonReps}. Pike with open shoulders, pull a tuck, then hollow–tuck. Reset to pike each set.`}
            </p>
          </div>
        )}
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          Volume up. Start goes full screen.
          {completions > 0 ? ` ${completions}× this one.` : ''}
        </p>
      </div>

      {phase === 'idle' && report?.holdAttempts && report.holdAttempts.length > 0 && (
        <div className="mb-3 rounded-2xl border border-[#ff4d9a]/40 bg-[#2a1018] p-3">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${HOLD_PINK_TEXT}`}>
            Your holds
          </p>
          <p className="mt-0.5 text-lg font-black text-white">
            Best{' '}
            <span className={`tabular-nums ${HOLD_PINK_TEXT}`}>
              {formatSeconds(report.bestHoldSeconds ?? 0)}
            </span>
            <span className="ml-2 text-sm font-semibold text-white/60">
              {report.holdAttempts.length} clip{report.holdAttempts.length === 1 ? '' : 's'}
            </span>
          </p>
          <p className="mt-1 text-[13px] font-semibold text-white/85">
            This session {formatSeconds(report.sessionHoldSeconds ?? sessionHoldTotal(report.holdAttempts))}
            {holdDay && holdDay.today > 0 ? ` · Today ${formatSeconds(holdDay.today)}` : ''}
          </p>
          <ul className="mt-2 space-y-2">
            {report.holdAttempts.map((h) => (
              <li
                key={h.index}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-2.5 py-2 ${
                  h.highlighted ? 'border-[#ff4d9a] bg-black/40' : 'border-white/10 bg-black/25'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">
                    {h.highlighted ? 'Longest' : `Hold ${h.index}`}
                    <span className={`ml-2 tabular-nums ${HOLD_PINK_TEXT}`}>
                      {formatSeconds(h.holdSeconds)}
                    </span>
                  </p>
                  {h.cues[0] && (
                    <p className="mt-0.5 text-[11px] leading-snug text-white/65">{h.cues[0]}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => playHoldClip(h.clipId)}
                    className="rounded-lg border border-white/20 px-2.5 py-1.5 text-[12px] font-semibold text-white"
                  >
                    Watch
                  </button>
                  <button
                    type="button"
                    disabled={!h.clipId}
                    onClick={() => void saveHoldToPhotos(h.clipId, h.index)}
                    className={`rounded-lg px-2.5 py-1.5 text-[12px] disabled:opacity-50 ${HOLD_PINK_BTN}`}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => dropHoldFromLog(h.index)}
                    className="rounded-lg px-2 py-1.5 text-[11px] text-[var(--warn)]"
                  >
                    Drop
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {holdLogged ? (
            <button
              type="button"
              onClick={dontLogHoldRun}
              className="mt-2 text-[11px] text-[var(--warn)] underline"
            >
              Don’t log this run
            </button>
          ) : (
            <p className="mt-2 text-[11px] text-white/50">This run is not in your homework log.</p>
          )}
        </div>
      )}

      <ol ref={seqListRef} className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FLOW_SEQUENCES.map((s) => {
          const count = progress?.completions[s.id] ?? 0
          const selected = s.id === seq.id
          const lead = s.previewShapes[0]
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => selectSeq(s.id)}
                className={`w-full overflow-hidden rounded-2xl border text-left disabled:opacity-50 ${
                  selected
                    ? s.mode === 'hs-hold'
                      ? 'border-[#ff4d9a] bg-[#2a1018] ring-1 ring-[#ff4d9a]'
                      : 'border-[var(--accent)] bg-[#102820] ring-1 ring-[var(--accent)]'
                    : 'border-white/10 bg-[#121820] hover:border-white/25'
                }`}
              >
                <div className="relative aspect-[4/3] bg-black">
                  {lead ? (
                    <ReferenceStill
                      shapeId={lead.shapeId}
                      photos={referencePhotos}
                      alt={s.nickname}
                      className="h-full w-full object-contain"
                      emptyLabel={lead.label}
                    />
                  ) : null}
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                    {lead?.label ?? s.nickname}
                  </span>
                  {count > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white/80">
                      {count}×
                    </span>
                  )}
                </div>
                <p className="px-2 py-1.5 text-[12px] font-semibold leading-tight text-[var(--text)]">
                  {s.nickname}
                </p>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-[#121820] p-3">
        {seq.setupSpeak && !busy && (
          <p className="mb-2 text-sm font-semibold leading-snug text-[var(--text)]">{seq.setupSpeak}</p>
        )}

        {busy && (
          <div
            className={`mt-3 rounded-lg px-3 py-2 ${
              phase === 'holding' || phase === 'finishing'
                ? 'border border-[#ff4d9a]/40 bg-[#2a1018]'
                : 'border border-[var(--accent)]/40 bg-[#102820]'
            }`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                phase === 'holding' || phase === 'finishing' ? HOLD_PINK_TEXT : 'text-[var(--accent)]'
              }`}
            >
              {phase === 'preview'
                ? 'Get set — then the sequence starts'
                : phase === 'finishing'
                  ? 'Loading your hold clips'
                : phase === 'holding'
                  ? 'Hold challenge — clock runs in the handstand'
                  : 'Class flow — stay with the voice'}
            </p>
            <p className="text-sm font-semibold leading-snug text-[var(--text)]">{cue}</p>
            {phase === 'holding' && holdTick && (
              <p className={`mt-1 text-2xl font-black tabular-nums ${HOLD_PINK_TEXT}`}>
                {holdTick.running && holdTick.seconds != null
                  ? formatSeconds(holdTick.seconds)
                  : holdTick.last != null
                    ? formatSeconds(holdTick.last)
                    : '0.0s'}
                <span className="ml-2 text-[12px] font-semibold text-[var(--muted)]">
                  {holdTick.running ? `Hold ${holdTick.tries + 1}` : `${holdTick.tries} timed`}
                  {holdTick.best != null ? ` · best ${formatSeconds(holdTick.best)}` : ''}
                </span>
              </p>
            )}
            {phase === 'holding' && holdTick && !holdTick.running && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {holdTick.handsDown && holdTick.feetOff
                  ? 'Stacked — stay there for the clock'
                  : holdTick.handsDown
                    ? 'Hands are on the floor — kick both feet off'
                    : 'Clock waits until both hands are on the floor'}
              </p>
            )}
            {phase === 'holding' ? <HoldDetectHud detect={holdTick?.detect} /> : null}
          </div>
        )}
      </div>

      {flash && <p className="mb-2 text-sm text-[var(--accent)]">{flash}</p>}

      {phase === 'replay' &&
        createPortal(
        <div className={`fixed inset-0 z-[100] flex flex-col ${holdMode ? 'bg-[#07090c]' : 'bg-black'}`}>
          {holdMode && report ? (
            <>
              <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
                <div className="min-w-0">
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${HOLD_PINK_TEXT}`}>
                    Hold challenge · {HOLD_BUILD_LABEL}
                  </p>
                  <p className="mt-0.5 text-lg font-black leading-tight">
                    {report.holdAttempts?.find((h) => h.clipId === activeClipId || (!activeClipId && h.highlighted))
                      ?.highlighted
                      ? 'Longest hold'
                      : `Hold ${report.holdAttempts?.find((h) => h.clipId === activeClipId)?.index ?? ''}`}
                    <span className={`ml-2 tabular-nums ${HOLD_PINK_TEXT}`}>
                      {formatSeconds(
                        report.holdAttempts?.find((h) => h.clipId === activeClipId)?.holdSeconds ??
                          report.bestHoldSeconds ??
                          0,
                      )}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-white/80">
                    This session{' '}
                    {formatSeconds(report.sessionHoldSeconds ?? sessionHoldTotal(report.holdAttempts))}
                    {holdDay && holdDay.today > 0 ? ` · Today ${formatSeconds(holdDay.today)}` : ''}
                  </p>
                  <p className="mt-0.5 text-[12px] text-white/60">
                    Recap starts at the beginning. Save options are under the clip.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeHoldWatch}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${HOLD_PINK_BTN}`}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => void startSequence(resolveFlowRun(seq.id, flowConfig()) ?? seq)}
                    className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold"
                  >
                    Go again
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 px-2">
                {replayUrl ? (
                  <HoldReplayPlayer
                    src={replayUrl}
                    blob={activeClipId ? getRememberedBlob(activeClipId) : null}
                    track={activeClipId ? getRememberedPoseTrack(activeClipId) : null}
                    holdSeconds={
                      report.holdAttempts?.find((h) => h.clipId === activeClipId)?.holdSeconds ??
                      report.bestHoldSeconds ??
                      0
                    }
                    clockOffsetSec={
                      report.holdAttempts?.find((h) => h.clipId === activeClipId)?.clockOffsetSec ?? 0
                    }
                    recordedWallSec={report.recordedWallSec}
                    startAtBeginning
                    mirror={mirror}
                    clipId={activeClipId}
                    fill
                    filename={videoFileName(
                      report,
                      (activeClipId && getRememberedBlob(activeClipId)?.type) || 'video/mp4',
                      report.holdAttempts?.find((h) => h.clipId === activeClipId)?.index,
                    )}
                    athleteId={athleteId}
                  />
                ) : holdClipPending ? (
                  <p className="flex h-full items-center justify-center px-6 text-center text-sm text-[#ff4d9a]">
                    Opening the clip…
                  </p>
                ) : (
                  <p className="flex h-full items-center justify-center px-6 text-center text-sm text-white/70">
                    No video this time — keep the camera on for the whole hold.
                  </p>
                )}
              </div>
              {(() => {
                const active =
                  report.holdAttempts?.find((h) => h.clipId === activeClipId) ??
                  report.holdAttempts?.find((h) => h.highlighted)
                if (!active?.cues?.length) return null
                return (
                  <div className="shrink-0 px-4 pb-1">
                    <p className="text-[11px] leading-snug text-white/80">
                      {active.cues.slice(0, 2).join(' · ')}
                    </p>
                  </div>
                )
              })()}
              <div className="shrink-0 border-t border-white/10 bg-black/70 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(report.holdAttempts ?? []).map((h) => {
                    const still = snaps.find((s) => s.rep === h.index)
                    const active = Boolean(h.clipId && h.clipId === activeClipId)
                    return (
                      <button
                        key={h.index}
                        type="button"
                        onClick={() => playHoldClip(h.clipId)}
                        className={`w-[5.5rem] shrink-0 overflow-hidden rounded-xl border text-left ${
                          h.highlighted
                            ? 'border-[#ff4d9a] ring-2 ring-[#ff4d9a]'
                            : active
                              ? 'border-white/80'
                              : 'border-white/15'
                        }`}
                      >
                        {still?.url ? (
                          <img
                            src={still.url}
                            alt={`Hold ${h.index}`}
                            className="h-20 w-full bg-black object-cover"
                          />
                        ) : (
                          <div className="flex h-20 items-center justify-center bg-black text-[10px] text-white/45">
                            Hold {h.index}
                          </div>
                        )}
                        <div className="px-1.5 py-1">
                          <p className="text-[10px] font-bold text-white">
                            {h.highlighted ? 'Longest' : `Hold ${h.index}`}
                          </p>
                          <p className={`text-[11px] font-black tabular-nums ${HOLD_PINK_TEXT}`}>
                            {formatSeconds(h.holdSeconds)}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
          <div className="flex shrink-0 flex-col gap-2 px-3 py-2 text-white">
            <p className="text-sm font-medium leading-snug">
              {`Your run · ${seq.nickname} — scrub the delay-cam replay`}
            </p>
            <p className="text-[11px] leading-snug text-white/70">
              Watch first. Grades stay on the next screen — then choose whether to keep the clip.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPhase('review')
                  setCue('')
                }}
                className="rounded-lg border border-white/25 px-3 py-1.5 text-sm"
              >
                Back to analysis
              </button>
              <button
                type="button"
                onClick={() => void startSequence(resolveFlowRun(seq.id, flowConfig()) ?? seq)}
                className="rounded-lg border border-white/25 px-3 py-1.5 text-sm"
              >
                Go again
              </button>
              <button
                type="button"
                onClick={nextSequence}
                className="rounded-lg border border-white/25 px-3 py-1.5 text-sm"
              >
                Next: {nextSeqDef.name.replace(/^\d+\.\s*/, '')}
              </button>
              <button
                type="button"
                onClick={chooseAnotherSequence}
                className="rounded-lg border border-white/25 px-3 py-1.5 text-sm"
              >
                Choose another
              </button>
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
              No video this time — keep the camera on for the whole run. Your snapshots and grades are
              still saved.
            </p>
          )}
          {snaps.length > 0 && (
            <div className="shrink-0 border-t border-white/15 bg-black/80 px-3 py-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                {seq.id === 'flow_mc_hs_5reps'
                  ? 'Handstand 1–5 — tap to jump in the replay'
                  : seq.id === 'flow_long_bridge'
                    ? 'Two stills — long bridge, then chin to chest'
                    : seq.id === 'flow_pike_hollow_arch'
                    ? 'Three stills — pike, hollow, arch'
                    : seq.id === 'flow_pike_tuck_hollow_arch'
                    ? 'Four stills — pike, tuck, hollow, arch'
                    : seq.id === 'flow_lemon_squeezes'
                    ? 'Stills — hollow and tuck (lemon squeezes)'
                    : seq.id === 'flow_core_home'
                    ? 'Home core — pike, tuck, side plank, Superman, hollow'
                    : seq.reviewShapeIds?.includes('handstand')
                    ? 'Handstand snapshot — tap to jump in the replay'
                    : 'Snapshots — tap to jump in the replay'}
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
                    <p className="px-1 py-0.5 text-[10px] font-semibold text-white">{snapTitle(s)}</p>
                    <p className="px-1 pb-1 text-[10px] tabular-nums" style={{ color: scoreColor(s.overall) }}>
                      {s.overall}/100
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
            </>
          )}
        </div>,
        document.body,
      )}

      {phase === 'review' && report && !holdMode && (
        <div className="rounded-lg border border-[var(--accent)]/40 bg-[#121f1a] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {holdMode
              ? 'Your holds · live score + clock on each clip'
              : report.sequenceId === 'flow_mc_hs_5reps'
              ? 'Handstand reps · not a gate'
              : report.sequenceId === 'flow_mc_hs_lg_assist'
                ? 'Handstand form · not a gate'
                : 'Written analysis · not a gate'}
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
                      <span className="font-medium text-[var(--text)]">
                        {s.marker === 'playhead' && s.rep == null
                          ? `${s.shapeName} · replay marker`
                          : snapTitle(s)}
                      </span>
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
                        {s.marker === 'playhead'
                          ? 'Best matching frame in the pass-through — tap to jump the replay here.'
                          : s.shapeId === 'handstand'
                            ? 'Handstand picture looks in on this snapshot — push tall, ears covered, ribs in, butt in, legs together, pointed toes.'
                            : 'Lines look in on this snapshot. Keep that body position next time.'}
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
              onClick={() => void startSequence(resolveFlowRun(seq.id, flowConfig()) ?? seq)}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
            >
              Go again
            </button>
            <button
              type="button"
              onClick={nextSequence}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
            >
              Next: {nextSeqDef.name.replace(/^\d+\.\s*/, '')}
            </button>
            <button
              type="button"
              onClick={chooseAnotherSequence}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
            >
              Choose another sequence
            </button>
            {replayUrl && (
              <button
                type="button"
                onClick={() => {
                  if (activeClipId) {
                    const url = ensureClipUrl(activeClipId)
                    if (url) {
                      setReplayUrl(url)
                      replayUrlRef.current = url
                    }
                  }
                  setPhase('replay')
                }}
                className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
              >
                Watch replay again
              </button>
            )}
          </div>
          {(hitsAsk || pendingStillsRef.current.length > 0) && (
            <div className="mt-3 rounded-lg border border-[#f0b429]/50 bg-[#2a2312] p-3">
              <p className="text-sm font-semibold text-[#f0b429]">
                Keep the {hitsAsk?.blob.type.startsWith('video') ? 'video' : 'stills'} from this run?
              </p>
              <p className="mt-1 text-[12px] leading-snug text-white/80">
                Your grades stay either way. Clips fill up phones if we keep every sequence, so pick a
                home for this one — Photos, the video library, or Learn → My shapes — or dump it.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void keepToPhotos()}
                  className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
                >
                  Save to Photos
                </button>
                {athleteId && (
                  <button
                    type="button"
                    onClick={() => void keepToLibrary()}
                    className="rounded-lg border border-white/25 px-3 py-2 text-sm"
                  >
                    Video library
                  </button>
                )}
                {athleteId && (
                  <button
                    type="button"
                    onClick={() => void keepToMyShapes()}
                    className="rounded-lg border border-white/25 px-3 py-2 text-sm"
                  >
                    My shapes
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    dumpPendingMedia()
                    setFlash('Clip dumped. Grades stay on this page.')
                    window.setTimeout(() => setFlash(null), 4000)
                  }}
                  className="rounded-lg border border-white/25 px-3 py-2 text-sm"
                >
                  Don’t keep the video
                </button>
              </div>
            </div>
          )}
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
              const holdBest = h.bestHoldSeconds ?? h.holdAttempts?.find((a) => a.highlighted)?.holdSeconds
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
                      {h.holdAttempts?.length
                        ? ` · ${h.holdAttempts.length} hold${h.holdAttempts.length === 1 ? '' : 's'}`
                        : ''}
                    </span>
                    {holdBest != null ? (
                      <span className={`font-semibold tabular-nums ${HOLD_PINK_TEXT}`}>
                        {formatSeconds(holdBest)}
                      </span>
                    ) : (
                    <span className="font-semibold tabular-nums" style={{ color: scoreColor(avg) }}>
                      {avg}/100
                    </span>
                    )}
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
