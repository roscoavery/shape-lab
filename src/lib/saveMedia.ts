/**
 * Save a recorded clip to the phone's Photos/Files apps, or download on desktop.
 *
 * iPhone Safari ignores <a download> and will not put WebM in Photos.
 * The share sheet (files only — no extra text) is what actually offers
 * "Save Video" and "Save to Files".
 */

import { isAndroid } from './delayCameraPipeline'

export { isAndroid }

const remembered = new Map<string, Blob>()

export function rememberCaptureBlob(id: string, blob: Blob): void {
  remembered.set(id, blob)
}

export function getRememberedBlob(id: string): Blob | null {
  return remembered.get(id) ?? null
}

export async function durableBlob(blob: Blob): Promise<Blob> {
  const buf = await blob.arrayBuffer()
  return new Blob([buf], { type: blob.type || 'video/mp4' })
}

export function isAppleMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/** True when the native share sheet is the reliable way onto Photos / Files. */
export function prefersShareSave(): boolean {
  return (
    (isAppleMobile() || isAndroid()) &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  )
}

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
]

const ANDROID_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
]

export function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const list = isAndroid() ? ANDROID_MIME_CANDIDATES : MIME_CANDIDATES
  return list.find((t) => MediaRecorder.isTypeSupported(t))
}

/** Extra Android types only. Other devices keep the exact accept string. */
export function videoFileAccept(base = 'video/*,.mp4,.mov'): string {
  if (!isAndroid()) return base
  const extra = ['video/webm', 'video/3gpp', '.webm', '.3gp']
  const parts = base.split(',').map((part) => part.trim()).filter(Boolean)
  for (const item of extra) {
    if (!parts.includes(item)) parts.push(item)
  }
  return parts.join(',')
}

export function extForVideoType(type: string): 'mp4' | 'webm' {
  return /mp4|quicktime|m4v/i.test(type) ? 'mp4' : 'webm'
}

export function createRecorder(stream: MediaStream): MediaRecorder {
  const mime = pickRecorderMime()
  const bitrates = isAndroid()
    ? [2_500_000, 1_500_000, 800_000]
    : [6_000_000, 3_500_000, 2_000_000]
  for (const bps of bitrates) {
    try {
      const opts: MediaRecorderOptions = { videoBitsPerSecond: bps }
      if (mime) opts.mimeType = mime
      return new MediaRecorder(stream, opts)
    } catch {
      /* try a lower bitrate */
    }
  }
  if (mime) {
    try {
      return new MediaRecorder(stream, { mimeType: mime })
    } catch {
      /* fall through */
    }
  }
  return new MediaRecorder(stream)
}

export function startRecorder(rec: MediaRecorder, timesliceMs = 400): void {
  const apple = isAppleMobile()
  try {
    if (apple) rec.start()
    else rec.start(timesliceMs)
  } catch {
    rec.start()
  }
}

export function hintMotion(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getVideoTracks()) {
    try {
      track.contentHint = 'motion'
    } catch {
      /* Safari may ignore */
    }
  }
}

function triggerAnchorDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 8000)
}

async function shareFile(file: File): Promise<boolean> {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
    share: (data: ShareData) => Promise<void>
  }
  if (typeof nav.share !== 'function') return false
  const data: ShareData = { files: [file] }
  if (typeof nav.canShare === 'function') {
    try {
      if (!nav.canShare(data) && !isAppleMobile()) return false
    } catch {
      if (!isAppleMobile()) return false
    }
  }
  try {
    await nav.share(data)
    return true
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return true
    return false
  }
}

export type SaveVideoResult = 'shared' | 'downloaded' | 'failed'

/**
 * Put a clip on the device. Call this from a tap so iOS keeps the user gesture.
 * Phones open the share sheet (Save Video / Save to Files). Desktop downloads.
 */
export async function saveVideoToDevice(
  blob: Blob,
  filename: string,
): Promise<SaveVideoResult> {
  if (!blob || blob.size < 32) return 'failed'
  const type = blob.type || (filename.endsWith('.mp4') ? 'video/mp4' : 'video/webm')
  const file = new File([blob], filename, { type })

  if (prefersShareSave()) {
    if (await shareFile(file)) return 'shared'
  }

  try {
    triggerAnchorDownload(blob, filename)
    return 'downloaded'
  } catch {
    if (await shareFile(file)) return 'shared'
    return 'failed'
  }
}

export function saveResultMessage(result: SaveVideoResult, kind: 'video' | 'pack' = 'video'): string {
  if (result === 'shared') {
    return isAppleMobile()
      ? 'Share sheet opened — tap Save Video (Photos) or Save to Files.'
      : isAndroid()
        ? 'Share sheet opened — save the video to Gallery or Files.'
        : 'Share sheet opened — save the video to Photos or Files.'
  }
  if (result === 'downloaded') {
    return kind === 'pack'
      ? 'Downloaded to this device.'
      : 'Downloading to this device…'
  }
  return 'Could not save that clip. Keep the tab open and try Save again.'
}
