/**
 * Shared delay-cam MediaRecorder + MediaSource codec pick.
 * iPhone Safari has ManagedMediaSource instead of classic MediaSource.
 * Desktop Chrome / Android Chrome keep the classic path.
 */

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4;codecs=avc1.42001E',
  'video/mp4',
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9',
  'video/webm',
]

type MediaSourceCtor = {
  new (): MediaSource
  isTypeSupported?: (type: string) => boolean
}

export type DelayCameraPipeline = {
  Source: MediaSourceCtor
  mime: string
  managed: boolean
}

function windowMediaSource(): MediaSourceCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    MediaSource?: MediaSourceCtor
    ManagedMediaSource?: MediaSourceCtor
  }
  if (typeof w.MediaSource === 'function') return w.MediaSource
  if (typeof w.ManagedMediaSource === 'function') return w.ManagedMediaSource
  return null
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iP(hone|od|ad)/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/**
 * iPhone: recorded MSE is sideways (no rotation tag) even when Safari
 * exposes classic MediaSource. Always use the frame-canvas display there.
 */
export function usesFrameDelayDisplay() {
  return isIosDevice() || getDelayCameraPipeline()?.managed === true
}

export function getDelayCameraPipeline(preferredMime?: string | null): DelayCameraPipeline | null {
  if (typeof MediaRecorder === 'undefined') return null
  const Source = windowMediaSource()
  if (!Source) return null
  const supported = (type: string) => {
    if (!MediaRecorder.isTypeSupported(type)) return false
    if (typeof Source.isTypeSupported !== 'function') return true
    return Source.isTypeSupported(type)
  }
  const mime =
    (preferredMime && supported(preferredMime) ? preferredMime : null) ??
    MIME_CANDIDATES.find(supported) ??
    null
  if (!mime) return null
  const classic = typeof (window as Window & { MediaSource?: unknown }).MediaSource === 'function'
  return { Source, mime, managed: !classic }
}

export function pickRecorderMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null
}

/** iPhone / Android: inline playback, no AirPlay hijack of ManagedMediaSource. */
export function prepareDelayVideo(video: HTMLVideoElement | null) {
  if (!video) return
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.disableRemotePlayback = true
}
