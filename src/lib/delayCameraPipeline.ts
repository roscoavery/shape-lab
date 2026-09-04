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

/** Chrome Android often reports mp4 as supported, then writes a broken clip. */
const ANDROID_MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
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

/** Chrome / WebView on Android. Never true on iPhone, iPad, or desktop Safari. */
export function isAndroid() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

function recorderMimeCandidates(): readonly string[] {
  return isAndroid() ? ANDROID_MIME_CANDIDATES : MIME_CANDIDATES
}

/** iPad (including iPadOS desktop UA). Phone and laptop stay on the native camera frame. */
export function isIpadDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/** iPhone / iPad / Android — speechSynthesis is flaky on all of these. */
export function isPhoneBrowser() {
  if (isIosDevice()) return true
  return isAndroid()
}

/**
 * iPhone canvas delay display was blank (Safari would not paint a
 * zero-sized / offscreen canvas copy). Delay cam uses MSE again;
 * IosDelayUnwind CSS-rotates that <video>, which does paint.
 */
export function usesFrameDelayDisplay() {
  return false
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
    recorderMimeCandidates().find(supported) ??
    null
  if (!mime) return null
  const classic = typeof (window as Window & { MediaSource?: unknown }).MediaSource === 'function'
  return { Source, mime, managed: !classic }
}

export function pickRecorderMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  return recorderMimeCandidates().find((t) => MediaRecorder.isTypeSupported(t)) ?? null
}

/** Human message when getUserMedia never opens a prompt or the stream fails. */
export function cameraPermissionMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return 'This page is not HTTPS, so the browser will not start the camera. Open the gym link, then tap GO.'
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return isAndroid()
      ? 'Camera permission is blocked. Tap the lock in Chrome, allow Camera, then tap GO again.'
      : 'Camera permission is blocked. Click the camera icon in the address bar, allow it, then tap GO again.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return isAndroid()
      ? 'No camera was found on this phone. Check that Chrome can use the camera, then tap GO again.'
      : 'No camera was found on this computer. Plug one in, then tap GO again.'
  }
  if (name === 'NotReadableError' || name === 'AbortError' || name === 'TrackStartError') {
    return isAndroid()
      ? 'Another app is using the camera. Close Meet, Instagram, or the Camera app, then tap GO again.'
      : 'Another app is using the camera. Close Zoom, Meet, or Photo Booth, then tap GO again.'
  }
  if (err instanceof Error && err.message) return err.message
  return 'Could not access the camera. Allow camera, then tap GO again.'
}

/** Tasks / homework wait copy. Safari wording stays on iPhone and iPad. */
export function cameraPromptCue(kind: 'starting' | 'waiting' | 'blocked' | 'homework'): string {
  if (isAndroid()) {
    if (kind === 'starting') return 'Starting camera… Allow it if Chrome asks.'
    if (kind === 'waiting') return 'Allow the camera if Chrome asks — waiting…'
    if (kind === 'homework') return 'Allow the camera if Chrome asks'
    return 'Allow the camera in Chrome, then tap Start again. Stay on this page.'
  }
  if (kind === 'starting') return 'Starting camera… Allow it if Safari asks.'
  if (kind === 'waiting') return 'Allow the camera if Safari asks — waiting…'
  if (kind === 'homework') return 'Allow the camera if Safari asks'
  return 'Allow the camera in Safari, then tap Start again. Stay on this page.'
}

/**
 * Open the user-facing camera at the device's native frame — same idea as
 * opening Camera / Photo Booth. Do not ask for 9:16 first: browsers treat
 * that as a digital crop, so delay and Replay last look zoomed-in.
 *
 * getUserMedia is the first await so a tap still counts as a user gesture.
 */
export async function requestUserCamera(_opts?: { portrait?: boolean }): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      typeof window !== 'undefined' && window.isSecureContext === false
        ? 'This page is not HTTPS, so the browser will not start the camera. Open the gym link.'
        : 'This browser cannot open the camera. Allow camera access, then try again.',
    )
  }
  const attempts: MediaStreamConstraints[] = isAndroid()
    ? [
        {
          audio: false,
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        { audio: false, video: { facingMode: { ideal: 'user' } } },
        { audio: false, video: true },
      ]
    : [
        {
          audio: false,
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        { audio: false, video: { facingMode: { ideal: 'user' } } },
        { audio: false, video: true },
      ]
  let lastErr: unknown = null
  let stream: MediaStream | null = null
  for (const constraints of attempts) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints)
      break
    } catch (err) {
      lastErr = err
    }
  }
  if (!stream) {
    throw lastErr instanceof Error ? lastErr : new Error(cameraPermissionMessage(lastErr))
  }
  return stream
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
