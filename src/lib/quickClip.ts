/**
 * Record or pick a short clip and save it into the gym video library.
 */

import { createRecorder, pickRecorderMime, startRecorder } from './saveMedia'
import { uploadAthleteVideo, type AthleteVideoSource } from './athleteVideoStore'

export async function recordQuickClip(seconds = 8): Promise<Blob> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot open the camera.')
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 720 }, height: { ideal: 1280 } },
    audio: true,
  })
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

export async function fileToClipBlob(file: File): Promise<Blob> {
  if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
    throw new Error('Pick a video or a photo from your library.')
  }
  if (file.size > 48 * 1024 * 1024) {
    throw new Error('That file is too large for this gym link. Keep it under about 45 MB.')
  }
  return file
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
