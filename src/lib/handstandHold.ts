/**
 * One-person handstand hold challenge.
 * Clock starts when they are inverted; clock stops when a foot hits the ground.
 * Walking on the hands does not stop the clock.
 */

import type { Landmark, ScoreResult } from '../types'
import { snapshotCanvas } from './captureStore'
import { LM } from './landmarks'
import { cloneLandmarks, type PoseTrack } from './poseTrack'
import { createRecorder, durableBlob, hintMotion, startRecorder } from './saveMedia'
import { handstandPeakScore } from './scoring'

export function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  if (m > 0) return `${m}:${sec.toFixed(1).padStart(4, '0')}`
  return `${sec.toFixed(1)}s`
}

export const HOLD_ENTER_FRAMES = 3
export const HOLD_EXIT_FRAMES = 5
export const MIN_HOLD_SEC = 0.45
export const POST_FOOT_MS = 650
export const MAX_HOLD_SEC = 90
export const PEAK_SAMPLE_MS = 90

export type RawHoldAttempt = {
  holdSeconds: number
  livePeak: ScoreResult | null
  snapshotBlob: Blob | null
  clipBlob: Blob | null
  playheadSec: number
  clockOffsetSec: number
  poseTrack: PoseTrack
}

export type HoldTick = {
  seconds: number | null
  running: boolean
  /** Completed holds so far (the one in progress is tries + 1). */
  tries: number
  last: number | null
  best: number | null
  inverted: boolean
}

export type HoldSessionOpts = {
  cancelled: () => boolean
  doneRequested: () => boolean
  landmarks: () => Landmark[] | null
  score: () => ScoreResult
  stream: () => MediaStream | null
  canvas: () => HTMLCanvasElement | null
  onTick: (tick: HoldTick) => void
  onCue: (line: string) => void
}

function visOk(p: Landmark | undefined, min = 0.18): p is Landmark {
  return Boolean(p) && (p!.visibility ?? 1) >= min
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function freezeScore(live: ScoreResult): ScoreResult {
  return {
    ...live,
    criteria: live.criteria.map((c) => ({ ...c })),
  }
}

/** Wrists toward the floor, both feet off the floor — side or front. */
export function poseInverted(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false
  const wrists = [lm[LM.LEFT_WRIST], lm[LM.RIGHT_WRIST]].filter((p) => visOk(p, 0.16))
  const ankles = [lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE]].filter((p) => visOk(p, 0.12))
  const hips = [lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP]].filter((p) => visOk(p, 0.16))
  if (wrists.length === 0 || ankles.length === 0) return false

  const wristY = Math.max(...wrists.map((p) => p.y))
  const ankleLow = Math.min(...ankles.map((p) => p.y))
  const ankleHigh = Math.max(...ankles.map((p) => p.y))
  const hipY = hips.length
    ? hips.reduce((s, p) => s + p.y, 0) / hips.length
    : (wristY + ankleLow) / 2

  const longLine = wristY - ankleLow > 0.22
  const handsLow = wristY > 0.48
  const feetUp = ankleLow < 0.48 && ankleHigh < 0.56
  const hipsAboveHands = hipY < wristY - 0.05
  return longLine && handsLow && feetUp && hipsAboveHands
}

/** Either foot (ankle, heel, or toe) is back on the floor. */
export function footOnGround(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false
  const pts = [
    lm[LM.LEFT_ANKLE],
    lm[LM.RIGHT_ANKLE],
    lm[LM.LEFT_HEEL],
    lm[LM.RIGHT_HEEL],
    lm[LM.LEFT_FOOT_INDEX],
    lm[LM.RIGHT_FOOT_INDEX],
  ].filter((p) => visOk(p, 0.1))
  if (pts.length === 0) return false
  return pts.some((p) => p.y > 0.62)
}

export function startClipRecorder(stream: MediaStream): {
  startedAt: number
  stop: () => Promise<Blob>
} {
  const owned: MediaStreamTrack[] = []
  const clones = stream.getVideoTracks().map((t) => {
    try {
      const c = t.clone()
      owned.push(c)
      return c
    } catch {
      return t
    }
  })
  const recStream = new MediaStream(clones)
  hintMotion(recStream)
  const rec = createRecorder(recStream)
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  startRecorder(rec, 400)
  return {
    startedAt: performance.now(),
    stop: () =>
      new Promise((resolve) => {
        const finish = () => {
          owned.forEach((t) => {
            try {
              t.stop()
            } catch {
              /* already stopped */
            }
          })
          const type = rec.mimeType || 'video/mp4'
          resolve(new Blob(chunks, { type }))
        }
        rec.addEventListener('stop', finish, { once: true })
        if (rec.state === 'inactive') finish()
        else {
          try {
            rec.requestData()
          } catch {
            /* some browsers throw if idle */
          }
          try {
            rec.stop()
          } catch {
            finish()
          }
        }
      }),
  }
}

