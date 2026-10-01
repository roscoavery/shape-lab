/**
 * Gym-wide per-video playback adjustments, keyed by video URL.
 * Trim start/end, crop rectangle, and slow-motion segments, set in the
 * fullscreen player's Adjust mode. Saved to the server (data/video-adjustments.json,
 * mirrored like other gym data) so they apply on every device and survive restarts.
 * Applied at playback time — original files are never modified.
 */

import { markedFetch } from './authSession'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { clipLoopKey } from './socialUrls'

/** Crop rectangle as fractions (0-1) of the video element box. */
export type VideoCrop = {
  x: number
  y: number
  w: number
  h: number
}

export type SlowMoSegment = {
  start: number
  end: number
  rate: number
}

export type TextOverlay = {
  text: string
  start: number
  end: number
}

export type VideoAdjustment = {
  trimStart: number | null
  trimEnd: number | null
  crop: VideoCrop | null
  slowMo: SlowMoSegment[]
  mirrored: boolean
  textOverlays: TextOverlay[]
  hidden: boolean
  updatedAt: string
}

type AdjustmentsFile = {
  kind: 'shape-lab-video-adjustments'
  version: 2
  exportedAt: string
  adjustments: Record<string, VideoAdjustment>
}

type VideoAdjustmentsValue = {
  get: (url: string) => VideoAdjustment | null
  save: (url: string, adj: Omit<VideoAdjustment, 'updatedAt'>) => void
  clear: (url: string) => void
}

const VideoAdjustmentsContext = createContext<VideoAdjustmentsValue | null>(null)

function normalizeAdjustment(value: unknown): VideoAdjustment | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as VideoAdjustment
  const trimStart = raw.trimStart == null ? null : Number(raw.trimStart)
  const trimEnd = raw.trimEnd == null ? null : Number(raw.trimEnd)
  if (trimStart != null && (!Number.isFinite(trimStart) || trimStart < 0)) return null
  if (trimEnd != null && (!Number.isFinite(trimEnd) || trimEnd <= 0)) return null
  if (trimStart != null && trimEnd != null && trimEnd <= trimStart) return null
  const crop =
    raw.crop && typeof raw.crop === 'object'
      ? {
          x: Number((raw.crop as VideoCrop).x),
          y: Number((raw.crop as VideoCrop).y),
          w: Number((raw.crop as VideoCrop).w),
          h: Number((raw.crop as VideoCrop).h),
        }
      : null
  const slowMo = Array.isArray(raw.slowMo)
    ? raw.slowMo
        .map((s) => ({
          start: Number((s as SlowMoSegment).start),
          end: Number((s as SlowMoSegment).end),
          rate: Number((s as SlowMoSegment).rate),
        }))
        .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start && s.rate > 0 && s.rate <= 1)
    : []
  const textOverlays = Array.isArray(raw.textOverlays)
    ? raw.textOverlays
        .map((o) => ({
          text: String((o as TextOverlay).text ?? '').slice(0, 140),
          start: Number((o as TextOverlay).start),
          end: Number((o as TextOverlay).end),
        }))
        .filter((o) => o.text.length > 0 && Number.isFinite(o.start) && Number.isFinite(o.end) && o.end > o.start)
    : []
  const mirrored = raw.mirrored === true
  const hidden = raw.hidden === true
  if (
    trimStart == null &&
    trimEnd == null &&
    crop == null &&
    slowMo.length === 0 &&
    !mirrored &&
    textOverlays.length === 0 &&
    !hidden
  )
    return null
  return {
    trimStart,
    trimEnd,
    crop,
    slowMo,
    mirrored,
    textOverlays,
    hidden,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  }
}

async function pullAdjustments(): Promise<Record<string, VideoAdjustment>> {
  try {
    const res = await fetch('/api/video-adjustments')
    if (!res.ok) return {}
    const data = (await res.json()) as AdjustmentsFile
    if (!data || data.kind !== 'shape-lab-video-adjustments' || !data.adjustments) return {}
    const out: Record<string, VideoAdjustment> = {}
    for (const [key, value] of Object.entries(data.adjustments)) {
      const entry = normalizeAdjustment(value)
      if (entry) out[clipLoopKey(key)] = entry
    }
    return out
  } catch {
    return {}
  }
}

export function VideoAdjustmentsProvider({ children }: { children: ReactNode }) {
  const [adjustments, setAdjustments] = useState<Record<string, VideoAdjustment>>({})
  const timerRef = useRef<number | null>(null)
  const latestRef = useRef(adjustments)
  latestRef.current = adjustments

  useEffect(() => {
    void pullAdjustments().then((remote) => {
      setAdjustments((local) => ({ ...remote, ...local }))
    })
  }, [])

  const flush = useCallback((next: Record<string, VideoAdjustment>) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      void markedFetch('/api/video-adjustments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'shape-lab-video-adjustments',
          version: 2,
          exportedAt: new Date().toISOString(),
          adjustments: next,
        }),
      })
    }, 400)
  }, [])

  const get = useCallback(
    (url: string) => {
      const key = clipLoopKey(url)
      return latestRef.current[key] ?? adjustments[key] ?? null
    },
    [adjustments],
  )

  const save = useCallback(
    (url: string, adj: Omit<VideoAdjustment, 'updatedAt'>) => {
      const key = clipLoopKey(url)
      const entry: VideoAdjustment = { ...adj, updatedAt: new Date().toISOString() }
      setAdjustments((prev) => {
        const next = { ...prev, [key]: entry }
        latestRef.current = next
        flush(next)
        return next
      })
    },
    [flush],
  )

  const clear = useCallback(
    (url: string) => {
      const key = clipLoopKey(url)
      setAdjustments((prev) => {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        latestRef.current = next
        flush(next)
        return next
      })
    },
    [flush],
  )

  const value = useMemo(() => ({ get, save, clear }), [get, save, clear])
  return (
    <VideoAdjustmentsContext.Provider value={value}>
      {children}
    </VideoAdjustmentsContext.Provider>
  )
}

export function useVideoAdjustments(): VideoAdjustmentsValue {
  const ctx = useContext(VideoAdjustmentsContext)
  if (!ctx) {
    throw new Error('useVideoAdjustments must be used inside VideoAdjustmentsProvider')
  }
  return ctx
}

export function useVideoAdjustmentsOptional(): VideoAdjustmentsValue | null {
  return useContext(VideoAdjustmentsContext)
}

/** Reactive per-URL adjustment: re-reads whenever the provider's data changes. */
export function useAdjustment(url: string): VideoAdjustment | null {
  const api = useVideoAdjustmentsOptional()
  // `api` identity changes when the underlying adjustments change, so this
  // recomputes on every save/clear.
  return useMemo(() => api?.get(url) ?? null, [api, url])
}
