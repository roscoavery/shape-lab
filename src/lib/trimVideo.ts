/**
 * Cut a recorded blob to the window Replay Last is scrubbing.
 * MediaRecorder files keep the whole rolling buffer; Photos should get the
 * last N seconds (or the A/B loop), not the unused head.
 */

import {
  createRecorder,
  durableBlob,
  hintMotion,
  startRecorder,
} from './saveMedia'

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - t) < 0.03) {
      resolve()
      return
    }
    const done = () => {
      video.removeEventListener('seeked', done)
      resolve()
    }
    video.addEventListener('seeked', done)
    video.currentTime = Math.min(Math.max(0, t), Math.max(0, (video.duration || t) - 0.001))
  })
}

function loadVideo(blob: Blob): Promise<{ video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    const url = URL.createObjectURL(blob)
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that replay clip'))
    }
    video.onloadedmetadata = () => resolve({ video, url })
    video.src = url
  })
}

async function readDuration(video: HTMLVideoElement): Promise<number> {
  if (Number.isFinite(video.duration) && video.duration > 0 && video.duration < 1e6) {
    return video.duration
  }
  await seek(video, 1e7)
  return Number.isFinite(video.duration) && video.duration < 1e6 ? video.duration : 0
}

export async function extractVideoRange(
  source: Blob,
  startSec: number,
  endSec: number,
): Promise<Blob> {
  if (!source || source.size < 800) return source
  const { video, url } = await loadVideo(source)
  try {
    const duration = await readDuration(video)
    const start = Math.max(0, Math.min(startSec, duration || startSec))
    const end = Math.max(start + 0.2, Math.min(endSec, duration || endSec))
    if (duration > 0 && start <= 0.12 && end >= duration - 0.25) return source

    const srcW = video.videoWidth || 1280
    const srcH = video.videoHeight || 720
    const maxEdge = 1280
    const scale = Math.max(srcW, srcH) > maxEdge ? maxEdge / Math.max(srcW, srcH) : 1
    const width = Math.max(16, Math.round(srcW * scale))
    const height = Math.max(16, Math.round(srcH * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.style.position = 'fixed'
    canvas.style.left = '-9999px'
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      canvas.remove()
      throw new Error('Could not cut that clip')
    }

    const captured = canvas.captureStream(30)
    hintMotion(captured)
    const rec = createRecorder(captured)
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }
    const stopped = new Promise<Blob>((resolve) => {
      rec.onstop = () => {
        captured.getTracks().forEach((t) => t.stop())
        resolve(new Blob(chunks, { type: rec.mimeType || source.type || 'video/mp4' }))
      }
    })
    startRecorder(rec, 200)

    const fps = 24
    const step = 1 / fps
    let t = start
    try {
      while (t <= end + 0.001) {
        await seek(video, t)
        ctx.drawImage(video, 0, 0, width, height)
        await new Promise<void>((r) => requestAnimationFrame(() => r()))
        t += step
      }
    } finally {
      if (rec.state !== 'inactive') rec.stop()
      canvas.remove()
    }

    const blob = await stopped
    if (blob.size < 800) throw new Error('Cut clip was empty')
    return durableBlob(blob)
  } finally {
    URL.revokeObjectURL(url)
    video.src = ''
  }
}

/** Last `tailSeconds` of a rolling buffer (what Replay Last shows). */
export async function extractVideoTail(source: Blob, tailSeconds: number): Promise<Blob> {
  if (!source || source.size < 800 || tailSeconds <= 0) return source
  const { video, url } = await loadVideo(source)
  try {
    const duration = await readDuration(video)
    if (!(duration > tailSeconds + 0.35)) return source
    return extractVideoRange(source, duration - tailSeconds, duration)
  } finally {
    URL.revokeObjectURL(url)
    video.src = ''
  }
}
