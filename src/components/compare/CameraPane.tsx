/**
 * Compare tab — athlete camera pane.
 *
 * Modes:
 *  - Live: plain camera view (getUserMedia, no pose detection).
 *  - Delay: watch yourself N seconds behind live (buffer 6–20s).
 *  - Replay: pause / play / scrub the last N seconds of that buffer, then
 *    save to this device and/or keep it in the app.
 *  - Replay: pick a recorded attempt, scrub frame-by-frame with speed control.
 *
 * Recording uses a second MediaRecorder on the same stream; clips are saved
 * to IndexedDB with a storage cap (oldest pruned).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  addClip,
  deleteClip,
  getBlob,
  getClips,
  MAX_CLIPS,
  type RecordedClip,
} from '../../lib/clipStore'
import { createId } from '../../lib/storage'
import { extForVideoType, saveResultMessage, saveVideoToDevice } from '../../lib/saveMedia'
import { VideoWorkbench } from './VideoWorkbench'
import { CompareSplitBar } from './CompareSplitBar'
import { useCompareLayout } from './compareLayout'
import { DraggableStillOverlay } from '../DraggableStillOverlay'

type Mode = 'live' | 'delay' | 'replay'

const DELAY_MIN = 6
const DELAY_MAX = 20
/** Extra seconds of MSE buffer kept behind the playhead before trimming. */
const TRIM_MARGIN = 8

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9',
  'video/webm',
]

function pickRecorderMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null
}

function pickDelayMime(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaSource === 'undefined') return null
  return (
    MIME_CANDIDATES.find(
      (t) => MediaRecorder.isTypeSupported(t) && MediaSource.isTypeSupported(t),
    ) ?? null
  )
}

