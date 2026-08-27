import type { Landmark } from '../types'

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

export function landmarksAt(track: PoseTrack | null | undefined, t: number): Landmark[] | null {
  if (!track || track.length === 0) return null
  if (t <= track[0]!.t) return track[0]!.lm
  const last = track[track.length - 1]!
  if (t >= last.t) return last.lm
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
  if (span <= 0.0001) return a.lm
  const u = (t - a.t) / span
  if (u < 0.5) return a.lm
  return b.lm
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
