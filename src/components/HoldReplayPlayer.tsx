/**
 * Hold-challenge analysis player.
 * Save burns the live score, stopwatch, and body line onto the clip at 1×.
 */

import { useEffect, useRef, useState } from 'react'
import { getShape } from '../config/shapes'
import { formatSeconds, holdMediaWindow } from '../lib/handstandHold'
import {
  burnOverlayVideo,
  burnedOverlayKey,
  getBurnedOverlay,
  rememberBurnedOverlay,
} from '../lib/overlayExport'
import { looksLikeBackgroundProp } from '../lib/poseSubject'
import { landmarksAtMedia, mediaTimeToTrackTime, type PoseTrack } from '../lib/poseTrack'
import {
  extForVideoType,
  saveResultMessage,
  saveVideoToDevice,
  type SaveVideoResult,
} from '../lib/saveMedia'
import { uploadAthleteVideo } from '../lib/athleteVideoStore'
import { scoreShape } from '../lib/scoring'
import {
  drawGradeHud,
  drawPoseOverlay,
  overlayLineColor,
  saveJointDrawMode,
  type JointDrawMode,
} from '../lib/skeleton'

type Props = {
  src: string
  blob: Blob | null
  track: PoseTrack | null
  holdSeconds: number
  clockOffsetSec?: number
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

export function HoldReplayPlayer({
  src,
  blob,
  track,
  holdSeconds,
  clockOffsetSec = 0,
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
  const [showOverlay, setShowOverlay] = useState(true)
  const [showAngles, setShowAngles] = useState(true)
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
    const shape = getShape('handstand')

    const windowFor = (mediaDur: number) => {
      const win = holdMediaWindow(clockOffsetSec, holdSeconds, mediaDur)
      const localTrack = Boolean(track && track.length && track[0]!.t <= 0.35)
      const span = track && track.length ? track[track.length - 1]!.t - track[0]!.t : 0
      const stretched = localTrack && mediaDur > span + 0.45
      return {
        start: stretched ? 0 : win.start,
        end: stretched ? mediaDur : win.end,
      }
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
          if (mirror) {
            ctx.save()
            ctx.translate(w, 0)
            ctx.scale(-1, 1)
            ctx.drawImage(video, 0, 0, w, h)
            ctx.restore()
          } else {
            ctx.drawImage(video, 0, 0, w, h)
          }
          const mediaDur = video.duration || holdSeconds
          const t = video.currentTime
          const view = windowFor(mediaDur)
          if (t >= view.end && !video.paused) {
            video.pause()
            video.currentTime = view.end
          }
          const trackT = mediaTimeToTrackTime(t, mediaDur, track)
          const clock = Math.max(0, Math.min(holdSeconds, trackT - clockOffsetSec))
          const rawLm = landmarksAtMedia(track, t, mediaDur)
          const lm = rawLm && !looksLikeBackgroundProp(rawLm) ? rawLm : null
          const score = shape && lm ? scoreShape(lm, shape, null, { profileOk: true }) : null
          if (showOverlay) {
            drawPoseOverlay(ctx, lm, {
              width: w,
              height: h,
              mirror,
              mode,
              showAngles,
              lineColor: overlayLineColor(score),
            })
          }
          drawGradeHud(ctx, w, h, Math.round(score?.overall ?? 0), 'Handstand', clock)
        }
      }
      setTime(video.currentTime)
      raf = requestAnimationFrame(paint)
    }

    const onMeta = () => {
      const mediaDur = video.duration || holdSeconds
      const view = windowFor(mediaDur)
      setViewStart(view.start)
      setDuration(Math.max(0.1, view.end - view.start))
      if (playheadSec != null && Number.isFinite(playheadSec)) {
        video.currentTime = Math.min(view.end, Math.max(view.start, playheadSec))
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
    playheadSec,
    showOverlay,
    showAngles,
    videoReady,
  ])

  const save = async () => {
    if (!blob) {
      setFlash('Clip is still loading — wait a moment, then tap Save again.')
      window.setTimeout(() => setFlash(null), 4000)
      return
    }
    setSaving(true)
    setFlash('Adding score, clock, and body line…')
    try {
      const key = burnedOverlayKey(clipId, mode, mirror, showOverlay, showAngles)
      let out = getBurnedOverlay(key)
      if (!out) {
        out = await burnOverlayVideo({
          source: blob,
          track,
          mode,
          mirror,
          holdSeconds,
          clockOffsetSec,
          showSkeleton: showOverlay,
          showAngles,
          onProgress: (p) => {
            setFlash(`Adding score, clock, and body line… ${Math.round(p * 100)}%`)
          },
        })
        rememberBurnedOverlay(key, out)
      }
      const ext = extForVideoType(out.type || blob.type || filename)
      const name = filename.replace(/\.(webm|mp4)$/i, '') + `.${ext}`
      const result: SaveVideoResult = await saveVideoToDevice(out, name)
      setFlash(saveResultMessage(result))
    } catch {
      setFlash('Could not save that hold clip.')
    } finally {
      setSaving(false)
      window.setTimeout(() => setFlash(null), 5000)
    }
  }

  const frameH = fill ? 'min-h-0 flex-1' : compact ? 'max-h-56' : 'max-h-[70vh]'

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
                if (v.currentTime >= viewStart + duration - 0.05) v.currentTime = viewStart
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
            value={Math.min(duration, Math.max(0, time - viewStart))}
            onChange={(e) => {
              const v = videoRef.current
              const t = viewStart + Number(e.target.value)
              if (v) v.currentTime = t
              setTime(t)
            }}
            className="min-w-0 flex-1"
            aria-label="Hold replay playhead"
          />
          <span className="tabular-nums text-[11px] text-white/80">
            {formatSeconds(Math.max(0, time - viewStart))} / {formatSeconds(duration || holdSeconds)}
          </span>
        </div>
      </div>

      <div className={`mt-2 flex flex-wrap items-center gap-2 ${fill ? 'px-1' : ''}`}>
        <button
          type="button"
          disabled={!blob || saving}
          onClick={() => void save()}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-50"
        >
          {saving ? 'Saving with score…' : 'Save to Photos'}
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
        <p className="text-[11px] leading-snug text-[var(--muted)]">
          Saves the clip at regular speed with the live score, stopwatch, and body line.
        </p>
      </div>

      <details className={`mt-1 ${fill ? 'px-1' : ''}`}>
        <summary className="cursor-pointer text-[11px] font-semibold text-[var(--muted)]">
          Lines on this clip
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
            onClick={() => setShowOverlay((on) => !on)}
            className={`rounded-full px-3 py-1 text-[12px] ${
              showOverlay
                ? 'border border-[var(--panel-border)] text-[var(--muted)]'
                : 'bg-[var(--accent)] font-semibold text-[#06281f]'
            }`}
          >
            {showOverlay ? 'Hide skeleton' : 'Show skeleton'}
          </button>
          <button
            type="button"
            onClick={() => setShowAngles((on) => !on)}
            disabled={!showOverlay}
            className={`rounded-full px-3 py-1 text-[12px] disabled:opacity-40 ${
              showOverlay && showAngles
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
