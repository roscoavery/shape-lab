/**
 * One-person handstand hold challenge.
 * Clock starts when both hands are on the ground and the feet leave
 * (kick-up). Clock stops when a foot returns to the ground.
 * Walking on the hands does not stop the clock.
 */

import type { Landmark, ScoreResult } from '../types'
import { snapshotCanvas } from './captureStore'
import { LM } from './landmarks'
import { cloneLandmarks, type PoseTrack } from './poseTrack'
import { createRecorder, durableBlob, hintMotion, startRecorder } from './saveMedia'
import { handstandPeakScore } from './scoring'
import { extractVideoRange } from './trimVideo'

export function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  if (m > 0) return `${m}:${sec.toFixed(1).padStart(4, '0')}`
  return `${sec.toFixed(1)}s`
}

export const HOLD_ENTER_FRAMES = 2
export const HOLD_EXIT_FRAMES = 10
export const MIN_HOLD_SEC = 0.45
/** Done with no detected kick-up still keeps a clip this long. */
export const SALVAGE_HOLD_SEC = 2.4
export const PRE_ROLL_SEC = 2
export const POST_ROLL_SEC = 2
export const POST_FOOT_MS = POST_ROLL_SEC * 1000
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
  handsDown?: boolean
  feetOff?: boolean
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

function visOk(p: Landmark | undefined, min = 0.04): p is Landmark {
  return Boolean(p) && Number.isFinite(p!.x) && Number.isFinite(p!.y) && (p!.visibility ?? 1) >= min
}

function avgY(pts: Landmark[]): number {
  return pts.reduce((s, p) => s + p.y, 0) / pts.length
}

function pairY(a: Landmark | undefined, b: Landmark | undefined, min = 0.04): number | null {
  const pts = [a, b].filter((p): p is Landmark => visOk(p, min))
  if (pts.length === 0) return null
  return avgY(pts)
}

function headY(lm: Landmark[]): number | null {
  const nose = visOk(lm[LM.NOSE], 0.03) ? lm[LM.NOSE]!.y : null
  const ears = pairY(lm[LM.LEFT_EAR], lm[LM.RIGHT_EAR], 0.03)
  if (nose != null && ears != null) return (nose + ears) / 2
  return nose ?? ears
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

function sideFootOnFloor(lm: Landmark[], left: boolean, floorY: number): boolean {
  const pts = left
    ? [lm[LM.LEFT_ANKLE], lm[LM.LEFT_HEEL], lm[LM.LEFT_FOOT_INDEX]]
    : [lm[LM.RIGHT_ANKLE], lm[LM.RIGHT_HEEL], lm[LM.RIGHT_FOOT_INDEX]]
  return pts.some((p) => visOk(p, 0.05) && p.y > floorY)
}

/** Palms / wrists planted toward the floor (image y grows downward). */
export function handsOnGround(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false
  const wristY = pairY(lm[LM.LEFT_WRIST], lm[LM.RIGHT_WRIST], 0.03)
  const tipY = pairY(lm[LM.LEFT_INDEX], lm[LM.RIGHT_INDEX], 0.03)
  const handY = wristY ?? tipY
  if (handY == null) return false
  const shoulderY = pairY(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.03)
  const hipY = pairY(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.03)
  // Arms overhead (stand or walk) put the wrists above the shoulders.
  if (shoulderY != null && handY < shoulderY - 0.02) return false
  // Hands must be at or below the hips — stacked on the floor, not a T.
  if (hipY != null && handY < hipY - 0.08) return false
  return true
}

/**
 * Both feet have left the floor. Missing ankles count as off when the
 * hips are already stacked above the hands — the feet often leave the frame.
 */
export function feetOffGround(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false
  const wristY =
    pairY(lm[LM.LEFT_WRIST], lm[LM.RIGHT_WRIST], 0.03) ??
    pairY(lm[LM.LEFT_INDEX], lm[LM.RIGHT_INDEX], 0.03) ??
    0.82
  const hipY = pairY(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.03)
  const ankleY = pairY(lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE], 0.03)
  const heelY = pairY(lm[LM.LEFT_HEEL], lm[LM.RIGHT_HEEL], 0.03)
  const footY = ankleY ?? heelY
  if (footY == null) {
    return hipY != null && hipY < wristY - 0.04
  }
  const floorY = wristY - 0.1
  const left = sideFootOnFloor(lm, true, floorY)
  const right = sideFootOnFloor(lm, false, floorY)
  return !left && !right
}