export async function runHandstandHoldSession(opts: HoldSessionOpts): Promise<RawHoldAttempt[]> {
  const attempts: RawHoldAttempt[] = []
  let last: number | null = null
  let best: number | null = null

  const tick = (partial: Partial<HoldTick> & Pick<HoldTick, 'seconds' | 'running' | 'inverted'>) => {
    opts.onTick({
      tries: attempts.length,
      last,
      best,
      ...partial,
    })
  }

  opts.onCue(
    'Kick to a handstand when you are ready. Hold as long as you can. Walking is allowed — try not to. Tap Done when you are finished.',
  )
  tick({ seconds: null, running: false, inverted: false })

  while (!opts.cancelled() && !opts.doneRequested()) {
    let enterFrames = 0
    const rec = {
      session: null as ReturnType<typeof startClipRecorder> | null,
    }
    let recStart = 0
    const poseTrack: PoseTrack = []

    const startRec = () => {
      if (rec.session) return
      const stream = opts.stream()
      if (!stream || typeof MediaRecorder === 'undefined') return
      try {
        rec.session = startClipRecorder(stream)
        recStart = rec.session.startedAt
      } catch {
        rec.session = null
      }
    }

    const samplePose = (lm: Landmark[] | null) => {
      if (!rec.session || !lm || lm.length < 33) return
      const t = (performance.now() - recStart) / 1000
      const last = poseTrack[poseTrack.length - 1]
      if (last && t - last.t < 0.05) return
      poseTrack.push({ t, lm: cloneLandmarks(lm) })
    }

    // Record as soon as we wait for a kick-up so talking does not eat the video.
    startRec()

    while (!opts.cancelled() && !opts.doneRequested()) {
      const lm = opts.landmarks()
      const inverted = poseInverted(lm)
      samplePose(lm)
      if (inverted) {
        enterFrames += 1
        startRec()
        if (enterFrames >= HOLD_ENTER_FRAMES) break
      } else {
        enterFrames = 0
      }
      tick({ seconds: null, running: false, inverted })
      await wait(33)
    }

    if (opts.cancelled() || opts.doneRequested()) {
      if (rec.session) void rec.session.stop()
      break
    }

    const holdStart = performance.now()
    let peakRank = -1
    let peakFrozen: ScoreResult | null = null
    let peakBlob: Blob | null = null
    let peakAt = holdStart
    let lastPeakSample = 0
    let exitFrames = 0
    let holdSeconds = 0

    opts.onCue('Holding — clock is running. Walking is allowed. Clock stops when a foot hits.')
    tick({ seconds: 0, running: true, inverted: true })

    while (!opts.cancelled()) {
      const now = performance.now()
      holdSeconds = (now - holdStart) / 1000
      const lm = opts.landmarks()
      samplePose(lm)
      const down = footOnGround(lm)
      if (down) exitFrames += 1
      else exitFrames = 0

      if (now - lastPeakSample >= PEAK_SAMPLE_MS) {
        lastPeakSample = now
        const live = opts.score()
        const rank = handstandPeakScore(live)
        if (rank >= peakRank) {
          peakRank = rank
          peakFrozen = freezeScore(live)
          peakBlob = snapshotCanvas(opts.canvas())
          peakAt = now
        }
      }

      tick({ seconds: holdSeconds, running: true, inverted: true })

      if (exitFrames >= HOLD_EXIT_FRAMES || holdSeconds >= MAX_HOLD_SEC) break
      await wait(33)
    }

    if (opts.cancelled()) {
      if (rec.session) void rec.session.stop()
      break
    }

    tick({ seconds: holdSeconds, running: false, inverted: false })
    opts.onCue(
      holdSeconds >= MIN_HOLD_SEC
        ? `Foot down — ${formatSeconds(holdSeconds)}. Kick up again when you are ready, or tap Done.`
        : 'That kick did not stick. Kick up again when you are ready, or tap Done.',
    )

    await wait(POST_FOOT_MS)
    let clipBlob: Blob | null = null
    if (rec.session) {
      try {
        const blob = await rec.session.stop()
        if (blob.size > 800) clipBlob = await durableBlob(blob)
      } catch {
        clipBlob = null
      }
    }

    if (holdSeconds >= MIN_HOLD_SEC) {
      const playheadSec = Math.max(0, (peakAt - recStart) / 1000)
      const clockOffsetSec = Math.max(0, (holdStart - recStart) / 1000)
      last = holdSeconds
      best = best == null ? holdSeconds : Math.max(best, holdSeconds)
      attempts.push({
        holdSeconds,
        livePeak: peakFrozen,
        snapshotBlob: peakBlob,
        clipBlob,
        playheadSec,
        clockOffsetSec,
        poseTrack,
      })
      tick({ seconds: holdSeconds, running: false, inverted: false })
    }

    if (opts.doneRequested()) break
  }

  tick({ seconds: null, running: false, inverted: false })
  return attempts
}
