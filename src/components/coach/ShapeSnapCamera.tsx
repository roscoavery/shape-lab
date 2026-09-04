import { useEffect, useRef, useState } from 'react'
import { isAndroid } from '../../lib/delayCameraPipeline'

type Props = {
  onCapture: (file: File) => void
  onClose: () => void
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return isAndroid()
      ? 'Camera permission is blocked. Tap the lock in Chrome, allow Camera, then try again.'
      : 'Camera permission was blocked. Allow the camera, then try again.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera found on this device.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is already in use. Close the other camera view and try again.'
  }
  if (name === 'SecurityError') {
    return 'This page needs HTTPS (or localhost) before the camera can open.'
  }
  return err instanceof Error
    ? err.message
    : 'Could not open the camera. Allow permission and try again.'
}

export function ShapeSnapCamera({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setError(null)

    const start = async () => {
      try {
        stopStream(streamRef.current)
        streamRef.current = null
        const attempts: MediaStreamConstraints[] = isAndroid()
          ? [
              {
                audio: false,
                video: {
                  facingMode: { ideal: facing },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
              },
              { audio: false, video: { facingMode: { ideal: facing } } },
              { audio: false, video: true },
            ]
          : [
              {
                audio: false,
                video: {
                  facingMode: { ideal: facing },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
              },
            ]
        let stream: MediaStream | null = null
        let lastErr: unknown = null
        for (const constraints of attempts) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints)
            break
          } catch (err) {
            lastErr = err
          }
        }
        if (!stream) throw lastErr instanceof Error ? lastErr : new Error('Could not open the camera.')
        if (cancelled) {
          stopStream(stream)
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) throw new Error('Preview missing.')
        video.srcObject = stream
        await video.play()
        setReady(true)
      } catch (err) {
        if (!cancelled) setError(cameraErrorMessage(err))
      }
    }

    void start()
    return () => {
      cancelled = true
      stopStream(streamRef.current)
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [facing])

  const snap = async () => {
    const video = videoRef.current
    if (!video || !ready || video.videoWidth < 2) return
    setBusy(true)
    try {
      const maxEdge = 1600
      const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight))
      const width = Math.max(1, Math.round(video.videoWidth * scale))
      const height = Math.max(1, Math.round(video.videoHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not capture that frame.')
      ctx.drawImage(video, 0, 0, width, height)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (next) => (next ? resolve(next) : reject(new Error('Could not capture that frame.'))),
          'image/jpeg',
          0.86,
        )
      })
      onCapture(new File([blob], `shape-snap-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not snap that photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-[var(--accent)]/40 bg-[#0d1218] p-3">
      <p className="text-sm font-semibold">Snap the shape</p>
      <p className="text-xs text-[var(--muted)]">
        Hold the gymnast in the position, then tap Snap. You can crop after.
      </p>
      <video
        ref={videoRef}
        className="mt-2 aspect-[4/3] w-full rounded-md bg-black object-cover"
        playsInline
        muted
        autoPlay
      />
      {!ready && !error && (
        <p className="mt-2 text-sm text-[var(--muted)]">Opening the camera…</p>
      )}
      {error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ready || busy}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-40"
          onClick={() => void snap()}
        >
          {busy ? 'Saving…' : 'Snap'}
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
          onClick={() => setFacing((side) => (side === 'environment' ? 'user' : 'environment'))}
        >
          Flip camera
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}