/**
 * In a handstand — side or front, feet in frame or not.
 * Used for the hold clock and for homework wall / freestanding HS.
 *
 * MediaPipe often drops ankles once the feet leave the top of the frame,
 * and visibility on planted wrists is low. Any one strong stacked signal
 * is enough; standing with arms up must not pass.
 */
export function poseInverted(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false

  const wristY =
    pairY(lm[LM.LEFT_WRIST], lm[LM.RIGHT_WRIST], 0.03) ??
    pairY(lm[LM.LEFT_INDEX], lm[LM.RIGHT_INDEX], 0.03)
  const hipY = pairY(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.03)
  const shoulderY = pairY(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.03)
  const ankleY =
    pairY(lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE], 0.03) ??
    pairY(lm[LM.LEFT_HEEL], lm[LM.RIGHT_HEEL], 0.03)
  const noseY = headY(lm)
  const handsDown = handsOnGround(lm)
  const feetOff = feetOffGround(lm)

  const headLow = noseY != null && hipY != null && noseY > hipY + 0.05
  const hipsAboveHands = wristY != null && hipY != null && hipY < wristY - 0.04
  const feetAboveHands = wristY != null && ankleY != null && ankleY < wristY - 0.08
  const feetAboveShoulders =
    shoulderY != null && ankleY != null && ankleY < shoulderY - 0.04
  const longInvert = wristY != null && ankleY != null && wristY - ankleY > 0.2

  if (handsDown && (hipsAboveHands || feetAboveHands || feetAboveShoulders || feetOff)) {
    return true
  }
  if (headLow && (handsDown || hipsAboveHands || feetAboveHands)) return true
  if (handsDown && longInvert) return true
  return false
}

