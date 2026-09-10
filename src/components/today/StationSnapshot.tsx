import { useEffect, useRef, useState } from 'react'
import { isAndroid } from '../../lib/delayCameraPipeline'
import { photoDisplayKey } from '../../lib/profilePhoto'
import { ProfilePhotoCropper } from './ProfilePhotoCropper'

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
  return err instanceof Error ? err.message : 'Could not open the camera.'
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function frameToJpeg(source: CanvasImageSource, width: number, height: number): string {
  const maxEdge = 2000
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(source, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.9)
}

export async function photoFileToDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Could not read that photo.'))
      image.src = url
    })
    const data = frameToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height)
    if (!data) throw new Error('Could not read that photo.')
    return data
  } finally {
    URL.revokeObjectURL(url)
  }
}

type Props = {
  photoDataUrl?: string
  athleteId?: string
  onCapture: (dataUrl: string) => void
  allowUpload?: boolean
}

export function StationSnapshot({ photoDataUrl, athleteId, onCapture, allowUpload }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [live, setLive] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [savedPreview, setSavedPreview] = useState<string | null>(null)
  const shownPhoto = savedPreview || photoDataUrl

  useEffect(() => {
    return () => {
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!live || !streamRef.current) return
    const video = videoRef.current
    if (!video) return
    video.srcObject = streamRef.current
    void video
      .play()
      .then(() => setReady(true))
      .catch((err) => setError(cameraErrorMessage(err)))
  }, [live])

  const openCamera = async () => {
    setError(null)
    setBusy(true)
    setReady(false)
    try {
      stopStream(streamRef.current)
      streamRef.current = null
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: isAndroid()
          ? { facingMode: { ideal: 'user' } }
          : {
              facingMode: { ideal: 'user' },
              width: { ideal: 1280 },
              height: { ideal: 1280 },
            },
      })
      streamRef.current = stream
      setLive(true)
    } catch (err) {
      setLive(false)
      setReady(false)
      setError(cameraErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const snap = () => {
    const video = videoRef.current
    if (!video || video.videoWidth < 2) {
      setError('Wait for the preview, then tap Capture.')
      return
    }
    const data = frameToJpeg(video, video.videoWidth, video.videoHeight)
    if (!data) return
    stopStream(streamRef.current)
    streamRef.current = null
    setLive(false)
    setReady(false)
    setPending(data)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      setPending(await photoFileToDataUrl(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that photo.')
    }
  }

  if (pending) {
    return (
      <ProfilePhotoCropper
        src={pending}
        athleteId={athleteId}
        onSave={(dataUrl) => {
          setSavedPreview(dataUrl)
          onCapture(dataUrl)
          setPending(null)
        }}
        onCancel={() => setPending(null)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {shownPhoto && !live ? (
        <img
          key={photoDisplayKey(shownPhoto)}
          src={shownPhoto}
          alt=""
          className="mx-auto h-40 w-40 rounded-full object-cover"
        />
      ) : live ? (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="mx-auto h-56 w-56 rounded-full bg-black object-cover"
        />
      ) : (
        <p className="text-sm text-white/55">
          {allowUpload
            ? 'Take a snapshot or add a pic from this device.'
            : 'Skip if the line is moving.'}
        </p>
      )}
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      {live ? (
        <button
          type="button"
          disabled={!ready}
          onClick={snap}
          className="h-14 rounded-2xl border border-white/15 text-base font-semibold disabled:opacity-40"
        >
          {ready ? 'Capture' : 'Opening camera…'}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void openCamera()}
            className="h-14 rounded-2xl border border-white/15 text-base font-semibold disabled:opacity-40"
          >
            {busy ? 'Opening camera…' : shownPhoto ? 'Retake snapshot' : 'Take a snapshot'}
          </button>
          {allowUpload && (
            <label className="flex h-12 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/20 text-sm font-semibold text-white/80">
              Add a pic
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
          )}
          {shownPhoto && (
            <button
              type="button"
              onClick={() => setPending(shownPhoto)}
              className="h-11 rounded-2xl border border-white/15 text-sm font-semibold"
            >
              Adjust crop
            </button>
          )}
        </div>
      )}
    </div>
  )
}
