import type { Landmark } from '../types'
import { LM } from './landmarks'
import { mergePair } from './skeleton'

/**
 * Camera rep counting (BETA): detects reps from joint-angle oscillation
 * with hysteresis. A rep = joint goes from EXTENDED past the flexed
 * threshold and back to EXTENDED.
 *
 * This is inherently noisier than hold detection — lighting, clothing,
 * speed, and camera angle all affect it. Always pair with a manual
 * override in the UI. Kill criteria: <90% accuracy in gym lighting
 * means it stays beta and manual-first.
 */

export type RepPhase = 'extended' | 'flexing' | 'flexed' | 'extending'

export type RepDetectorConfig = {
  /** Angle below which the joint counts as flexed (degrees). */
  flexedBelow: number
  /** Angle above which the joint counts as extended (degrees). */
  extendedAbove: number
  /** Minimum seconds per full rep (debounce against jitter). */
  minRepSeconds: number
  /** Frames of smoothing on the angle signal. */
  smoothFrames: number
}

export const PUSHUP_REP_CONFIG: RepDetectorConfig = {
  flexedBelow: 95,
  extendedAbove: 150,
  minRepSeconds: 0.7,
  smoothFrames: 5,
}

export const VUP_REP_CONFIG: RepDetectorConfig = {
  flexedBelow: 100,
  extendedAbove: 150,
  minRepSeconds: 0.8,
  smoothFrames: 5,
}

function angleDeg(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const abx = a.x - b.x
  const aby = a.y - b.y
  const cbx = c.x - b.x
  const cby = c.y - b.y
  const dot = abx * cbx + aby * cby
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby) + 1e-6
  const cos = Math.max(-1, Math.min(1, dot / mag))
  return (Math.acos(cos) * 180) / Math.PI
}

/** Elbow angle (shoulder-elbow-wrist), merged across sides. Null if not visible. */
export function elbowAngleDeg(lm: Landmark[] | null | undefined): number | null {
  if (!lm || lm.length < 33) return null
  const sh = mergePair(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.12)
  const el = mergePair(lm[LM.LEFT_ELBOW], lm[LM.RIGHT_ELBOW], 0.12)
  const wr = mergePair(lm[LM.LEFT_WRIST], lm[LM.RIGHT_WRIST], 0.12)
  if (!sh || !el || !wr) return null
  return angleDeg(sh, el, wr)
}

/** Hip angle (shoulder-hip-knee), merged across sides. Null if not visible. */
export function hipFoldAngleDeg(lm: Landmark[] | null | undefined): number | null {
  if (!lm || lm.length < 33) return null
  const sh = mergePair(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER], 0.12)
  const hip = mergePair(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP], 0.12)
  const knee = mergePair(lm[LM.LEFT_KNEE], lm[LM.RIGHT_KNEE], 0.12)
  if (!sh || !hip || !knee) return null
  return angleDeg(sh, hip, knee)
}

export class RepDetector {
  private phase: RepPhase = 'extended'
  private lastRepAt = 0
  private window: number[] = []
  readonly config: RepDetectorConfig
  /** Whether we've seen a valid starting position yet. */
  private ready = false
  /** Frames of consecutive front-support seen (to debounce). */
  private readyFrames = 0
  /** Frames since last front-support (to un-ready if they leave). */
  private awayFrames = 0

  constructor(config: RepDetectorConfig) {
    this.config = config
  }

  reset(): void {
    this.phase = 'extended'
    this.lastRepAt = 0
    this.window = []
    this.ready = false
    this.readyFrames = 0
    this.awayFrames = 0
  }

  get smoothedPhase(): RepPhase {
    return this.phase
  }

  /** True once the detector has seen the starting position. */
  get isReady(): boolean {
    return this.ready
  }

  /**
   * Tell the detector whether the person is currently in the starting
   * position (front support for push-ups). Call every frame with the
   * result of isFrontSupport(). The detector won't count reps until
   * it's seen the position for a few consecutive frames.
   */
  updateReady(inPosition: boolean): void {
    if (inPosition) {
      this.awayFrames = 0
      this.readyFrames++
      // Need ~10 consecutive frames (~1/3 sec at 30fps) in position to arm.
      if (this.readyFrames >= 10) {
        this.ready = true
      }
    } else {
      this.readyFrames = 0
      this.awayFrames++
      // If they leave position for ~2 seconds, disarm (they stood up, etc).
      if (this.awayFrames >= 60) {
        this.ready = false
        this.phase = 'extended'
      }
    }
  }

  /**
   * Feed a raw joint angle (degrees). Returns true when a full rep completes.
   * Does nothing until updateReady() has armed the detector.
   * `nowMs` should be performance.now().
   */
  push(angle: number | null, nowMs: number): boolean {
    // Don't count anything until we've seen the starting position.
    if (!this.ready) return false
    if (angle == null || !Number.isFinite(angle)) return false
    this.window.push(angle)
    if (this.window.length > this.config.smoothFrames) this.window.shift()
    const a = this.window.reduce((x, y) => x + y, 0) / this.window.length
    const { flexedBelow, extendedAbove, minRepSeconds } = this.config

    switch (this.phase) {
      case 'extended':
        if (a < flexedBelow) this.phase = 'flexing'
        break
      case 'flexing':
        // Commit to the rep once we pass well into the flexed zone.
        if (a < flexedBelow - 8) this.phase = 'flexed'
        else if (a > extendedAbove) this.phase = 'extended' // bailed out
        break
      case 'flexed':
        if (a > flexedBelow + 12) this.phase = 'extending'
        break
      case 'extending':
        if (a > extendedAbove) {
          const dt = (nowMs - this.lastRepAt) / 1000
          this.phase = 'extended'
          if (this.lastRepAt === 0 || dt >= minRepSeconds) {
            this.lastRepAt = nowMs
            return true
          }
        } else if (a < flexedBelow) {
          this.phase = 'flexed' // sank back down
        }
        break
    }
    return false
  }
}

/**
 * Front support (plank) detection for the push-up counter.
 * The counter should not start counting until the person is actually in
 * the starting position — elbows extended, body in a straight line.
 * Works for knee push-ups too (hips stay straight, knees on ground).
 */
export function isFrontSupport(
  lm: Landmark[] | null | undefined,
): boolean {
  const elbow = elbowAngleDeg(lm)
  const hip = hipFoldAngleDeg(lm)
  if (elbow == null || hip == null) return false
  // Arms extended, body straight-ish. Thresholds are lenient to account
  // for camera angle and clothing; the rep detector handles the rest.
  return elbow > 135 && hip > 145
}
