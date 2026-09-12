/**
 * Hold-challenge analysis player.
 * Recap plays in real time. Save writes a new clip at the chosen speed
 * with whichever overlays the athlete left on.
 */

import { useEffect, useRef, useState } from 'react'
import { formatSeconds, holdMediaWindow } from '../lib/handstandHold'
import {
  clampSaveSpeed,
  paintHoldOverlay,
  saveHoldClipWithOverlay,
  saveSpeedLabel,
} from '../lib/overlayExport'
import { mediaStretch, type PoseTrack } from '../lib/poseTrack'
import { saveResultMessage, type SaveVideoResult } from '../lib/saveMedia'
import { uploadAthleteVideo } from '../lib/athleteVideoStore'
import { HOLD_PINK_BTN } from '../lib/holdBuild'
import { saveJointDrawMode, type JointDrawMode } from '../lib/skeleton'

type Props = {
  src: string
  blob: Blob | null
  track: PoseTrack | null
  holdSeconds: number
  clockOffsetSec?: number
  recordedWallSec?: number
  playheadSec?: number
  mirror?: boolean
  filename: string
  /** Kept so older call sites still type-check. */
  clipId?: string | null
  compact?: boolean
  athleteId?: string | null
  /** Fill the parent (fullscreen hold review). */
  fill?: boolean
}

function layerChip(on: boolean): string {
  return on
    ? 'bg-[var(--accent)] font-semibold text-[#06281f]'
    : 'border border-[var(--panel-border)] text-[var(--muted)]'
}

