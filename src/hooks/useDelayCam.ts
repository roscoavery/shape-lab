/**
 * Rolling recorder + delay-cam playhead (same engine as Compare).
 * Plays the live stream N seconds behind, and can flush a replay blob.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getDelayCameraPipeline,
  pickRecorderMime,
  prepareDelayVideo,
} from '../lib/delayCameraPipeline'

export const DELAY_MIN = 6
export const DELAY_MAX = 20
const TRIM_MARGIN = 8

export function useDelayCam(stream: MediaStream | null, delaySec: number, enabled: boolean) {
  const delayVideoRef = useRef<HTMLVideoElement | null>(null)
  const delaySourceBufferRef = useRef<SourceBuffer | null>(null)
  const delayMediaSourceRef = useRef<MediaSource | null>(null)
  const delayQueueRef = useRef<ArrayBuffer[]>([])
  const delayTimerRef = useRef(0)
  const delayUrlRef = useRef<string | null>(null)
  const delaySecRef = useRef(delaySec)

  const rollingRecorderRef = useRef<MediaRecorder | null>(null)
  const rollingChunksRef = useRef<Blob[]>([])
  const rollingStartRef = useRef(0)
  const rollingMimeRef = useRef('video/webm')
  const rollingGenRef = useRef(0)
  const rollingPumpRef = useRef(0)
  const flushWaiterRef = useRef<((blob: Blob | null) => void) | null>(null)
  const lastBlobRef = useRef<Blob | null>(null)

  const [buffering, setBuffering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const restartingRef = useRef(false)

  const blobFromParts = useCallback((): Blob | null => {
    const parts = rollingChunksRef.current.filter((part) => part.size > 0)
    if (parts.length > 0) {
      try {
        const blob = new Blob(parts, { type: rollingMimeRef.current || 'video/webm' })
        if (blob.size > 500) {
          lastBlobRef.current = blob
          return blob
        }
      } catch {
        /* keep lastBlob */
      }
    }
    const last = lastBlobRef.current
    return last && last.size > 500 ? last : null
  }, [])

  useEffect(() => {
    delaySecRef.current = delaySec
  }, [delaySec])

  const pumpDelayQueue = useCallback(() => {
    const sb = delaySourceBufferRef.current
    if (!sb || sb.updating) return
    const next = delayQueueRef.current.shift()
    if (next) {
      try {
        sb.appendBuffer(next)
      } catch {
        /* quota / detached */
      }
    }
  }, [])

  const startRolling = useCallback(
    (live: MediaStream): Promise<boolean> => {
      return new Promise((resolve) => {
        const pipeline = getDelayCameraPipeline()
        const mime = pipeline?.mime ?? pickRecorderMime()
        if (typeof MediaRecorder === 'undefined') {
          resolve(false)
          return
        }
        const existing = rollingRecorderRef.current
        if (existing && existing.state !== 'inactive') {
          resolve(true)
          return
        }
        window.clearInterval(rollingPumpRef.current)
        rollingMimeRef.current = mime ?? 'video/mp4'
        rollingChunksRef.current = []
        lastBlobRef.current = null
        rollingStartRef.current = performance.now()
        rollingGenRef.current += 1
        const gen = rollingGenRef.current
        let rec: MediaRecorder
        try {
          rec = mime ? new MediaRecorder(live, { mimeType: mime }) : new MediaRecorder(live)
        } catch {
          try {
            rec = new MediaRecorder(live)
          } catch (err) {
            rollingRecorderRef.current = null
            setError(err instanceof Error ? err.message : 'Could not start delay-cam recording')
            resolve(false)
            return
          }
        }
        rollingRecorderRef.current = rec
        let settled = false
        const done = (ok: boolean) => {
          if (settled) return
          settled = true
          resolve(ok)
        }
        rec.onstart = () => done(true)
        rec.ondataavailable = (e) => {
          if (gen !== rollingGenRef.current) return
          if (!e.data || e.data.size === 0) return
          rollingChunksRef.current.push(e.data)
          try {
            lastBlobRef.current = new Blob(rollingChunksRef.current, {
              type: rec.mimeType || rollingMimeRef.current,
            })
          } catch {
            /* keep prior lastBlob */
          }
          if (!settled) done(true)
          if (delayMediaSourceRef.current) {
            void e.data.arrayBuffer().then((buf) => {
              delayQueueRef.current.push(buf)
              pumpDelayQueue()
            })
          }
        }
        rec.onstop = () => {
          const waiter = flushWaiterRef.current
          flushWaiterRef.current = null
          const parts = rollingChunksRef.current
          let blob: Blob | null = null
          if (parts.length > 0) {
            try {
              blob = new Blob(parts, { type: rec.mimeType || rollingMimeRef.current })
            } catch {
              blob = null
            }
          }
          if ((!blob || blob.size <= 500) && lastBlobRef.current && lastBlobRef.current.size > 500) {
            blob = lastBlobRef.current
          }
          if (blob && blob.size > 500) lastBlobRef.current = blob
          if (waiter) waiter(blob && blob.size > 500 ? blob : null)
        }
        try {
          rec.start(200)
          if (pipeline?.managed) {
            rollingPumpRef.current = window.setInterval(() => {
              if (rec.state === 'recording') {
                try {
                  rec.requestData()
                } catch {
                  /* iOS timeslice fallback */
                }
              }
            }, 350)
          }
        } catch (err) {
          rollingRecorderRef.current = null
          setError(err instanceof Error ? err.message : 'Could not start delay-cam recording')
          done(false)
          return
        }
        window.setTimeout(() => done(rec.state === 'recording' || rollingChunksRef.current.length > 0), 800)
      })
    },
    [pumpDelayQueue],
  )

  const stopRolling = useCallback(() => {
    window.clearInterval(rollingPumpRef.current)
    flushWaiterRef.current = null
    const rec = rollingRecorderRef.current
    rollingRecorderRef.current = null
    if (rec && rec.state !== 'inactive') {
      rec.ondataavailable = null
      rec.onstop = null
      try {
        rec.stop()
      } catch {
        /* already stopping */
      }
    }
  }, [])

  /** Clear the run buffer and start a fresh recording (Tasks 2 sequence start). */
  const restartRolling = useCallback(
    async (live: MediaStream | null): Promise<boolean> => {
      restartingRef.current = true
      const rec = rollingRecorderRef.current
      rollingRecorderRef.current = null
      flushWaiterRef.current = null
      rollingChunksRef.current = []
      lastBlobRef.current = null
      rollingStartRef.current = performance.now()
      rollingGenRef.current += 1
      if (rec && rec.state !== 'inactive') {
        rec.ondataavailable = null
        rec.onstop = null
        rec.onstart = null
        try {
          rec.stop()
        } catch {
          /* already stopping */
        }
        await new Promise<void>((r) => window.setTimeout(r, 220))
      }
      try {
        if (!live) return false
        return await startRolling(live)
      } finally {
        restartingRef.current = false
      }
    },
    [startRolling],
  )

  const flushRollingBlob = useCallback((): Promise<Blob | null> => {
    const rec = rollingRecorderRef.current
    if (!rec || rec.state === 'inactive') {
      return Promise.resolve(blobFromParts())
    }
    return new Promise((resolve) => {
      let settled = false
      const done = (blob: Blob | null) => {
        if (settled) return
        settled = true
        flushWaiterRef.current = null
        resolve(blob && blob.size > 500 ? blob : blobFromParts())
      }
      flushWaiterRef.current = done
      // iPad Safari often needs requestData, a short pause, then stop
      // before onstop writes a playable file.
      try {
        rec.requestData()
      } catch {
        /* stop still flushes */
      }
      window.setTimeout(() => {
        try {
          rec.requestData()
        } catch {
          /* ignore */
        }
        try {
          rec.stop()
        } catch {
          done(blobFromParts())
          return
        }
        rollingRecorderRef.current = null
      }, 160)
      window.setTimeout(() => done(blobFromParts()), 2800)
    })
  }, [blobFromParts])

  const stopDelay = useCallback(() => {
    window.clearInterval(delayTimerRef.current)
    setBuffering(false)
    delaySourceBufferRef.current = null
    const ms = delayMediaSourceRef.current
    if (ms && ms.readyState === 'open') {
      try {
        ms.endOfStream()
      } catch {
        /* already closed */
      }
    }
    delayMediaSourceRef.current = null
    delayQueueRef.current = []
    if (delayUrlRef.current) {
      URL.revokeObjectURL(delayUrlRef.current)
      delayUrlRef.current = null
    }
    const v = delayVideoRef.current
    if (v) {
      v.pause()
      v.removeAttribute('src')
      v.load()
    }
  }, [])

  const startDelay = useCallback(() => {
    const video = delayVideoRef.current
    const pipeline = getDelayCameraPipeline(rollingMimeRef.current)
    if (!video || !pipeline) {
      setError(
        'Delay cam needs a browser that can record and play the same video codec (Safari on iPhone, Chrome or Firefox on Android, or Chrome / Edge / Firefox on a computer).',
      )
      return
    }
    setError(null)
    setBuffering(true)
    prepareDelayVideo(video)
    const ms = new pipeline.Source()
    delayMediaSourceRef.current = ms
    const url = URL.createObjectURL(ms)
    delayUrlRef.current = url
    video.src = url
    rollingMimeRef.current = pipeline.mime
    ms.addEventListener('sourceopen', () => {
      if (delayMediaSourceRef.current !== ms) return
      const sb = ms.addSourceBuffer(pipeline.mime)
      delaySourceBufferRef.current = sb
      sb.addEventListener('updateend', pumpDelayQueue)
      void Promise.all(rollingChunksRef.current.map((b) => b.arrayBuffer())).then((bufs) => {
        if (delayMediaSourceRef.current !== ms) return
        for (const buf of bufs) delayQueueRef.current.push(buf)
        pumpDelayQueue()
      })
    })
    delayTimerRef.current = window.setInterval(() => {
      const sb = delaySourceBufferRef.current
      const v = delayVideoRef.current
      if (!sb || !v || sb.buffered.length === 0) return
      const start = sb.buffered.start(0)
      const end = sb.buffered.end(sb.buffered.length - 1)
      const target = end - delaySecRef.current
      if (target <= start) {
        v.pause()
        setBuffering(true)
        return
      }
      setBuffering(false)
      if (v.paused || Math.abs(v.currentTime - target) > 0.75) {
        v.currentTime = target
        void v.play().catch(() => {})
      }
      if (!sb.updating && start < end - (DELAY_MAX + TRIM_MARGIN)) {
        try {
          sb.remove(start, Math.max(start, end - DELAY_MAX - 2))
        } catch {
          /* trim race */
        }
      }
    }, 400)
  }, [pumpDelayQueue])

  // Start rolling when the camera comes on. Do NOT stop/restart when the
  // overlay canvas stream replaces the raw camera — that used to wipe the
  // buffer mid-sequence and the replay began in passé.
  useEffect(() => {
    if (restartingRef.current) return
    if (!enabled || !stream) {
      stopDelay()
      stopRolling()
      return
    }
    void startRolling(stream)
  }, [enabled, stream, startRolling, stopDelay, stopRolling])

  useEffect(
    () => () => {
      stopDelay()
      stopRolling()
    },
    [stopDelay, stopRolling],
  )

  const capturedSec = () => (performance.now() - rollingStartRef.current) / 1000
  const hasRollingData = () =>
    rollingChunksRef.current.some((part) => part.size > 200) ||
    Boolean(lastBlobRef.current && lastBlobRef.current.size > 500)
  const peekRollingBlob = () => blobFromParts()

  return {
    delayVideoRef,
    buffering,
    error,
    setError,
    startDelay,
    stopDelay,
    flushRollingBlob,
    peekRollingBlob,
    startRolling,
    restartRolling,
    capturedSec,
    hasRollingData,
  }
}