/** Either foot (ankle, heel, or toe) is back near the hands / floor. */
export function footOnGround(lm: Landmark[] | null | undefined): boolean {
  if (!lm || lm.length < 33) return false
  const wristY =
    pairY(lm[LM.LEFT_WRIST], lm[LM.RIGHT_WRIST], 0.03) ??
    pairY(lm[LM.LEFT_INDEX], lm[LM.RIGHT_INDEX], 0.03)
  if (wristY == null) return false
  // Floor lives at the hands. A mid-air foot in the lower half of the
  // frame must not end a hold — that was the old 0.62 absolute cutoff.
  const floorY = wristY - 0.1
  return sideFootOnFloor(lm, true, floorY) || sideFootOnFloor(lm, false, floorY)
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

async function trimHoldClip(
  blob: Blob,
  clockOffsetSec: number,
  holdSeconds: number,
  playheadSec: number,
  poseTrack: PoseTrack,
): Promise<{
  clipBlob: Blob
  clockOffsetSec: number
  playheadSec: number
  poseTrack: PoseTrack
}> {
  const start = Math.max(0, clockOffsetSec - PRE_ROLL_SEC)
  const end = clockOffsetSec + holdSeconds + POST_ROLL_SEC
  let next = blob
  try {
    next = await extractVideoRange(blob, start, end)
  } catch {
    next = blob
  }
  return {
    clipBlob: next,
    clockOffsetSec: Math.max(0, clockOffsetSec - start),
    playheadSec: Math.max(0, playheadSec - start),
    poseTrack: poseTrack
      .filter((p) => p.t >= start - 0.08 && p.t <= end + 0.08)
      .map((p) => ({ t: Math.max(0, p.t - start), lm: p.lm })),
  }
}

function longestInvertedSpan(poseTrack: PoseTrack, elapsed: number): {
  start: number
  end: number
  found: boolean
} {
  let bestStart = 0
  let bestEnd = elapsed
  let found = false
  let spanStart: number | null = null
  for (const p of poseTrack) {
    if (poseInverted(p.lm)) {
      if (spanStart == null) spanStart = p.t
    } else if (spanStart != null) {
      if (!found || p.t - spanStart > bestEnd - bestStart) {
        bestStart = spanStart
        bestEnd = p.t
        found = true
      }
      spanStart = null
    }
  }
  if (spanStart != null && (!found || elapsed - spanStart > bestEnd - bestStart)) {
    return { start: spanStart, end: elapsed, found: true }
  }
  return { start: bestStart, end: bestEnd, found }
}

async function salvageWaitingHold(
  opts: HoldSessionOpts,
  session: ReturnType<typeof startClipRecorder> | null,
  recStart: number,
  poseTrack: PoseTrack,
): Promise<RawHoldAttempt | null> {
  const elapsed = session ? (performance.now() - recStart) / 1000 : 0
  if (!session || elapsed < SALVAGE_HOLD_SEC) return null

  const span = longestInvertedSpan(poseTrack, elapsed)
  const holdSeconds = span.found
    ? Math.max(MIN_HOLD_SEC, span.end - span.start)
    : elapsed
  const clockOffsetSec = span.found ? span.start : 0
  const playheadSec = span.found ? (span.start + span.end) / 2 : elapsed / 2

  let clipBlob: Blob | null = null
  try {
    const blob = await session.stop()
    if (blob.size > 800) clipBlob = await durableBlob(blob)
  } catch {
    clipBlob = null
  }

  const live = opts.score()
  const peakFrozen = live.overall > 0 ? freezeScore(live) : null
  const peakBlob = snapshotCanvas(opts.canvas())
  const trimmed = clipBlob
    ? await trimHoldClip(clipBlob, clockOffsetSec, holdSeconds, playheadSec, poseTrack)
    : { clipBlob, clockOffsetSec, playheadSec, poseTrack }

  return {
    holdSeconds,
    livePeak: peakFrozen,
    snapshotBlob: peakBlob,
    clipBlob: trimmed.clipBlob,
    playheadSec: trimmed.playheadSec,
    clockOffsetSec: trimmed.clockOffsetSec,
    poseTrack: trimmed.poseTrack,
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
    'Kick to a handstand when you are ready. The clock starts when your hands are down and your feet leave the ground. Tap Done when you are finished.',
  )
  tick({ seconds: null, running: false, inverted: false, handsDown: false, feetOff: false })

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
      const lastSample = poseTrack[poseTrack.length - 1]
      if (lastSample && t - lastSample.t < 0.05) return
      poseTrack.push({ t, lm: cloneLandmarks(lm) })
    }

    // Record while we wait so the clip can start ~2s before the kick-up.
    startRec()

    while (!opts.cancelled() && !opts.doneRequested()) {
      const lm = opts.landmarks()
      const handsDown = handsOnGround(lm)
      const feetOff = feetOffGround(lm)
      const inverted = poseInverted(lm)
      samplePose(lm)
      if (inverted) {
        enterFrames += 1
        startRec()
        if (enterFrames >= HOLD_ENTER_FRAMES) break
      } else {
        enterFrames = 0
      }
      tick({ seconds: null, running: false, inverted, handsDown, feetOff })
      await wait(33)
    }

    if (opts.cancelled()) {
      if (rec.session) void rec.session.stop()
      break
    }
    if (opts.doneRequested()) {
      const salvaged = await salvageWaitingHold(opts, rec.session, recStart, poseTrack)
      if (salvaged) {
        last = salvaged.holdSeconds
        best = best == null ? salvaged.holdSeconds : Math.max(best, salvaged.holdSeconds)
        attempts.push(salvaged)
        tick({ seconds: salvaged.holdSeconds, running: false, inverted: false })
        opts.onCue(
          `Kept your hold — ${formatSeconds(salvaged.holdSeconds)}. The clock missed the kick-up, so this is the recorded clip.`,
        )
      } else if (rec.session) {
        void rec.session.stop()
      }
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
    tick({ seconds: 0, running: true, inverted: true, handsDown: true, feetOff: true })

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

      tick({ seconds: holdSeconds, running: true, inverted: true, handsDown: true, feetOff: !down })

      if (opts.doneRequested() || exitFrames >= HOLD_EXIT_FRAMES || holdSeconds >= MAX_HOLD_SEC) break
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

    await wait(opts.doneRequested() ? 400 : POST_FOOT_MS)
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
      const trimmed = clipBlob
        ? await trimHoldClip(clipBlob, clockOffsetSec, holdSeconds, playheadSec, poseTrack)
        : {
            clipBlob,
            clockOffsetSec,
            playheadSec,
            poseTrack,
          }
      attempts.push({
        holdSeconds,
        livePeak: peakFrozen,
        snapshotBlob: peakBlob,
        clipBlob: trimmed.clipBlob,
        playheadSec: trimmed.playheadSec,
        clockOffsetSec: trimmed.clockOffsetSec,
        poseTrack: trimmed.poseTrack,
      })
      tick({ seconds: holdSeconds, running: false, inverted: false })
    }

    if (opts.doneRequested()) break
  }

  tick({ seconds: null, running: false, inverted: false })
  return attempts
}
