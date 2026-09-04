/**
 * Record or pick a short clip and save it into the gym video library.
 */

import { isAndroid } from './delayCameraPipeline'
import { createRecorder, pickRecorderMime, startRecorder } from './saveMedia'
import { uploadAthleteVideo, type AthleteVideoSource } from './athleteVideoStore'

export async function recordQuickClip(seconds = 8): Promise<Blob> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot open the camera.')
  }
  const attempts: MediaStreamConstraints[] = isAndroid()
    ? [
        { video: { facingMode: { ideal: 'environment' } }, audio: true },
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        { video: true, audio: true },
      ]
    : [
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 720 },
            height: { ideal: 1280 },
          },
          audio: true,
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
  if (!stream) {
    throw lastErr instanceof Error ? lastErr : new Error('This browser cannot open the camera.')
  }
  try {
    if (!pickRecorderMime() && typeof MediaRecorder === 'undefined') {
      throw new Error('This browser cannot record a clip.')
    }
    const rec = createRecorder(stream)
    const chunks: Blob[] = []
    const blob = await new Promise<Blob>((resolve, reject) => {
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      rec.onerror = () => reject(new Error('Recording stopped unexpectedly.'))
      rec.onstop = () => {
        resolve(new Blob(chunks, { type: rec.mimeType || 'video/webm' }))
      }
      startRecorder(rec)
      window.setTimeout(() => {
        if (rec.state === 'recording') rec.stop()
      }, Math.max(2, seconds) * 1000)
    })
    if (blob.size < 32) throw new Error('That recording was empty. Try again.')
    return blob
  } finally {
    for (const track of stream.getTracks()) track.stop()
  }
}

export function guessClipMime(file: Pick<File, 'type' | 'name'>): string {
  const typed = (file.type || '').toLowerCase().split(';')[0]!.trim()
  if (typed && typed !== 'application/octet-stream') return typed
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.mov')) return 'video/quicktime'
  if (name.endsWith('.m4v') || name.endsWith('.mp4')) return 'video/mp4'
  if (name.endsWith('.webm')) return 'video/webm'
  if (name.endsWith('.heic')) return 'image/heic'
  if (name.endsWith('.heif')) return 'image/heif'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.gif')) return 'image/gif'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  return ''
}

export async function fileToClipBlob(file: File): Promise<Blob> {
  const mime = guessClipMime(file)
  if (!mime.startsWith('video/') && !mime.startsWith('image/')) {
    throw new Error('Pick a video or a photo from your library.')
  }
  if (file.size > 48 * 1024 * 1024) {
    throw new Error('That file is too large for this gym link. Keep it under about 45 MB.')
  }
  if (file.size < 24) {
    throw new Error('That file was empty. Try another clip from Photos.')
  }
  return mime && mime !== file.type ? new File([file], file.name || 'clip', { type: mime }) : file
}

export async function saveQuickClip(opts: {
  athleteId: string
  blob: Blob
  name: string
  source: AthleteVideoSource
}): Promise<{ id: string; url: string }> {
  const saved = await uploadAthleteVideo({
    athleteId: opts.athleteId,
    blob: opts.blob,
    name: opts.name,
    source: opts.source,
  })
  return { id: saved.id, url: saved.url }
}
