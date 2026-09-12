import type { Landmark } from '../types'
import { looksLikeBackgroundProp, torsoCenter } from './poseSubject'

function torsoJump(a: Landmark[], b: Landmark[]): number {
  const ca = torsoCenter(a)
  const cb = torsoCenter(b)
  if (!ca || !cb) return 0
  return Math.hypot(ca.x - cb.x, ca.y - cb.y)
}

function usableLm(lm: Landmark[] | null | undefined): Landmark[] | null {
  if (!lm || lm.length < 33) return null
  if (looksLikeBackgroundProp(lm)) return null
  return lm
}

export type PoseSample = {
  /** Seconds from the start of the recorded clip. */
  t: number
  lm: Landmark[]
}

export type PoseTrack = PoseSample[]

const tracks = new Map<string, PoseTrack>()

export function rememberPoseTrack(id: string, track: PoseTrack): void {
  tracks.set(id, track)
}

export function getRememberedPoseTrack(id: string): PoseTrack | null {
  return tracks.get(id) ?? null
}

export function cloneLandmarks(lm: Landmark[]): Landmark[] {
  return lm.map((p) => ({
    x: p.x,
    y: p.y,
    z: p.z,
    visibility: p.visibility,
  }))
}

function lerpLandmarks(a: Landmark[], b: Landmark[], u: number): Landmark[] {
  const n = Math.max(a.length, b.length)
  const out: Landmark[] = []
  for (let i = 0; i < n; i++) {
    const A = a[i]
    const B = b[i]
    if (!A) {
      if (B) out.push(B)
      continue
    }
    if (!B) {
      out.push(A)
      continue
    }
    const av = A.visibility ?? 1
    const bv = B.visibility ?? 1
    if (av < 0.16 && bv < 0.16) {
      out.push({ ...A, visibility: 0 })
      continue
    }
    if (av < 0.16) {
      out.push(B)
      continue
    }
    if (bv < 0.16) {
      out.push(A)
      continue
    }
    out.push({
      x: A.x + (B.x - A.x) * u,
      y: A.y + (B.y - A.y) * u,
      z: (A.z ?? 0) + ((B.z ?? 0) - (A.z ?? 0)) * u,
      visibility: av + (bv - av) * u,
    })
  }
  return out
}

/**
 * Seek-and-paint exports used wall-clock MediaRecorder timestamps, so the
 * file is longer than the pose track. Map playback time back onto the track
 * so the skeleton lands with the body instead of coming down first.
 */
export function mediaTimeToTrackTime(
  mediaT: number,
  mediaDuration: number,
  track: PoseTrack | null | undefined,
): number {
  if (!track || track.length === 0) return mediaT
  const first = track[0]!.t
  const last = track[track.length - 1]!.t
  const span = Math.max(0.001, last - first)
  if (first <= 0.35 && Number.isFinite(mediaDuration) && mediaDuration > span + 0.45) {
    const u = Math.max(0, Math.min(1, mediaT / Math.max(0.001, mediaDuration)))
    return first + u * span
  }
  return mediaT
}

export function landmarksAtMedia(
  track: PoseTrack | null | undefined,
  mediaT: number,
  mediaDuration: number,
): Landmark[] | null {
  return landmarksAt(track, mediaTimeToTrackTime(mediaT, mediaDuration, track))
}

export function landmarksAt(track: PoseTrack | null | undefined, t: number): Landmark[] | null {
  if (!track || track.length === 0) return null
  if (t <= track[0]!.t) return usableLm(track[0]!.lm)
  const last = track[track.length - 1]!
  // Do not freeze the last pose onto furniture after the hold ends.
  if (t > last.t + 0.08) return null
  if (t >= last.t) return usableLm(last.lm)
  let lo = 0
  let hi = track.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (track[mid]!.t <= t) lo = mid
    else hi = mid
  }
  const a = track[lo]!
  const b = track[hi]!
  const span = b.t - a.t
  if (span <= 0.0001) return usableLm(a.lm)
  // A steal onto a lamp / stand looks like a teleport. Do not draw that line.
  if (torsoJump(a.lm, b.lm) > 0.16) {
    const nearer = t - a.t <= b.t - t ? a.lm : b.lm
    return usableLm(nearer)
  }
  return usableLm(lerpLandmarks(a.lm, b.lm, (t - a.t) / span))
}

export function serializePoseTrack(track: PoseTrack): string {
  return JSON.stringify(
    track.map((s) => [
      Math.round(s.t * 1000) / 1000,
      s.lm.map((p) => [
        Math.round(p.x * 1000) / 1000,
        Math.round(p.y * 1000) / 1000,
        Math.round((p.z ?? 0) * 1000) / 1000,
        Math.round((p.visibility ?? 1) * 100) / 100,
      ]),
    ]),
  )
}

export function parsePoseTrack(raw: string): PoseTrack | null {
  try {
    const data = JSON.parse(raw) as Array<[number, Array<[number, number, number, number]>]>
    if (!Array.isArray(data)) return null
    return data.map(([t, pts]) => ({
      t,
      lm: pts.map(([x, y, z, v]) => ({ x, y, z, visibility: v })),
    }))
  } catch {
    return null
  }
}
