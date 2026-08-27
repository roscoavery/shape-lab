/**
 * Rolling recorder + delay-cam playhead (same engine as Compare).
 * Plays the live stream N seconds behind, and can flush a replay blob.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export const DELAY_MIN = 6
export const DELAY_MAX = 20
const TRIM_MARGIN = 8

const MIME_CANDIDATES = [
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9',
  'video/webm',
  'video/mp4',
]

function pickDelayMime(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaSource === 'undefined') return null
  return (
    MIME_CANDIDATES.find(
      (t) => MediaRecorder.isTypeSupported(t) && MediaSource.isTypeSupported(t),
    ) ?? null
  )
}

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
  const flushWaiterRef = useRef<((blob: Blob | null) => void) | null>(null)

  const [buffering, setBuffering] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    (live: MediaStream) => {
      const mime = pickDelayMime()
      if (!mime) return
      const existing = rollingRecorderRef.current
      if (existing && existing.state !== 'inactive') return
      rollingMimeRef.current = mime
      rollingChunksRef.current = []
      rollingStartRef.current = performance.now()
      rollingGenRef.current += 1
      const gen = rollingGenRef.current
      const rec = new MediaRecorder(live, { mimeType: mime })
      rollingRecorderRef.current = rec
      rec.ondataavailable = (e) => {
        if (gen !== rollingGenRef.current) return
        if (!e.data || e.data.size === 0) return
        rollingChunksRef.current.push(e.data)
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
        const blob =
          parts.length > 0
            ? new Blob(parts, { type: rec.mimeType || rollingMimeRef.current })
            : null
        if (waiter) waiter(blob && blob.size > 500 ? blob : null)
      }
      try {
        rec.start(200)
      } catch (err) {
        rollingRecorderRef.current = null
        setError(err instanceof Error ? err.message : 'Could not start delay-cam recording')
      }
    },
    [pumpDelayQueue],
  )

  const stopRolling = useCallback(() => {
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
    (live: MediaStream | null) => {
      const rec = rollingRecorderRef.current
      rollingRecorderRef.current = null
      flushWaiterRef.current = null
      rollingChunksRef.current = []
      rollingStartRef.current = performance.now()
      rollingGenRef.current += 1
      if (rec && rec.state !== 'inactive') {
        rec.ondataavailable = null
        rec.onstop = null
        try {
          rec.stop()
        } catch {
          /* already stopping */
        }
      }
      if (live) startRolling(live)
    },
    [startRolling],
  )

  const flushRollingBlob = useCallback((): Promise<Blob | null> => {
    const rec = rollingRecorderRef.current
    if (!rec || rec.state === 'inactive') {
      const parts = rollingChunksRef.current
      if (parts.length === 0) return Promise.resolve(null)
      return Promise.resolve(new Blob(parts, { type: rollingMimeRef.current || 'video/webm' }))
    }
    return new Promise((resolve) => {
      let settled = false
      const done = (blob: Blob | null) => {
        if (settled) return
        settled = true
        flushWaiterRef.current = null
        resolve(blob)
      }
      flushWaiterRef.current = done
      window.setTimeout(() => {
        const parts = rollingChunksRef.current
        done(
          parts.length > 0
            ? new Blob(parts, { type: rollingMimeRef.current || 'video/webm' })
            : null,
        )
      }, 1800)
      try {
        rec.requestData()
      } catch {
        /* stop still flushes */
      }
      rec.stop()
      rollingRecorderRef.current = null
    })
  }, [])

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
    const mime = rollingMimeRef.current || pickDelayMime()
    if (!video || !mime || typeof MediaSource === 'undefined' || !MediaSource.isTypeSupported(mime)) {
      setError(
        'Delay cam needs Chrome, Edge, or Firefox (MediaRecorder + MediaSource).',
      )
      return
    }
    setError(null)
    setBuffering(true)
    const ms = new MediaSource()
    delayMediaSourceRef.current = ms
    const url = URL.createObjectURL(ms)
    delayUrlRef.current = url
    video.src = url
    ms.addEventListener('sourceopen', () => {
      if (delayMediaSourceRef.current !== ms) return
      const sb = ms.addSourceBuffer(mime)
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

  useEffect(() => {
    if (!enabled || !stream) {
      stopDelay()
      stopRolling()
      return
    }
    startRolling(stream)
    return () => {
      stopDelay()
      stopRolling()
    }
  }, [enabled, stream, startRolling, stopDelay, stopRolling])

  const capturedSec = () => (performance.now() - rollingStartRef.current) / 1000

  return {
    delayVideoRef,
    buffering,
    error,
    setError,
    startDelay,
    stopDelay,
    flushRollingBlob,
    startRolling,
    restartRolling,
    capturedSec,
  }
}
