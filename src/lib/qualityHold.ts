/**
 * Quality shape hold (lunge / lever). Clock follows score.holdReady.
 * Recap / overlay / stretch stay on the same hold clip path as handstand.
 */

import type { Landmark, ScoreResult } from '../types'
import { snapshotCanvas } from './captureStore'
import { getLastTrackDebug } from './athleteTrack'
import {
  formatSeconds,
  startClipRecorder,
  type HoldSessionOpts,
  type RawHoldAttempt,
} from './handstandHold'
import { cloneLandmarks, type PoseTrack } from './poseTrack'
import { looksLikeBackgroundProp, poseLooksHuman } from './poseSubject'
import { playHoldEnterBeep, playHoldExitBeep } from './sounds'
import { durableBlob } from './saveMedia'

const ENTER_FRAMES = 6
const EXIT_FRAMES = 10
const MIN_HOLD_SEC = 1
const MAX_HOLD_SEC = 90
const PEAK_SAMPLE_MS = 90

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

function qualityReady(score: ScoreResult): boolean {
  return Boolean(score.holdReady)
}

export async function runQualityHoldSession(opts: HoldSessionOpts): Promise<RawHoldAttempt[]> {
  const attempts: RawHoldAttempt[] = []
  let last: number | null = null
  let best: number | null = null

  const tick = (
    partial: Partial<{
      seconds: number | null
      running: boolean
      inverted: boolean
      handsDown: boolean
      feetOff: boolean
    }>,
  ) => {
    opts.onTick({
      tries: attempts.length,
      last,
      best,
      seconds: partial.seconds ?? null,
      running: Boolean(partial.running),
      inverted: Boolean(partial.inverted),
      handsDown: partial.handsDown,
      feetOff: partial.feetOff,
    })
  }

  opts.onCue('Get into the shape. The clock starts when it is good enough to hold. Tap Done when you are finished.')
  tick({ seconds: null, running: false, inverted: false })

  while (!opts.cancelled() && !opts.doneRequested()) {
    const rec = { session: null as ReturnType<typeof startClipRecorder> | null }
    let recStart = 0
    const poseTrack: PoseTrack = []
    let enter = 0

    const clockNow = () => {
      if (opts.timelineSec && !rec.session) return opts.timelineSec()
      if (rec.session) return (performance.now() - recStart) / 1000
      return opts.timelineSec?.() ?? 0
    }

    const startRec = () => {
      if (rec.session || opts.timelineSec) return
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
      if (!lm || lm.length < 33) return
      if (!rec.session && !opts.timelineSec) return
      if (looksLikeBackgroundProp(lm)) return
      const dbg = getLastTrackDebug()
      if (dbg?.predicted) return
      if (!poseLooksHuman(lm) && (dbg?.poseConf ?? 0) < 0.34) return
      const t = clockNow()
      const lastSample = poseTrack[poseTrack.length - 1]
      if (lastSample && t - lastSample.t < 0.05) return
      poseTrack.push({ t, lm: cloneLandmarks(lm) })
    }

    startRec()

    while (!opts.cancelled() && !opts.doneRequested()) {
      const lm = opts.landmarks()
      samplePose(lm)
      const ready = qualityReady(opts.score())
      if (ready) {
        enter += 1
        startRec()
      } else {
        enter = 0
      }
      tick({
        seconds: null,
        running: false,
        inverted: ready,
        handsDown: ready,
        feetOff: ready,
      })
      if (enter >= ENTER_FRAMES) break
      await wait(33)
    }

    if (opts.cancelled() || opts.doneRequested()) {
      if (rec.session) void rec.session.stop()
      break
    }

    const holdStart = performance.now()
    const holdStartSec = clockNow()
    let peakRank = -1
    let peakFrozen: ScoreResult | null = null
    let peakBlob: Blob | null = null
    let peakSec = holdStartSec
    let lastPeakSample = 0
    let holdSeconds = 0
    let exit = 0

    opts.onCue('Holding — clock is running. Clock stops when you come out of the shape.')
    playHoldEnterBeep()
    tick({ seconds: 0, running: true, inverted: true, handsDown: true, feetOff: true })

    while (!opts.cancelled()) {
      const now = performance.now()
      holdSeconds = (now - holdStart) / 1000
      const lm = opts.landmarks()
      samplePose(lm)
      const live = opts.score()
      const ready = qualityReady(live)
      if (now - lastPeakSample >= PEAK_SAMPLE_MS) {
        lastPeakSample = now
        if (live.overall >= peakRank) {
          peakRank = live.overall
          peakFrozen = freezeScore(live)
          peakBlob = snapshotCanvas(opts.canvas())
          peakSec = clockNow()
        }
      }
      tick({
        seconds: holdSeconds,
        running: true,
        inverted: ready,
        handsDown: ready,
        feetOff: ready,
      })
      if (opts.doneRequested() || holdSeconds >= MAX_HOLD_SEC) break
      if (!ready) {
        exit += 1
        if (exit >= EXIT_FRAMES) break
      } else {
        exit = 0
      }
      await wait(33)
    }

    playHoldExitBeep()
    if (holdSeconds < MIN_HOLD_SEC) {
      if (rec.session) void rec.session.stop()
      continue
    }

    last = holdSeconds
    best = best == null ? holdSeconds : Math.max(best, holdSeconds)
    let clipBlob: Blob | null = null
    if (rec.session) {
      try {
        const blob = await rec.session.stop()
        if (blob.size > 800) clipBlob = await durableBlob(blob)
      } catch {
        clipBlob = null
      }
    }
    attempts.push({
      holdSeconds,
      livePeak: peakFrozen,
      snapshotBlob: peakBlob,
      clipBlob: opts.timelineSec ? null : clipBlob,
      playheadSec: peakSec,
      clockOffsetSec: holdStartSec,
      poseTrack,
    })
    tick({ seconds: holdSeconds, running: false, inverted: false })
    opts.onCue(`Held ${formatSeconds(holdSeconds)}. Go again, or tap Done.`)
    if (opts.doneRequested()) break
  }

  tick({ seconds: null, running: false, inverted: false })
  return attempts
}