export function CameraPane() {
  const liveVideoRef = useRef<HTMLVideoElement | null>(null)
  const delayVideoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Delay engine refs
  const delaySourceBufferRef = useRef<SourceBuffer | null>(null)
  const delayMediaSourceRef = useRef<MediaSource | null>(null)
  const delayQueueRef = useRef<ArrayBuffer[]>([])
  const delayTimerRef = useRef<number>(0)
  const delayUrlRef = useRef<string | null>(null)
  const delaySecRef = useRef(6)
  const delayFollowRef = useRef(true)
  const { fullscreen, camRail } = useCompareLayout()

  // One MediaRecorder while the camera is on. Its complete file (header +
  // clusters) is what Replay plays. Slicing timeslices by time drops the
  // WebM header and will not play — we never do that.
  const rollingRecorderRef = useRef<MediaRecorder | null>(null)
  const rollingChunksRef = useRef<Blob[]>([])
  const rollingStartRef = useRef(0)
  const rollingMimeRef = useRef('video/webm')
  const rollingGenRef = useRef(0)
  const replayBlobRef = useRef<Blob | null>(null)
  const flushWaiterRef = useRef<((blob: Blob | null) => void) | null>(null)

  // Attempt recorder refs
  const attemptRecorderRef = useRef<MediaRecorder | null>(null)
  const attemptChunksRef = useRef<Blob[]>([])
  const attemptStartRef = useRef(0)
  const recTimerRef = useRef<number>(0)

  const clipUrlRef = useRef<string | null>(null)

  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('live')
  const [mirror, setMirror] = useState(true)
  const [delaySec, setDelaySec] = useState(6)
  const [delayBuffering, setDelayBuffering] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const [clips, setClips] = useState<RecordedClip[]>([])
  const [activeClipId, setActiveClipId] = useState<string | null>(null)
  const [clipSrc, setClipSrc] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [replayBuilding, setReplayBuilding] = useState(false)
  const [replayTailSec, setReplayTailSec] = useState<number | null>(null)
  const [delayTime, setDelayTime] = useState(0)
  const [delayDuration, setDelayDuration] = useState(0)

  const prevFullscreenRef = useRef(false)
  useEffect(() => {
    if (fullscreen && !prevFullscreenRef.current && running) setMode('delay')
    prevFullscreenRef.current = fullscreen
  }, [fullscreen, running])

  useEffect(() => {
    if (mode !== 'delay') return
    let raf = 0
    const tick = () => {
      const v = delayVideoRef.current
      if (v) {
        setDelayTime(v.currentTime)
        if (Number.isFinite(v.duration) && v.duration > 0) setDelayDuration(v.duration)
        else if (v.buffered.length > 0) setDelayDuration(v.buffered.end(v.buffered.length - 1))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode])

  const pumpDelayQueue = useCallback(() => {
    const sb = delaySourceBufferRef.current
    if (!sb || sb.updating) return
    const next = delayQueueRef.current.shift()
    if (next) {
      try {
        sb.appendBuffer(next)
      } catch {
        // QuotaExceeded or detached buffer — drop the chunk; trim will recover
      }
    }
  }, [])

  const startRolling = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    const mime = pickDelayMime() ?? pickRecorderMime()
    if (!mime) return
    const existing = rollingRecorderRef.current
    if (existing && existing.state !== 'inactive') return
    rollingMimeRef.current = mime
    rollingChunksRef.current = []
    rollingStartRef.current = performance.now()
    rollingGenRef.current += 1
    const gen = rollingGenRef.current
    const rec = new MediaRecorder(stream, { mimeType: mime })
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
    rec.start(200)
  }, [pumpDelayQueue])

  const stopRolling = useCallback(() => {
    flushWaiterRef.current = null
    const rec = rollingRecorderRef.current
    rollingRecorderRef.current = null
    if (rec && rec.state !== 'inactive') {
      rec.onstop = null
      rec.stop()
    }
  }, [])

  const flushRollingBlob = useCallback((): Promise<Blob | null> => {
    const rec = rollingRecorderRef.current
    if (!rec || rec.state === 'inactive') {
      const parts = rollingChunksRef.current
      if (parts.length === 0) return Promise.resolve(null)
      return Promise.resolve(
        new Blob(parts, { type: rollingMimeRef.current || 'video/webm' }),
      )
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
        // stop() still flushes
      }
      rec.stop()
      rollingRecorderRef.current = null
    })
  }, [])

  useEffect(() => {
    void getClips().then(setClips).catch(() => {})
  }, [])

  // -------------------------------------------------------------------------
  // Delay cam engine (plays the shared recorder N seconds behind live)
  // -------------------------------------------------------------------------

  const stopDelay = useCallback(() => {
    window.clearInterval(delayTimerRef.current)
    setDelayBuffering(false)
    delaySourceBufferRef.current = null
    const ms = delayMediaSourceRef.current
    if (ms && ms.readyState === 'open') {
      try {
        ms.endOfStream()
      } catch {
        // already closed
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
    if (!video) return
    const mime = rollingMimeRef.current || pickDelayMime()
    if (!mime || typeof MediaSource === 'undefined' || !MediaSource.isTypeSupported(mime)) {
      setError(
        'Delay cam is not supported in this browser (needs MediaRecorder + MediaSource with a shared codec — use Chrome, Edge, or Firefox).',
      )
      return
    }
    setError(null)
    setDelayBuffering(true)

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
      // Replay already-captured clusters so delay can start as soon as we have N seconds.
      void Promise.all(rollingChunksRef.current.map((b) => b.arrayBuffer())).then((bufs) => {
        if (delayMediaSourceRef.current !== ms) return
        for (const buf of bufs) delayQueueRef.current.push(buf)
        pumpDelayQueue()
      })
    })

    // Keep the delayed playhead (buffered end − delay) and trim old data
    delayTimerRef.current = window.setInterval(() => {
      const sb = delaySourceBufferRef.current
      const v = delayVideoRef.current
      if (!sb || !v || sb.buffered.length === 0) return
      const start = sb.buffered.start(0)
      const end = sb.buffered.end(sb.buffered.length - 1)
      const target = end - delaySecRef.current

      if (target <= start) {
        // Not enough footage buffered yet for the requested delay
        v.pause()
        setDelayBuffering(true)
        return
      }
      setDelayBuffering(false)
      if (delayFollowRef.current && (v.paused || Math.abs(v.currentTime - target) > 0.75)) {
        v.currentTime = target
        void v.play().catch(() => {})
      }
      if (!sb.updating && start < end - (DELAY_MAX + TRIM_MARGIN)) {
        try {
          sb.remove(start, Math.max(start, end - DELAY_MAX - 2))
        } catch {
          // ignore trim races
        }
      }
    }, 400)
  }, [pumpDelayQueue])

  // Run the delay engine only while in delay mode with a live camera
  useEffect(() => {
    if (mode === 'delay' && running) {
      startDelay()
      return stopDelay
    }
    return undefined
  }, [mode, running, startDelay, stopDelay])

  // -------------------------------------------------------------------------
  // Camera start/stop
  // -------------------------------------------------------------------------

  const startCamera = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      const video = liveVideoRef.current
      if (!video) throw new Error('Video element missing')
      video.srcObject = stream
      await video.play()
      setRunning(true)
      startRolling()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not access camera. Allow camera permission and use HTTPS or localhost.',
      )
      setRunning(false)
    }
  }

  const stopRecording = useCallback(() => {
    const rec = attemptRecorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
    window.clearInterval(recTimerRef.current)
    setRecording(false)
  }, [])

  const stopCamera = useCallback(() => {
    stopRecording()
    stopDelay()
    stopRolling()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null
    setRunning(false)
    setMode((m) => (m === 'replay' ? m : 'live'))
  }, [stopDelay, stopRecording, stopRolling])

  useEffect(
    () => () => {
      stopCamera()
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // -------------------------------------------------------------------------
  // Attempt recording + replay
  // -------------------------------------------------------------------------

  const startRecording = () => {
    const stream = streamRef.current
    if (!stream) return
    const mime = pickRecorderMime()
    if (!mime) {
      setError('Recording is not supported in this browser (MediaRecorder missing).')
      return
    }
    attemptChunksRef.current = []
    const rec = new MediaRecorder(stream, { mimeType: mime })
    attemptRecorderRef.current = rec
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) attemptChunksRef.current.push(e.data)
    }
    rec.onstop = () => {
      const blob = new Blob(attemptChunksRef.current, { type: rec.mimeType })
      attemptChunksRef.current = []
      if (blob.size === 0) return
      const durationSec = (performance.now() - attemptStartRef.current) / 1000
      const meta: RecordedClip = {
        id: createId('clip'),
        name: `Attempt ${new Date().toLocaleTimeString()}`,
        createdAt: new Date().toISOString(),
        durationSec: Number(durationSec.toFixed(1)),
        sizeBytes: blob.size,
      }
      void addClip(meta, blob)
        .then(getClips)
        .then((list) => {
          setClips(list)
          setFlash(`Saved ${meta.name} (${meta.durationSec}s)`)
          setTimeout(() => setFlash(null), 2500)
        })
        .catch(() => setError('Could not save the clip — device storage may be full.'))
    }
    attemptStartRef.current = performance.now()
    rec.start()
    setRecSeconds(0)
    setRecording(true)
    recTimerRef.current = window.setInterval(() => {
      setRecSeconds(Math.floor((performance.now() - attemptStartRef.current) / 1000))
    }, 500)
  }

  const openClip = async (clip: RecordedClip) => {
    const blob = await getBlob(clip.id)
    if (!blob) {
      setError('Clip data not found.')
      return
    }
    replayBlobRef.current = blob
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
    const url = URL.createObjectURL(blob)
    clipUrlRef.current = url
    setClipSrc(url)
    setActiveClipId(clip.id)
    setReplayTailSec(null)
    setMode('replay')
  }

  const openBufferReplay = async () => {
    if (!running) {
      setMode('replay')
      return
    }
    if (replayBuilding) return
    setError(null)
    setReplayBuilding(true)
    const capturedFor = (performance.now() - rollingStartRef.current) / 1000
    try {
      const blob = await flushRollingBlob()
      if (streamRef.current) startRolling()
      if (!blob || blob.size < 1500 || capturedFor < 1.2) {
        setError(
          `Keep the camera on for a couple of seconds, then tap Replay last ${delaySec}s. That opens a player of what just happened.`,
        )
        return
      }
      replayBlobRef.current = blob
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
      const url = URL.createObjectURL(blob)
      clipUrlRef.current = url
      setClipSrc(url)
      setActiveClipId(null)
      setReplayTailSec(Math.min(delaySec, capturedFor))
      setMode('replay')
      const shown = Math.max(1, Math.round(Math.min(delaySec, capturedFor)))
      setFlash(`Last ${shown}s of buffer — pause, scrub, or save`)
      window.setTimeout(() => setFlash(null), 2500)
    } finally {
      setReplayBuilding(false)
    }
  }

  const saveReplayToApp = () => {
    const blob = replayBlobRef.current
    if (!blob) {
      setError('Nothing to save — open a replay first.')
      return
    }
    const meta: RecordedClip = {
      id: createId('clip'),
      name: `Buffer ${delaySec}s · ${new Date().toLocaleTimeString()}`,
      createdAt: new Date().toISOString(),
      durationSec: delaySec,
      sizeBytes: blob.size,
    }
    void addClip(meta, blob)
      .then(getClips)
      .then((list) => {
        setClips(list)
        setActiveClipId(meta.id)
        setFlash(`Saved in the app: ${meta.name}`)
        setTimeout(() => setFlash(null), 2500)
      })
      .catch(() => setError('Could not save the clip — device storage may be full.'))
  }

  const downloadReplay = () => {
    const blob = replayBlobRef.current
    if (!blob) {
      setError('Nothing to download — open a replay first.')
      return
    }
    const ext = extForVideoType(blob.type)
    void saveVideoToDevice(blob, `shape-lab-replay-${delaySec}s.${ext}`).then((result) => {
      if (result === 'failed') setError('Could not save that clip to this device.')
      else {
        setFlash(saveResultMessage(result))
        setTimeout(() => setFlash(null), 4000)
      }
    })
  }

  const removeClip = async (id: string) => {
    await deleteClip(id)
    setClips((prev) => prev.filter((c) => c.id !== id))
    if (activeClipId === id) {
      setActiveClipId(null)
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
      clipUrlRef.current = null
      setClipSrc(null)
    }
  }

  // -------------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------------

  const rail = Boolean(fullscreen && camRail)
  const btnCls = rail
    ? 'rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/16'
    : 'rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm hover:bg-[#243040]'
  const mirrorCls = mirror ? 'scale-x-[-1]' : ''

  const cameraChrome = (
    <div className={rail ? 'flex flex-col gap-1.5' : 'flex flex-wrap items-center gap-2'}>
      {!running ? (
        <button
          type="button"
          onClick={() => void startCamera()}
          className={
            rail
              ? 'rounded-lg bg-white px-2 py-1.5 text-[11px] font-semibold text-black'
              : 'rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[#06281f]'
          }
        >
          Start camera
        </button>
      ) : (
        <button type="button" onClick={stopCamera} className={btnCls}>
          Stop camera
        </button>
      )}
      <div className={`flex gap-1 ${rail ? 'rounded-lg bg-black/30 p-0.5' : 'rounded-lg border border-[var(--panel-border)] p-0.5'}`}>
        {(
          [
            ['live', 'Live'],
            ['delay', 'Delay cam'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            disabled={!running}
            className={`rounded-md px-2 py-1 text-[11px] disabled:opacity-40 ${
              mode === id
                ? rail
                  ? 'bg-white font-semibold text-black'
                  : 'bg-[var(--accent-dim)] font-semibold text-white'
                : rail
                  ? 'text-white/70'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!running || replayBuilding}
        onClick={() => void openBufferReplay()}
        className={
          rail
            ? 'rounded-lg bg-white/15 px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40'
            : 'rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f] disabled:opacity-40'
        }
      >
        {replayBuilding ? 'Opening replay…' : `Replay last ${delaySec}s`}
      </button>
      <label className={`flex items-center gap-1.5 ${rail ? 'text-[11px] text-white/75' : 'text-sm text-[var(--muted)]'}`}>
        <input
          type="checkbox"
          checked={mirror}
          onChange={(e) => setMirror(e.target.checked)}
        />
        Mirror
      </label>
      {running && (
        <label className={`flex items-center gap-2 ${rail ? 'text-[11px] text-white/75' : 'text-sm text-[var(--muted)]'}`}>
          Delay
          <input
            type="range"
            min={DELAY_MIN}
            max={DELAY_MAX}
            step={1}
            value={delaySec}
            onChange={(e) => setDelaySec(Number(e.target.value))}
            className="min-w-0 flex-1 accent-[var(--accent)]"
          />
          <span className="tabular-nums">{delaySec}s</span>
        </label>
      )}
      {mode === 'delay' && running && (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={Math.max(0.1, delayDuration)}
            step={0.05}
            value={Math.min(delayTime, delayDuration || delayTime)}
            onChange={(e) => {
              const t = Number(e.target.value)
              delayFollowRef.current = false
              const v = delayVideoRef.current
              if (v) {
                v.pause()
                v.currentTime = t
              }
              setDelayTime(t)
            }}
            className="min-w-0 flex-1"
            aria-label="Scrub delay cam"
          />
          <button
            type="button"
            onClick={() => {
              delayFollowRef.current = true
            }}
            className={btnCls}
          >
            Live delay
          </button>
        </div>
      )}
    </div>
  )

  return (
    <section
      className={
        fullscreen
          ? 'flex h-full min-h-0 flex-col overflow-hidden bg-black'
          : 'relative flex min-h-0 flex-col gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4'
      }
    >
      {!fullscreen && (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Athlete camera</h2>
          <span className="text-xs text-[var(--muted)]">live · delay cam · replay</span>
        </div>
        <CompareSplitBar where="camera" />
      </div>
      )}

      {!fullscreen && cameraChrome}
      {rail && camRail ? createPortal(cameraChrome, camRail) : null}

      {/* Video area — live video stays mounted (even during replay) so the stream keeps running */}
      <div
        className={
          mode === 'replay' && clipSrc
            ? 'pointer-events-none absolute h-px w-px overflow-hidden opacity-0'
            : `relative overflow-hidden rounded-lg border border-[var(--panel-border)] bg-black ${fullscreen ? 'min-h-0 flex-1' : ''}`
        }
      >
        <video
          ref={liveVideoRef}
          muted
          playsInline
          className={`${fullscreen ? 'h-full max-h-none' : 'max-h-[420px]'} w-full object-contain ${mirrorCls} ${
            mode === 'delay' ? 'hidden' : ''
          }`}
        />
        <video
          ref={delayVideoRef}
          muted
          playsInline
          className={`${fullscreen ? 'h-full max-h-none' : 'max-h-[420px]'} w-full object-contain ${mirrorCls} ${
            mode === 'delay' ? '' : 'hidden'
          }`}
        />
        {!running && mode !== 'replay' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--muted)]">
            Camera off — press Start camera
          </div>
        )}
        {mode === 'delay' && running && delayBuffering && (
          <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-[var(--warn)]">
            Buffering… delayed view starts in ~{delaySec}s
          </div>
        )}
        {mode === 'delay' && running && !delayBuffering && (
          <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-[var(--accent)]">
            {delaySec}s behind live
          </div>
        )}
        {recording && (
          <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded bg-black/70 px-2 py-1 text-xs text-[var(--bad)]">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--bad)]" />
            REC {recSeconds}s
          </div>
        )}
        {mode !== 'replay' && <DraggableStillOverlay />}
      </div>

      {/* Replay of the last N seconds (or a saved attempt) */}
      {mode === 'replay' &&
        (clipSrc ? (
          <div className={`flex flex-col gap-2 ${fullscreen ? 'min-h-0 flex-1' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--text)]">
                {replayTailSec
                  ? `Last ${Math.round(replayTailSec)}s — this is the buffer you just recorded`
                  : 'Saved attempt'}
              </p>
              <button
                type="button"
                onClick={() => setMode(running ? 'live' : 'replay')}
                className={btnCls}
              >
                Back to live
              </button>
            </div>
            <VideoWorkbench
              src={clipSrc}
              mirror={mirror}
              autoPlay
              tailSeconds={replayTailSec ?? undefined}
              fill={fullscreen}
              showStillOverlay
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveReplayToApp}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f]"
              >
                Save in app
              </button>
              <button type="button" onClick={downloadReplay} className={btnCls}>
                Save to Photos / Files
              </button>
              <span className="text-xs text-[var(--muted)]">
                Pause, play, and scrub. Saving keeps it in Recorded attempts below.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--panel-border)] text-sm text-[var(--muted)]">
            {clips.length
              ? 'Pick a saved clip below, or start the camera and tap Replay last Ns'
              : 'Start the camera, wait a couple of seconds, then tap Replay last Ns'}
          </div>
        ))}

      {/* Record controls */}
      {!fullscreen && (
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={!running}
            className="rounded-lg border border-[var(--bad)]/60 px-3 py-1.5 text-sm font-semibold text-[var(--bad)] hover:bg-[#2a1518] disabled:opacity-40"
          >
            ● Record attempt
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-lg bg-[var(--bad)] px-3 py-1.5 text-sm font-semibold text-[#2a1518]"
          >
            ■ Stop &amp; save
          </button>
        )}
        <span className="text-xs text-[var(--muted)]">
          Replay last {delaySec}s of buffer (6–20s) · last {MAX_CLIPS} saved clips kept
          in the app
        </span>
      </div>
      )}

      {flash && (
        <p className="rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          {flash}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      )}

      {/* Clip list */}
      {!fullscreen && clips.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-[var(--muted)]">Recorded attempts</h3>
          <ul className="flex max-h-36 flex-col gap-1 overflow-y-auto panel-scroll">
            {clips.map((clip) => (
              <li key={clip.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void openClip(clip)}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                    activeClipId === clip.id
                      ? 'bg-[var(--accent-dim)]/30 text-[var(--text)]'
                      : 'text-[var(--muted)] hover:bg-[#243040] hover:text-[var(--text)]'
                  }`}
                >
                  <span className="truncate">{clip.name}</span>
                  <span className="ml-auto shrink-0 text-xs">
                    {clip.durationSec != null ? `${clip.durationSec}s · ` : ''}
                    {(clip.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void removeClip(clip.id)}
                  className="rounded px-1.5 text-xs text-[var(--muted)] hover:text-[var(--bad)]"
                  title="Delete clip"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
