import { useEffect, useRef, useState } from 'react'

type Props = {
  src: string
  label: string
  onClose: () => void
  onSaved: () => void
}

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) return '0.0s'
  return `${t.toFixed(1)}s`
}

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm']
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c
    } catch {
      /* ignore */
    }
  }
  return ''
}

/**
 * Admin-only video trimmer. Plays the chosen segment through a hidden video
 * element, captures it with MediaRecorder, and uploads the trimmed clip to
 * replace the original file in place.
 */
export function VideoTrimmer({ src, label, onClose, onSaved }: Props) {
  const previewRef = useRef<HTMLVideoElement>(null)
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [hasEnd, setHasEnd] = useState(false)
  const [status, setStatus] = useState<'idle' | 'trimming' | 'uploading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const v = previewRef.current
    if (!v) return
    const onMeta = () => {
      setDuration(v.duration || 0)
      setEnd(v.duration || 0)
      setHasEnd(true)
    }
    v.addEventListener('loadedmetadata', onMeta)
    return () => v.removeEventListener('loadedmetadata', onMeta)
  }, [src])

  // Loop the selected segment in the preview.
  useEffect(() => {
    const v = previewRef.current
    if (!v || !hasEnd || status !== 'idle') return
    const onTime = () => {
      if (v.currentTime >= end || v.currentTime < start - 0.25) {
        v.currentTime = start
      }
    }
    v.addEventListener('timeupdate', onTime)
    v.currentTime = start
    void v.play().catch(() => {})
    return () => v.removeEventListener('timeupdate', onTime)
  }, [start, end, hasEnd, status])

  const clampStart = (v: number) => setStart(Math.max(0, Math.min(v, end - 0.2)))
  const clampEnd = (v: number) => setEnd(Math.min(duration, Math.max(v, start + 0.2)))

  const trimAndSave = async () => {
    setError('')
    const mime = pickMime()
    if (!mime) {
      setError('This browser cannot record video (MediaRecorder not supported).')
      setStatus('error')
      return
    }
    const segLen = end - start
    if (!(segLen > 0.2)) {
      setError('Pick a segment at least 0.2 seconds long.')
      setStatus('error')
      return
    }
    setStatus('trimming')
    setProgress(0)
    try {
      // Hidden worker video: seek to start, play, capture.
      const worker = document.createElement('video')
      worker.src = src
      worker.muted = true
      worker.playsInline = true
      worker.preload = 'auto'
      await new Promise<void>((resolve, reject) => {
        const to = setTimeout(() => reject(new Error('Video took too long to load.')), 15000)
        worker.onloadedmetadata = () => {
          clearTimeout(to)
          resolve()
        }
        worker.onerror = () => {
          clearTimeout(to)
          reject(new Error('Could not load the video.'))
        }
      })
      worker.currentTime = start
      await new Promise<void>((resolve, reject) => {
        const to = setTimeout(() => reject(new Error('Seek timed out.')), 8000)
        const onSeek = () => {
          clearTimeout(to)
          worker.removeEventListener('seeked', onSeek)
          resolve()
        }
        worker.addEventListener('seeked', onSeek)
      })

      const stream = (worker as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.()
      if (!stream) throw new Error('This browser cannot capture video for trimming.')
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10_000_000 })
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }
      const stopped = new Promise<void>((resolve) => {
        rec.onstop = () => resolve()
      })
      rec.start(250)
      await worker.play()

      // Record until we pass the end point.
      await new Promise<void>((resolve) => {
        const tick = () => {
          setProgress(Math.min(1, Math.max(0, (worker.currentTime - start) / segLen)))
          if (worker.currentTime >= end || worker.ended) {
            resolve()
          } else {
            requestAnimationFrame(tick)
          }
        }
        tick()
        // Safety: never record more than the segment plus 3s.
        setTimeout(resolve, (segLen + 3) * 1000)
      })
      rec.stop()
      worker.pause()
      await stopped

      const type = mime.includes('mp4') ? 'video/mp4' : 'video/webm'
      const blob = new Blob(chunks, { type })
      if (blob.size === 0) throw new Error('The trimmed clip came out empty.')

      setStatus('uploading')
      const res = await fetch(`/api/admin/video-replace?target=${encodeURIComponent(src.split('?')[0])}`, {
        method: 'POST',
        headers: { 'Content-Type': type },
        body: blob,
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `Upload failed (${res.status})`)
      }
      setStatus('done')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Trim failed.')
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-label={`Trim ${label}`}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--surface)] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-bold">Trim video</h3>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm opacity-70 hover:opacity-100"
            aria-label="Close trimmer"
          >
            ✕
          </button>
        </div>
        <p className="mb-3 text-xs opacity-70">
          {label} — drag the sliders to pick the segment, then save. The trimmed clip replaces the
          original everywhere.
        </p>

        <video
          ref={previewRef}
          src={src}
          className="mb-3 aspect-video w-full rounded-xl bg-black"
          playsInline
          muted
          preload="auto"
        />

        <div className="mb-1 flex justify-between text-xs font-semibold">
          <span>Start: {fmt(start)}</span>
          <span>End: {fmt(end)}</span>
          <span className="opacity-70">Length: {fmt(end - start)}</span>
        </div>
        <label className="mb-1 block text-xs opacity-70">
          Start
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={start}
            disabled={status === 'trimming' || status === 'uploading'}
            onChange={(e) => clampStart(Number(e.target.value))}
            className="w-full"
          />
        </label>
        <label className="mb-3 block text-xs opacity-70">
          End
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={end}
            disabled={status === 'trimming' || status === 'uploading'}
            onChange={(e) => clampEnd(Number(e.target.value))}
            className="w-full"
          />
        </label>

        {status === 'trimming' && (
          <div className="mb-3">
            <div className="h-2 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs opacity-70">
              Recording {fmt(end - start)} clip… {Math.round(progress * 100)}%
            </p>
          </div>
        )}
        {status === 'uploading' && (
          <p className="mb-3 text-xs opacity-70">Uploading trimmed clip…</p>
        )}
        {status === 'done' && (
          <p className="mb-3 text-xs font-semibold text-green-600">
            Saved. The trimmed clip is now live everywhere.
          </p>
        )}
        {status === 'error' && (
          <p className="mb-3 text-xs font-semibold text-red-600">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={trimAndSave}
            disabled={status === 'trimming' || status === 'uploading' || !hasEnd}
            className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {status === 'trimming'
              ? 'Trimming…'
              : status === 'uploading'
                ? 'Saving…'
                : 'Trim & save in place'}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border px-4 py-2.5 text-sm font-semibold opacity-80"
          >
            {status === 'done' ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
