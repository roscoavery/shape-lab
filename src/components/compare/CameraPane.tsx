/**
 * Compare tab — athlete camera pane.
 *
 * Modes:
 *  - Live: plain camera view (getUserMedia, no pose detection).
 *  - Delay: watch yourself N seconds behind live. Implemented with
 *    MediaRecorder timeslice chunks appended to a MediaSource buffer;
 *    the delayed <video> plays at (buffered end − delay). Old buffer is
 *    trimmed so memory stays flat. Athlete performs, then watches the
 *    replay hands-free.
 *  - Replay: pick a recorded attempt, scrub frame-by-frame with speed control.
 *
 * Recording uses a second MediaRecorder on the same stream; clips are saved
 * to IndexedDB with a storage cap (oldest pruned).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addClip,
  deleteClip,
  getBlob,
  getClips,
  MAX_CLIPS,
  type RecordedClip,
} from '../../lib/clipStore'
import { createId } from '../../lib/storage'
import { VideoWorkbench } from './VideoWorkbench'

type Mode = 'live' | 'delay' | 'replay'

const DELAY_MIN = 2
const DELAY_MAX = 10
/** Extra seconds of buffer kept behind the playhead before trimming. */
const TRIM_MARGIN = 15

const MIME_CANDIDATES = [
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9',
  'video/webm',
  'video/mp4',
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
  const delayRecorderRef = useRef<MediaRecorder | null>(null)
  const delaySourceBufferRef = useRef<SourceBuffer | null>(null)
  const delayMediaSourceRef = useRef<MediaSource | null>(null)
  const delayQueueRef = useRef<ArrayBuffer[]>([])
  const delayTimerRef = useRef<number>(0)
  const delayUrlRef = useRef<string | null>(null)
  const delaySecRef = useRef(4)

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
  const [delaySec, setDelaySec] = useState(4)
  const [delayBuffering, setDelayBuffering] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const [clips, setClips] = useState<RecordedClip[]>([])
  const [activeClipId, setActiveClipId] = useState<string | null>(null)
  const [clipSrc, setClipSrc] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    delaySecRef.current = delaySec
  }, [delaySec])

  useEffect(() => {
    void getClips().then(setClips).catch(() => {})
  }, [])

  // -------------------------------------------------------------------------
  // Delay cam engine
  // -------------------------------------------------------------------------

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

  const stopDelay = useCallback(() => {
    window.clearInterval(delayTimerRef.current)
    setDelayBuffering(false)
    const rec = delayRecorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
    delayRecorderRef.current = null
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
    const stream = streamRef.current
    const video = delayVideoRef.current
    if (!stream || !video) return
    const mime = pickDelayMime()
    if (!mime) {
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

      const rec = new MediaRecorder(stream, { mimeType: mime })
      delayRecorderRef.current = rec
      rec.ondataavailable = (e) => {
        if (e.data.size === 0) return
        void e.data.arrayBuffer().then((buf) => {
          delayQueueRef.current.push(buf)
          pumpDelayQueue()
        })
      }
      rec.start(250)
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
      if (v.paused || Math.abs(v.currentTime - target) > 0.75) {
        v.currentTime = target
        void v.play().catch(() => {})
      }
      if (!sb.updating && start < end - (DELAY_MAX + TRIM_MARGIN)) {
        try {
          sb.remove(start, end - (DELAY_MAX + 5))
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
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null
    setRunning(false)
    setMode((m) => (m === 'replay' ? m : 'live'))
  }, [stopDelay, stopRecording])

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
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
    const url = URL.createObjectURL(blob)
    clipUrlRef.current = url
    setClipSrc(url)
    setActiveClipId(clip.id)
    setMode('replay')
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

  const btnCls =
    'rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm hover:bg-[#243040]'
  const mirrorCls = mirror ? 'scale-x-[-1]' : ''

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Athlete camera</h2>
        <span className="text-xs text-[var(--muted)]">live · delay cam · replay</span>
      </div>

      {/* Top controls */}
      <div className="flex flex-wrap items-center gap-2">
        {!running ? (
          <button
            type="button"
            onClick={() => void startCamera()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[#06281f]"
          >
            Start camera
          </button>
        ) : (
          <button type="button" onClick={stopCamera} className={btnCls}>
            Stop camera
          </button>
        )}
        <div className="flex gap-1 rounded-lg border border-[var(--panel-border)] p-0.5">
          {(
            [
              ['live', 'Live'],
              ['delay', 'Delay cam'],
              ['replay', 'Replay'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              disabled={id !== 'replay' && !running}
              className={`rounded-md px-2.5 py-1 text-sm disabled:opacity-40 ${
                mode === id
                  ? 'bg-[var(--accent-dim)] font-semibold text-white'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            checked={mirror}
            onChange={(e) => setMirror(e.target.checked)}
          />
          Mirror
        </label>
      </div>

      {/* Delay slider */}
      {mode === 'delay' && (
        <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
          Delay
          <input
            type="range"
            min={DELAY_MIN}
            max={DELAY_MAX}
            step={1}
            value={delaySec}
            onChange={(e) => setDelaySec(Number(e.target.value))}
            className="flex-1 accent-[var(--accent)]"
          />
          <span className="w-8 tabular-nums text-[var(--text)]">{delaySec}s</span>
        </label>
      )}

      {/* Video area — live video element stays mounted so the stream survives mode switches */}
      <div className={mode === 'replay' ? 'hidden' : 'relative overflow-hidden rounded-lg border border-[var(--panel-border)] bg-black'}>
        <video
          ref={liveVideoRef}
          muted
          playsInline
          className={`max-h-[420px] w-full object-contain ${mirrorCls} ${
            mode === 'delay' ? 'hidden' : ''
          }`}
        />
        <video
          ref={delayVideoRef}
          muted
          playsInline
          className={`max-h-[420px] w-full object-contain ${mirrorCls} ${
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
      </div>

      {/* Replay area */}
      {mode === 'replay' &&
        (clipSrc ? (
          <VideoWorkbench src={clipSrc} mirror={mirror} />
        ) : (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--panel-border)] text-sm text-[var(--muted)]">
            {clips.length ? 'Pick a recorded attempt below' : 'Record an attempt first'}
          </div>
        ))}

      {/* Record controls */}
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
          Recording works in Live and Delay modes · last {MAX_CLIPS} clips kept
        </span>
      </div>

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
      {clips.length > 0 && (
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
