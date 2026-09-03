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

/** iPhone / iPod only — iPad is landscape-upright and must not get the 90° unwind. */
export function isIphone() {
  if (typeof navigator === 'undefined') return false
  return /iP(hone|od)/.test(navigator.userAgent || '')
}

/** iPhone / iPad / Android — speechSynthesis is flaky on all of these. */
export function isPhoneBrowser() {
  if (isIosDevice()) return true
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
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

/** Human message when getUserMedia never opens a prompt or the stream fails. */
export function cameraPermissionMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return 'This page is not HTTPS, so the browser will not start the camera. Open the gym link, then tap GO.'
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission is blocked. Click the camera icon in the address bar, allow it, then tap GO again.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found on this computer. Plug one in, then tap GO again.'
  }
  if (name === 'NotReadableError' || name === 'AbortError' || name === 'TrackStartError') {
    return 'Another app is using the camera. Close Zoom, Meet, or Photo Booth, then tap GO again.'
  }
  if (err instanceof Error && err.message) return err.message
  return 'Could not access the camera. Allow camera, then tap GO again.'
}

/**
 * Ask an already-open track for a tall 9:16 frame. Desktop webcams often
 * ignore this — CSS object-cover then crops to portrait.
 */
export async function preferPortraitTrack(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0]
  if (!track) return
  const settings = track.getSettings()
  const width = settings.width ?? 0
  const height = settings.height ?? 0
  if (height >= width && height > 0) return
  try {
    await track.applyConstraints({
      width: { ideal: 720 },
      height: { ideal: 1280 },
      aspectRatio: { ideal: 9 / 16 },
    })
  } catch {
    /* crop in the view instead */
  }
}

/**
 * Open the user-facing camera. Prefer a portrait / 9:16 frame so delay cam
 * fills a phone-shaped view. Fall back to any camera so Chrome still prompts.
 *
 * getUserMedia is the first await so a tap still counts as a user gesture.
 */
export async function requestUserCamera(opts?: { portrait?: boolean }): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      typeof window !== 'undefined' && window.isSecureContext === false
        ? 'This page is not HTTPS, so the browser will not start the camera. Open the gym link.'
        : 'This browser cannot open the camera. Allow camera access, then try again.',
    )
  }
  const portrait = opts?.portrait !== false
  const attempts: MediaStreamConstraints[] = [
    ...(portrait
      ? [
          {
            audio: false,
            video: {
              facingMode: { ideal: 'user' },
              width: { ideal: 720 },
              height: { ideal: 1280 },
              aspectRatio: { ideal: 9 / 16 },
            },
          } satisfies MediaStreamConstraints,
        ]
      : []),
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
  // iPhone MediaRecorder + MSE write sideways landscape; IosDelayUnwind
  // stands that up. iPad frames are already upright — do not unwind or
  // force 9:16 here (that zoomed live / Replay last past the other cams).
  if (portrait && !isIosDevice()) await preferPortraitTrack(stream)
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