export function HoldReplayPlayer({
  src,
  blob,
  track,
  holdSeconds,
  clockOffsetSec = 0,
  recordedWallSec,
  playheadSec,
  mirror = true,
  filename,
  clipId = null,
  compact = false,
  athleteId = null,
  fill = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [mode, setMode] = useState<JointDrawMode>('auto')
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [showAngles, setShowAngles] = useState(true)
  const [showScore, setShowScore] = useState(true)
  const [showClock, setShowClock] = useState(true)
  const [saveSpeed, setSaveSpeed] = useState(1)
  const [stretch, setStretch] = useState(1)
  const [videoReady, setVideoReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [viewStart, setViewStart] = useState(0)
  const [duration, setDuration] = useState(0)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    saveJointDrawMode(mode)
  }, [mode])

  useEffect(() => {
    setVideoReady(false)
  }, [src, blob])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!blob && !src) {
      video.removeAttribute('src')
      video.load()
      return
    }
    const url = blob ? URL.createObjectURL(blob) : src
    const owned = Boolean(blob)
    video.src = url
    const onError = () => {
      if (!blob) return
      const retry = URL.createObjectURL(blob)
      video.src = retry
      if (owned) URL.revokeObjectURL(url)
    }
    video.addEventListener('error', onError)
    return () => {
      video.removeEventListener('error', onError)
      video.removeAttribute('src')
      video.load()
      if (owned) URL.revokeObjectURL(url)
    }
  }, [blob, src])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    let raf = 0

    const windowFor = (mediaDur: number) => {
      const nextStretch = mediaStretch(mediaDur, track, clockOffsetSec, holdSeconds, recordedWallSec)
      return { view: holdMediaWindow(clockOffsetSec, holdSeconds, mediaDur, nextStretch), nextStretch }
    }

    const paint = () => {
      const w = video.videoWidth
      const h = video.videoHeight
      if (w > 8 && h > 8) {
        if (!videoReady) setVideoReady(true)
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const mediaDur = video.duration || holdSeconds
          const t = video.currentTime
          const { view } = windowFor(mediaDur)
          if (t >= view.end && !video.paused) {
            video.pause()
            video.currentTime = view.end
          }
          paintHoldOverlay(ctx, video, w, h, t, {
            track,
            mode,
            mirror,
            holdSeconds,
            clockOffsetSec,
            recordedWallSec,
            showSkeleton,
            showAngles,
            showScore,
            showClock,
          })
        }
      }
      setTime(video.currentTime)
      raf = requestAnimationFrame(paint)
    }

    const onMeta = () => {
      const mediaDur =
        Number.isFinite(video.duration) && video.duration > 0 && video.duration < 1e6
          ? video.duration
          : recordedWallSec && recordedWallSec > 0.8
            ? recordedWallSec
            : holdSeconds
      const { view, nextStretch } = windowFor(mediaDur)
      setStretch(nextStretch)
      video.playbackRate = nextStretch
      setViewStart(view.start)
      setDuration(Math.max(0.1, (view.end - view.start) / nextStretch))
      if (playheadSec != null && Number.isFinite(playheadSec)) {
        video.currentTime = Math.min(view.end, Math.max(view.start, playheadSec * nextStretch))
      } else if (video.currentTime < view.start || video.currentTime > view.end) {
        video.currentTime = view.start
      }
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    raf = requestAnimationFrame(paint)
    void video.play().catch(() => {})
    return () => {
      cancelAnimationFrame(raf)
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [
    src,
    blob,
    track,
    mode,
    mirror,
    holdSeconds,
    clockOffsetSec,
    recordedWallSec,
    playheadSec,
    showSkeleton,
    showAngles,
    showScore,
    showClock,
    videoReady,
  ])

  const save = async () => {
    if (!blob) {
      setFlash('Clip is still loading — wait a moment, then tap Save again.')
      window.setTimeout(() => setFlash(null), 4000)
      return
    }
    setSaving(true)
    setFlash('Writing the clip…')
    try {
      const result: SaveVideoResult = await saveHoldClipWithOverlay({
        source: blob,
        track,
        holdSeconds,
        clockOffsetSec,
        recordedWallSec,
        filename,
        mirror,
        mode,
        clipId,
        showSkeleton,
        showAngles,
        showScore,
        showClock,
        saveSpeed,
        onProgress: (p) => {
          setFlash(`Writing the clip… ${Math.round(p * 100)}%`)
        },
      })
      setFlash(saveResultMessage(result))
    } catch {
      setFlash('Could not save that hold clip.')
    } finally {
      setSaving(false)
      window.setTimeout(() => setFlash(null), 5000)
    }
  }

  const frameH = fill ? 'min-h-0 flex-1' : compact ? 'max-h-56' : 'max-h-[70vh]'
  const wallT = Math.min(duration, Math.max(0, (time - viewStart) / Math.max(stretch, 0.05)))

  return (
    <div className={fill ? 'flex h-full min-h-0 flex-col' : ''}>
      <div
        className={`overflow-hidden bg-black ${
          fill ? 'flex min-h-0 flex-1 flex-col rounded-none' : 'rounded-md'
        }`}
      >
        <video
          ref={videoRef}
          className={videoReady ? 'hidden' : `block w-full bg-black object-contain ${frameH}`}
          playsInline
          muted={compact}
          controls={!videoReady}
        />
        <canvas
          ref={canvasRef}
          className={`${videoReady ? 'block' : 'hidden'} w-full bg-black object-contain ${frameH}`}
        />
        <div className="flex items-center gap-2 bg-black/80 px-2 py-1.5">
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-white"
            onClick={() => {
              const v = videoRef.current
              if (!v) return
              if (v.paused) {
                if (v.currentTime >= viewStart + duration * stretch - 0.05) v.currentTime = viewStart
                void v.play()
              } else v.pause()
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(0.1, duration)}
            step={0.05}
            value={wallT}
            onChange={(e) => {
              const v = videoRef.current
              const next = viewStart + Number(e.target.value) * stretch
              if (v) v.currentTime = next
              setTime(next)
            }}
            className="min-w-0 flex-1"
            aria-label="Hold replay playhead"
          />
          <span className="tabular-nums text-[11px] text-white/80">
            {formatSeconds(wallT)} / {formatSeconds(duration || holdSeconds)}
          </span>
        </div>
      </div>

      <div className={`mt-2 space-y-2 ${fill ? 'px-1' : ''}`}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-[var(--text)]">Saved speed</p>
            <p className="text-[11px] font-bold tabular-nums text-[var(--text)]">{saveSpeedLabel(saveSpeed)}</p>
          </div>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.25}
            value={saveSpeed}
            onChange={(e) => setSaveSpeed(clampSaveSpeed(Number(e.target.value)))}
            className="mt-1 w-full"
            aria-label="Saved video speed"
          />
          <div className="flex justify-between text-[10px] text-[var(--muted)]">
            <span>Slower</span>
            <span>Regular</span>
            <span>Faster</span>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-[var(--text)]">On the saved clip</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowScore((on) => !on)}
              className={`rounded-full px-3 py-1 text-[12px] ${layerChip(showScore)}`}
            >
              Score {showScore ? 'on' : 'off'}
            </button>
            <button
              type="button"
              onClick={() => setShowSkeleton((on) => !on)}
              className={`rounded-full px-3 py-1 text-[12px] ${layerChip(showSkeleton)}`}
            >
              Line {showSkeleton ? 'on' : 'off'}
            </button>
            <button
              type="button"
              onClick={() => setShowClock((on) => !on)}
              className={`rounded-full px-3 py-1 text-[12px] ${layerChip(showClock)}`}
            >
              Stopwatch {showClock ? 'on' : 'off'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!blob || saving}
            onClick={() => void save()}
            className={`rounded-lg px-3 py-2 text-sm disabled:opacity-50 ${HOLD_PINK_BTN}`}
          >
            {saving ? 'Writing clip…' : 'Save to Photos'}
          </button>
          {athleteId && (
            <button
              type="button"
              disabled={!blob}
              onClick={() => {
                if (!blob || !athleteId) return
                void uploadAthleteVideo({
                  athleteId,
                  blob,
                  name: filename.replace(/\.(webm|mp4)$/i, ''),
                  source: 'hold',
                  durationSec: holdSeconds,
                })
                  .then(() => {
                    setFlash('Saved into this profile’s video library.')
                    window.setTimeout(() => setFlash(null), 4000)
                  })
                  .catch(() => {
                    setFlash('Could not save into the video library.')
                    window.setTimeout(() => setFlash(null), 4000)
                  })
              }}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-semibold"
            >
              Video library
            </button>
          )}
        </div>
        <p className="text-[11px] leading-snug text-[var(--muted)]">
          Recap stays instant. Save writes a new clip at the speed above, with only the overlays you left on.
        </p>
      </div>

      <details className={`mt-1 ${fill ? 'px-1' : ''}`}>
        <summary className="cursor-pointer text-[11px] font-semibold text-[var(--muted)]">
          Line style
        </summary>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={`rounded-full px-3 py-1 text-[12px] ${
              mode === 'auto'
                ? 'bg-[var(--accent)] font-semibold text-[#06281f]'
                : 'border border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            Auto
          </button>
          <button
            type="button"
            onClick={() => setMode('merged')}
            className={`rounded-full px-3 py-1 text-[12px] ${
              mode === 'merged'
                ? 'bg-[var(--accent)] font-semibold text-[#06281f]'
                : 'border border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            Side · one line
          </button>
          <button
            type="button"
            onClick={() => setMode('split')}
            className={`rounded-full px-3 py-1 text-[12px] ${
              mode === 'split'
                ? 'bg-[var(--accent)] font-semibold text-[#06281f]'
                : 'border border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            Front · both sides
          </button>
          <button
            type="button"
            onClick={() => setShowAngles((on) => !on)}
            disabled={!showSkeleton}
            className={`rounded-full px-3 py-1 text-[12px] disabled:opacity-40 ${
              showSkeleton && showAngles
                ? 'bg-[var(--accent)] font-semibold text-[#06281f]'
                : 'border border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            {showAngles ? 'Angles on' : 'Show angles'}
          </button>
        </div>
      </details>
      {flash && <p className={`mt-1 text-[11px] text-[var(--accent)] ${fill ? 'px-1' : ''}`}>{flash}</p>}
    </div>
  )
}
