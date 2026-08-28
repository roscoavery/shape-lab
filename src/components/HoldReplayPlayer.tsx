/**
 * Hold-challenge analysis player.
 * Watch the camera clip with a live overlay you can switch before saving:
 *   Side view · one line  (hands–shoulders–hips–knees–ankles–toes)
 *   Front · left & right
 * Save burns that overlay into a real video file and opens Photos / Files.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { getShape } from '../config/shapes'
import { formatSeconds } from '../lib/handstandHold'
import {
  burnOverlayVideo,
  burnedOverlayKey,
  getBurnedOverlay,
  rememberBurnedOverlay,
} from '../lib/overlayExport'
import { landmarksAt, type PoseTrack } from '../lib/poseTrack'
import {
  extForVideoType,
  saveResultMessage,
  saveVideoToDevice,
  type SaveVideoResult,
} from '../lib/saveMedia'
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
  clipId?: string | null
  compact?: boolean
  /** When false, overlay file is encoded only after you tap Prepare save. */
  encodeOnReady?: boolean
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
  encodeOnReady = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [mode, setMode] = useState<JointDrawMode>('merged')
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [prepared, setPrepared] = useState<Blob | null>(null)
  const [prep, setPrep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const genRef = useRef(0)

  useEffect(() => {
    saveJointDrawMode(mode)
  }, [mode])

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

    const paint = () => {
      const w = video.videoWidth
      const h = video.videoHeight
      if (w > 8 && h > 8) {
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
          const t = video.currentTime
          const lm = landmarksAt(track, t)
          const score = shape ? scoreShape(lm, shape, null, { profileOk: true }) : null
          drawPoseOverlay(ctx, lm, {
            width: w,
            height: h,
            mirror,
            mode,
            showAngles: true,
            lineColor: overlayLineColor(score),
          })
          const clock = Math.max(0, Math.min(holdSeconds, t - clockOffsetSec))
          if (score) {
            drawGradeHud(ctx, w, h, Math.round(score.overall), 'Handstand', clock)
          }
        }
      }
      setTime(video.currentTime)
      raf = requestAnimationFrame(paint)
    }

    const onMeta = () => {
      setDuration(video.duration || holdSeconds)
      if (playheadSec != null && Number.isFinite(playheadSec)) {
        video.currentTime = Math.max(0, playheadSec)
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
  }, [src, blob, track, mode, mirror, holdSeconds, clockOffsetSec, playheadSec])

  const runEncode = useCallback(async () => {
    if (!blob) {
      setFlash('Clip is still loading — wait a moment, then tap Prepare save.')
      return
    }
    const key = burnedOverlayKey(clipId, mode, mirror)
    const cached = getBurnedOverlay(key)
    if (cached) {
      setPrepared(cached)
      setBusy(false)
      setPrep(1)
      return
    }
    const gen = ++genRef.current
    setPrepared(null)
    setPrep(0)
    setBusy(true)
    setFlash(null)
    try {
      const out = await burnOverlayVideo({
        source: blob,
        track,
        mode,
        mirror,
        holdSeconds,
        clockOffsetSec,
        cancelled: () => gen !== genRef.current,
        onProgress: (p) => {
          if (gen === genRef.current) setPrep(p)
        },
      })
      if (gen !== genRef.current) return
      rememberBurnedOverlay(key, out)
      setPrepared(out)
      setPrep(1)
    } catch (err) {
      if (gen !== genRef.current) return
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'cancelled') return
      setPrepared(blob)
      setFlash('Could not burn the overlay — Save still puts the camera clip in Photos.')
      window.setTimeout(() => setFlash(null), 4000)
    } finally {
      if (gen === genRef.current) setBusy(false)
    }
  }, [blob, track, mode, mirror, holdSeconds, clockOffsetSec, clipId])

  useEffect(() => {
    const key = burnedOverlayKey(clipId, mode, mirror)
    const cached = getBurnedOverlay(key)
    if (cached) {
      setPrepared(cached)
      setBusy(false)
      setPrep(1)
      return
    }
    setPrepared(null)
    if (!encodeOnReady || !blob) return
    void runEncode()
    return () => {
      genRef.current += 1
    }
  }, [blob, track, mode, mirror, holdSeconds, clockOffsetSec, clipId, encodeOnReady, runEncode])

  const save = async () => {
    setSaving(true)
    setFlash(null)
    try {
      let fileBlob = prepared
      if (!fileBlob) {
        if (!blob) {
          setFlash('Clip is still loading — wait a moment, then tap Save again.')
          return
        }
        const key = burnedOverlayKey(clipId, mode, mirror)
        const cached = getBurnedOverlay(key)
        if (cached) {
          fileBlob = cached
          setPrepared(cached)
        } else {
          setBusy(true)
          const out = await burnOverlayVideo({
            source: blob,
            track,
            mode,
            mirror,
            holdSeconds,
            clockOffsetSec,
            cancelled: () => false,
            onProgress: (p) => setPrep(p),
          })
          rememberBurnedOverlay(key, out)
          setPrepared(out)
          setPrep(1)
          fileBlob = out
        }
      }
      const ext = extForVideoType(fileBlob.type || filename)
      const name = filename.replace(/\.(webm|mp4)$/i, '') + `.${ext}`
      const result: SaveVideoResult = await saveVideoToDevice(fileBlob, name)
      setFlash(saveResultMessage(result))
    } catch (err) {
      const raw = blob
      if (raw) {
        const ext = extForVideoType(raw.type || filename)
        const name = filename.replace(/\.(webm|mp4)$/i, '') + `.${ext}`
        const result: SaveVideoResult = await saveVideoToDevice(raw, name)
        setFlash(
          saveResultMessage(result) ||
            (err instanceof Error ? err.message : 'Saved the camera clip without overlay.'),
        )
      } else {
        setFlash('Could not save that hold clip.')
      }
    } finally {
      setBusy(false)
      setSaving(false)
      window.setTimeout(() => setFlash(null), 5000)
    }
  }

  return (
    <div>
      <div className="overflow-hidden rounded-md bg-black">
        <video ref={videoRef} className="hidden" playsInline muted={compact} />
        <canvas
          ref={canvasRef}
          className={`block w-full bg-black object-contain ${compact ? 'max-h-56' : 'max-h-[70vh]'}`}
        />
        <div className="flex items-center gap-2 bg-black/80 px-2 py-1.5">
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-white"
            onClick={() => {
              const v = videoRef.current
              if (!v) return
              if (v.paused) void v.play()
              else v.pause()
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(0.1, duration)}
            step={0.05}
            value={Math.min(time, duration || time)}
            onChange={(e) => {
              const v = videoRef.current
              const t = Number(e.target.value)
              if (v) v.currentTime = t
              setTime(t)
            }}
            className="min-w-0 flex-1"
            aria-label="Hold replay playhead"
          />
          <span className="tabular-nums text-[11px] text-white/80">
            {formatSeconds(time)} / {formatSeconds(duration || holdSeconds)}
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Joint overlay
        </span>
        <button
          type="button"
          onClick={() => setMode('merged')}
          className={`rounded-full px-3 py-1 text-[12px] ${
            mode === 'merged'
              ? 'bg-[var(--accent)] font-semibold text-[#06281f]'
              : 'border border-[var(--panel-border)] text-[var(--muted)]'
          }`}
        >
          Side view · one line
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
          Front · left & right
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
        {mode === 'merged'
          ? 'One line: hands, shoulders, hips, knees, ankles, toes. Use this for a side-view handstand.'
          : 'Left and right drawn separately. Use this if you filmed from the front.'}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!blob || busy || saving}
          onClick={() => void save()}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-50"
        >
          {saving
            ? 'Opening share…'
            : busy
              ? `Preparing video file… ${Math.round(prep * 100)}%`
              : 'Save video to Photos'}
        </button>
        {busy && (
          <span className="text-[11px] text-[var(--muted)]">
            Burning the one-line overlay, stopwatch, and live score into the file.
          </span>
        )}
      </div>
      {flash && <p className="mt-1 text-[11px] text-[var(--accent)]">{flash}</p>}
    </div>
  )
}
