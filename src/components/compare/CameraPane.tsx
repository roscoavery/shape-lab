/**
 * Compare tab — athlete camera pane.
 *
 * Modes:
 *  - Live: plain camera view (getUserMedia, no pose detection).
 *  - Delay: watch yourself N seconds behind live (buffer 6–20s).
 *  - Replay: pause / play / scrub the last N seconds of that buffer, then
 *    save to this device and/or keep it in the app.
 *  - Replay: pick a recorded attempt, scrub frame-by-frame with speed control.
 *
 * Record is start/stop of the delay-cam (or live) picture — captureStream
 * of that <video>, never a second MediaRecorder on the live camera track
 * and never getDisplayMedia. Clips are saved to IndexedDB (oldest pruned).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  addClip,
  deleteClip,
  getBlob,
  getClips,
  getCollections,
  isSocialVideoItem,
  putBlob,
  putCollection,
  MAX_CLIPS,
  type RecordedClip,
  type RefCollection,
  type RefItem,
} from '../../lib/clipStore'
import { emptyDrill, saveDrill, uploadCoachMedia } from '../../lib/coachContentStore'
import { createId } from '../../lib/storage'
import { dispatchLibraryChanged } from '../../lib/libraryEvents'
import {
  createRecorder,
  extForVideoType,
  saveResultMessage,
  saveVideoToDevice,
  startRecorder,
} from '../../lib/saveMedia'
import { VideoWorkbench } from './VideoWorkbench'
import { InstagramEmbed } from './InstagramEmbed'
import { SkillCardVideoBrowser } from './SkillCardVideoBrowser'
import type { SkillCardVideoList } from '../../lib/skillCardVideos'
import { postedByFromUrl, youtubeEmbedSrc } from '../../lib/socialUrls'
import { CompareSplitBar } from './CompareSplitBar'
import { flipFocus, hudAvoidPipRightClass, pipPane, useCompareLayout } from './compareLayout'
import { DelayCamHud, LiveBufferStart } from './DelayCamHud'
import { DraggableStillOverlay } from '../DraggableStillOverlay'
import { uploadAthleteVideo } from '../../lib/athleteVideoStore'
import {
  getDelayCameraPipeline,
  pickRecorderMime,
  prepareDelayVideo,
  isIosDevice,
  isIpadDevice,
  requestUserCamera,
  cameraPermissionMessage,
} from '../../lib/delayCameraPipeline'
import { IconSwap } from './CompareHud'
import { IosDelayUnwind } from '../IosDelayUnwind'
import { extractVideoRange, extractVideoTail } from '../../lib/trimVideo'
import { ShareReference } from '../share/ShareReference'
import { clipShareDraft } from '../../lib/shareReference'
import { AddToSkillCardModal } from '../learn/CardVideoManager'

type Mode = 'live' | 'delay' | 'replay'

const DELAY_MIN = 6
const DELAY_MAX = 20
/** Extra seconds of MSE buffer kept behind the playhead before trimming. */
const TRIM_MARGIN = 8

const KIND_LABEL: Record<RefItem['kind'], string> = {
  file: 'File',
  url: 'URL',
  instagram: 'IG',
  tiktok: 'TT',
  facebook: 'FB',
}

type CameraPaneProps = {
  athleteId?: string | null
  onLibrarySaved?: () => void
  videoSource?: import('../../lib/athleteVideoStore').AthleteVideoSource
  lessonId?: string | null
  skillId?: string | null
  skillLabel?: string | null
  classId?: string | null
  className?: string | null
  onPlayAsReference?: (src: string | null, name: string, itemId?: string) => void
  /** Called with the replay <video> element (Compare playhead link). */
  onVideoElement?: (video: HTMLVideoElement | null) => void
  /** Fired when the user scrubs (for linked compare). */
  onScrub?: (oldTime: number, newTime: number) => void
  /**
   * Clips-only mode: hide the live camera UI entirely, show just the replay
   * clip player (or a pick-a-clip prompt). Used for two-clip compare.
   */
  clipsOnly?: boolean
  /** Bumps to auto-open the clip picker (start-screen View clip entry). */
  openPickerTick?: number
  /** Shapelab admin can file clips onto skill cards from the share sheet. */
  gymEditor?: boolean
  /** Coach profile id for the add-to-card modal. */
  profileId?: string | null
  /** How the video fits its panel: cover (crop) or contain (fit). */
  objectFit?: 'cover' | 'contain'
}

export function CameraPane({
  athleteId = null,
  onLibrarySaved,
  videoSource,
  lessonId = null,
  skillId = null,
  skillLabel = null,
  classId = null,
  className = null,
  onPlayAsReference,
  onVideoElement,
  onScrub,
  clipsOnly = false,
  openPickerTick = 0,
  gymEditor = false,
  profileId = null,
  objectFit,
}: CameraPaneProps) {
  const saveSource = videoSource ?? 'compare-replay'
  const liveVideoRef = useRef<HTMLVideoElement | null>(null)
  const delayVideoRef = useRef<HTMLVideoElement | null>(null)
  const iosDelay = isIosDevice()
  const cameraFit = objectFit ?? (isIpadDevice() ? 'cover' : 'contain')
  const streamRef = useRef<MediaStream | null>(null)

  // Delay engine refs
  const delaySourceBufferRef = useRef<SourceBuffer | null>(null)
  const delayMediaSourceRef = useRef<MediaSource | null>(null)
  const delayQueueRef = useRef<ArrayBuffer[]>([])
  const delayTimerRef = useRef<number>(0)
  const rollingPumpRef = useRef(0)
  const delayUrlRef = useRef<string | null>(null)
  const delaySecRef = useRef(6)
  const delayFollowRef = useRef(true)
  const { fullscreen, camRail, focus, setFocus, setAthleteReplay, pipCorner, setReplayStart, replayAfterGo } =
    useCompareLayout()

  // Fullscreen replay tap-to-toggle chrome (like the reference scroll): tap the
  // video to hide all chrome, tap again to bring it back. Reset on content change.
  const [replayChromeOpen, setReplayChromeOpen] = useState(true)

  // One MediaRecorder while the camera is on. Its complete file (header +
  // clusters) is what Replay plays. Slicing timeslices by time drops the
  // WebM header and will not play — we never do that.
  const rollingRecorderRef = useRef<MediaRecorder | null>(null)
  const rollingChunksRef = useRef<Blob[]>([])
  const rollingStartRef = useRef(0)
  const rollingMimeRef = useRef('video/webm')
  const rollingGenRef = useRef(0)
  const replayBlobRef = useRef<Blob | null>(null)
  const flushWaiterRef = useRef<((blob: Blob | null) => void) | null>(null)

  // Attempt recorder refs
  const attemptRecorderRef = useRef<MediaRecorder | null>(null)
  const attemptChunksRef = useRef<Blob[]>([])
  const attemptStartRef = useRef(0)
  const recTimerRef = useRef<number>(0)
  const viewCaptureStopRef = useRef<(() => void) | null>(null)

  const clipUrlRef = useRef<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('live')
  const [mirror, setMirror] = useState(true)
  const [delaySec, setDelaySec] = useState(12)
  const [delayBuffering, setDelayBuffering] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const [clips, setClips] = useState<RecordedClip[]>([])
  const [activeClipId, setActiveClipId] = useState<string | null>(null)
  const [clipSrc, setClipSrc] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [replayBuilding, setReplayBuilding] = useState(false)
  const librarySaving = false
  const [replayTailSec, setReplayTailSec] = useState<number | null>(null)
  const [savingPhotos, setSavingPhotos] = useState(false)
  const [replayBusy, setReplayBusy] = useState(false)
  const [addToCardItem, setAddToCardItem] = useState<{ url: string; who: string; watchFor: string } | null>(null)
  const [pickerQuery, setPickerQuery] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewCacheRef = useRef<Map<string, string>>(new Map())

  /** Close the clip picker and clear its transient search/preview state. */
  const closeClipPicker = () => {
    setClipPickerOpen(false)
    setPickerQuery('')
    setPreviewId(null)
    setPreviewUrl(null)
  }

  /** Toggle inline preview for a picker row. Loads the video URL on demand. */
  const togglePickerPreview = async (id: string, getUrl: () => Promise<string | null>) => {
    if (previewId === id) {
      setPreviewId(null)
      setPreviewUrl(null)
      return
    }
    setPreviewId(id)
    setPreviewUrl(null)
    const cached = previewCacheRef.current.get(id)
    if (cached) {
      setPreviewUrl(cached)
      return
    }
    try {
      const url = await getUrl()
      if (url) {
        previewCacheRef.current.set(id, url)
        setPreviewUrl(url)
      }
    } catch {
      // Leave the preview empty; the row still loads normally on tap.
    }
  }
  const replayWindowRef = useRef<{ start: number; end: number } | null>(null)
  const [delayTime, setDelayTime] = useState(0)
  const [delayDuration, setDelayDuration] = useState(0)
  const [camZoom, setCamZoom] = useState(1)
  const [delayHudOpen, setDelayHudOpen] = useState(true)
  const [livePeek, setLivePeek] = useState(false)
  const [clipPickerOpen, setClipPickerOpen] = useState(false)
  const [refCollections, setRefCollections] = useState<RefCollection[]>([])
  // Start-screen "View clip" entry: auto-open the picker when the tick bumps.
  useEffect(() => {
    if (openPickerTick > 0) setClipPickerOpen(true)
  }, [openPickerTick])
  // Two-clip mode has no camera: stop the stream when entering it.
  const stopCameraRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (clipsOnly && running) stopCameraRef.current()
  }, [clipsOnly, running])
  /** Reference-library item loaded into the replay slot (null for camera clips). */
  const [replayRefItem, setReplayRefItem] = useState<RefItem | null>(null)
  /**
   * Skill card whose videos are loaded in the replay slot (null otherwise).
   * Carries the card's video list so swipe navigation steps through it.
   */
  const [replaySkillCard, setReplaySkillCard] =
    useState<SkillCardVideoList | null>(null)

  // A picked reference item with a social or YouTube URL renders in its own
  // player; file and direct-URL items resolve to clipSrc like camera clips.
  const replaySocialItem =
    replayRefItem?.url && (isSocialVideoItem(replayRefItem) || youtubeEmbedSrc(replayRefItem.url))
      ? replayRefItem
      : null
  const replayVideoSrc = replaySocialItem ? null : clipSrc
  const hasReplayContent = Boolean(replayVideoSrc) || Boolean(replaySocialItem)

  // Reopen chrome when the replay content changes so a hidden-chrome state
  // never carries over to a new clip.
  useEffect(() => {
    setReplayChromeOpen(true)
  }, [replayVideoSrc, replaySocialItem?.id])

  // Share sheet for the bottom pane: offer "Add to skill card" for reference
  // items with a real URL (social/file/URL items from the library picker).
  const shareItem = replayRefItem?.url ? replayRefItem : null
  const shareDraft = shareItem?.url
    ? clipShareDraft(shareItem.name, shareItem.url, shareItem.trimStart, shareItem.trimEnd)
    : null
  const camHudCorner =
    gymEditor && shareDraft && shareItem ? (
      <ShareReference
        variant="story"
        draft={shareDraft}
        className="pointer-events-auto"
        onAddToSkillCard={() =>
          setAddToCardItem({
            url: shareItem.savedUrl || shareItem.url!,
            who: shareItem.postedBy || 'Reference library',
            watchFor: shareItem.name,
          })
        }
      />
    ) : null

  const prevFullscreenRef = useRef(false)
  useEffect(() => {
    if (fullscreen && !prevFullscreenRef.current) {
      setMode((m) => (m === 'replay' ? m : 'live'))
      setDelayHudOpen(true)
    }
    prevFullscreenRef.current = fullscreen
  }, [fullscreen])

  useEffect(() => {
    delaySecRef.current = delaySec
  }, [delaySec])

  useEffect(() => {
    if (mode !== 'delay') setLivePeek(false)
  }, [mode])

  useEffect(() => {
    if (mode !== 'delay') return
    let raf = 0
    const tick = () => {
      const v = delayVideoRef.current
      if (v) {
        setDelayTime(v.currentTime)
        if (Number.isFinite(v.duration) && v.duration > 0) setDelayDuration(v.duration)
        else if (v.buffered.length > 0) setDelayDuration(v.buffered.end(v.buffered.length - 1))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode])

  useEffect(() => {
    const on = mode === 'replay' && hasReplayContent
    setAthleteReplay(on)
    return () => setAthleteReplay(false)
  }, [mode, hasReplayContent, setAthleteReplay])

  // Replay last can sit full-screen or in the corner, same as the delay feed.
  // Do not force the athlete pane full — Swap must reach the reference still.

  const pumpDelayQueue = useCallback(() => {
    const sb = delaySourceBufferRef.current
    if (!sb || sb.updating) return
    const next = delayQueueRef.current.shift()
    if (next) {
      try {
        sb.appendBuffer(next)
      } catch {
        // QuotaExceeded or detached buffer — drop the chunk; trim will recover
      }
    }
  }, [])

  const startRolling = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    const pipeline = getDelayCameraPipeline()
    const mime = pipeline?.mime ?? pickRecorderMime()
    if (!mime) return
    const existing = rollingRecorderRef.current
    if (existing && existing.state !== 'inactive') return
    window.clearInterval(rollingPumpRef.current)
    rollingMimeRef.current = mime
    rollingChunksRef.current = []
    rollingStartRef.current = performance.now()
    rollingGenRef.current += 1
    const gen = rollingGenRef.current
    const rec = new MediaRecorder(stream, { mimeType: mime })
    rollingRecorderRef.current = rec
    rec.ondataavailable = (e) => {
      if (gen !== rollingGenRef.current) return
      if (!e.data || e.data.size === 0) return
      rollingChunksRef.current.push(e.data)
      if (delayMediaSourceRef.current) {
        void e.data.arrayBuffer().then((buf) => {
          delayQueueRef.current.push(buf)
          pumpDelayQueue()
        })
      }
    }
    rec.onstop = () => {
      const waiter = flushWaiterRef.current
      flushWaiterRef.current = null
      const parts = rollingChunksRef.current
      const blob =
        parts.length > 0
          ? new Blob(parts, { type: rec.mimeType || rollingMimeRef.current })
          : null
      if (waiter) waiter(blob && blob.size > 500 ? blob : null)
    }
    rec.start(200)
    if (pipeline?.managed) {
      rollingPumpRef.current = window.setInterval(() => {
        if (rec.state === 'recording') {
          try {
            rec.requestData()
          } catch {
            /* iOS timeslice fallback */
          }
        }
      }, 350)
    }
  }, [pumpDelayQueue])

  const stopRolling = useCallback(() => {
    window.clearInterval(rollingPumpRef.current)
    flushWaiterRef.current = null
    const rec = rollingRecorderRef.current
    rollingRecorderRef.current = null
    if (rec && rec.state !== 'inactive') {
      rec.onstop = null
      rec.stop()
    }
  }, [])

  const flushRollingBlob = useCallback((): Promise<Blob | null> => {
    const rec = rollingRecorderRef.current
    if (!rec || rec.state === 'inactive') {
      const parts = rollingChunksRef.current
      if (parts.length === 0) return Promise.resolve(null)
      return Promise.resolve(
        new Blob(parts, { type: rollingMimeRef.current || 'video/webm' }),
      )
    }
    return new Promise((resolve) => {
      let settled = false
      const done = (blob: Blob | null) => {
        if (settled) return
        settled = true
        flushWaiterRef.current = null
        resolve(blob)
      }
      flushWaiterRef.current = done
      window.setTimeout(() => {
        const parts = rollingChunksRef.current
        done(
          parts.length > 0
            ? new Blob(parts, { type: rollingMimeRef.current || 'video/webm' })
            : null,
        )
      }, 1800)
      try {
        rec.requestData()
      } catch {
        // stop() still flushes
      }
      rec.stop()
      rollingRecorderRef.current = null
    })
  }, [])

  useEffect(() => {
    void getClips().then(setClips).catch(() => {})
  }, [])

  // Fresh collection list each time the swap picker opens.
  useEffect(() => {
    if (!clipPickerOpen) return
    void getCollections().then(setRefCollections).catch(() => {})
  }, [clipPickerOpen])

  // -------------------------------------------------------------------------
  // Delay cam engine (plays the shared recorder N seconds behind live)
  // -------------------------------------------------------------------------

  const stopDelay = useCallback(() => {
    window.clearInterval(delayTimerRef.current)
    setDelayBuffering(false)
    delaySourceBufferRef.current = null
    const ms = delayMediaSourceRef.current
    if (ms && ms.readyState === 'open') {
      try {
        ms.endOfStream()
      } catch {
        // already closed
      }
    }
    delayMediaSourceRef.current = null
    delayQueueRef.current = []
    if (delayUrlRef.current) {
      URL.revokeObjectURL(delayUrlRef.current)
      delayUrlRef.current = null
    }
    const v = delayVideoRef.current
    if (v) {
      v.pause()
      v.removeAttribute('src')
      v.load()
    }
  }, [])

  const startDelay = useCallback(() => {
    const video = delayVideoRef.current
    if (!video) return
    const pipeline = getDelayCameraPipeline(rollingMimeRef.current)
    if (!pipeline) {
      setError(
        'Delay cam needs a browser that can record and play the same video codec (Safari on iPhone, Chrome or Firefox on Android, or Chrome / Edge / Firefox on a computer).',
      )
      return
    }
    setError(null)
    setDelayBuffering(true)
    prepareDelayVideo(video)

    const ms = new pipeline.Source()
    delayMediaSourceRef.current = ms
    const url = URL.createObjectURL(ms)
    delayUrlRef.current = url
    video.src = url
    rollingMimeRef.current = pipeline.mime

    ms.addEventListener('sourceopen', () => {
      if (delayMediaSourceRef.current !== ms) return
      const sb = ms.addSourceBuffer(pipeline.mime)
      delaySourceBufferRef.current = sb
      sb.addEventListener('updateend', pumpDelayQueue)
      // Replay already-captured clusters so delay can start as soon as we have N seconds.
      void Promise.all(rollingChunksRef.current.map((b) => b.arrayBuffer())).then((bufs) => {
        if (delayMediaSourceRef.current !== ms) return
        for (const buf of bufs) delayQueueRef.current.push(buf)
        pumpDelayQueue()
      })
    })

    // Keep the delayed playhead (buffered end − delay) and trim old data
    delayTimerRef.current = window.setInterval(() => {
      const sb = delaySourceBufferRef.current
      const v = delayVideoRef.current
      if (!sb || !v || sb.buffered.length === 0) return
      const start = sb.buffered.start(0)
      const end = sb.buffered.end(sb.buffered.length - 1)
      const target = end - delaySecRef.current

      if (target <= start) {
        // Not enough footage buffered yet for the requested delay
        v.pause()
        setDelayBuffering(true)
        return
      }
      setDelayBuffering(false)
      if (delayFollowRef.current && (v.paused || Math.abs(v.currentTime - target) > 0.75)) {
        v.currentTime = target
        void v.play().catch(() => {})
      }
      if (!sb.updating && start < end - (DELAY_MAX + TRIM_MARGIN)) {
        try {
          sb.remove(start, Math.max(start, end - DELAY_MAX - 2))
        } catch {
          // ignore trim races
        }
      }
    }, 400)
  }, [pumpDelayQueue])

  // Run the delay engine only while in delay mode with a live camera
  useEffect(() => {
    if (mode === 'delay' && running) {
      startDelay()
      return stopDelay
    }
    return undefined
  }, [mode, running, startDelay, stopDelay])

  // -------------------------------------------------------------------------
  // Camera start/stop
  // -------------------------------------------------------------------------

  const startCamera = async (): Promise<boolean> => {
    setError(null)
    try {
      const stream = await requestUserCamera({ portrait: true })
      streamRef.current = stream
      let video = liveVideoRef.current
      for (let i = 0; i < 40 && !video; i++) {
        await new Promise((r) => window.setTimeout(r, 50))
        video = liveVideoRef.current
      }
      if (!video) throw new Error('Camera view is not on screen. Stay on Replay cam and tap GO again.')
      prepareDelayVideo(video)
      prepareDelayVideo(delayVideoRef.current)
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        await new Promise((r) => window.setTimeout(r, 120))
        await video.play()
      }
      setRunning(true)
      startRolling()
      return true
    } catch (err) {
      setError(cameraPermissionMessage(err))
      setRunning(false)
      return false
    }
  }

  const stopRecording = useCallback(() => {
    const rec = attemptRecorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
    viewCaptureStopRef.current?.()
    viewCaptureStopRef.current = null
    window.clearInterval(recTimerRef.current)
    setRecording(false)
  }, [])

  const stopCamera = useCallback(() => {
    stopRecording()
    stopDelay()
    stopRolling()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null
    setRunning(false)
    setMode((m) => (m === 'replay' ? m : 'live'))
  }, [stopDelay, stopRecording, stopRolling])

  // Keep the ref fresh so the clipsOnly effect can stop the camera.
  useEffect(() => {
    stopCameraRef.current = stopCamera
  }, [stopCamera])

  useEffect(
    () => () => {
      stopCamera()
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // -------------------------------------------------------------------------
  // Attempt recording + replay
  // -------------------------------------------------------------------------

  const grabViewStream = (): MediaStream | null => {
    viewCaptureStopRef.current?.()
    viewCaptureStopRef.current = null
    // Record the picture on screen (delay-cam when that mode is up). Never
    // attach a second MediaRecorder to the live camera — the rolling buffer
    // already owns that track.
    const delayEl = delayVideoRef.current
    const liveEl = liveVideoRef.current
    const video = mode === 'delay' && delayEl ? delayEl : liveEl
    if (!video) return null
    const cap = video as HTMLVideoElement & {
      captureStream?: (fps?: number) => MediaStream
      mozCaptureStream?: (fps?: number) => MediaStream
    }
    const grab = cap.captureStream ?? cap.mozCaptureStream
    if (typeof grab === 'function') {
      try {
        const grabbed = grab.call(video, 30)
        if (grabbed.getVideoTracks().length > 0) return grabbed
      } catch {
        /* canvas fallback */
      }
    }
    const w = video.videoWidth || liveEl?.videoWidth || 0
    const h = video.videoHeight || liveEl?.videoHeight || 0
    if (w > 2 && h > 2) {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (ctx) {
        let live = true
        const draw = () => {
          if (!live) return
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          } catch {
            /* video not paintable this frame */
          }
          raf = requestAnimationFrame(draw)
        }
        let raf = requestAnimationFrame(draw)
        viewCaptureStopRef.current = () => {
          live = false
          cancelAnimationFrame(raf)
        }
        return canvas.captureStream(30)
      }
    }
    return null
  }

  const startRecording = () => {
    if (recording) {
      stopRecording()
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser (MediaRecorder missing).')
      return
    }
    const stream = grabViewStream()
    if (!stream) {
      setError(
        mode === 'delay'
          ? 'Wait until the delay-cam picture is up, then tap Record. That records the buffered view.'
          : 'Start the camera first, then tap Record.',
      )
      return
    }
    attemptChunksRef.current = []
    let rec: MediaRecorder
    try {
      rec = createRecorder(stream)
    } catch {
      viewCaptureStopRef.current?.()
      viewCaptureStopRef.current = null
      setError('Could not start a recording of the camera picture.')
      return
    }
    attemptRecorderRef.current = rec
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) attemptChunksRef.current.push(e.data)
    }
    rec.onstop = () => {
      viewCaptureStopRef.current?.()
      viewCaptureStopRef.current = null
      const blob = new Blob(attemptChunksRef.current, { type: rec.mimeType })
      attemptChunksRef.current = []
      if (blob.size === 0) {
        setError('That recording came out empty. Keep the delay-cam picture on, then try Record again.')
        return
      }
      const durationSec = (performance.now() - attemptStartRef.current) / 1000
      const meta: RecordedClip = {
        id: createId('clip'),
        name: `Delay cam ${Math.max(1, Math.round(durationSec))}s · ${new Date().toLocaleTimeString()}`,
        createdAt: new Date().toISOString(),
        durationSec: Number(durationSec.toFixed(1)),
        sizeBytes: blob.size,
      }
      void addClip(meta, blob)
        .then(getClips)
        .then((list) => {
          setClips(list)
          setFlash(`Saved ${meta.name}`)
          setTimeout(() => setFlash(null), 2500)
        })
        .catch(() => setError('Could not save the clip, device storage may be full.'))
      const ext = extForVideoType(blob.type)
      void saveVideoToDevice(blob, `shape-lab-delay-${Math.max(1, Math.round(durationSec))}s.${ext}`).then(
        (result) => {
          if (result === 'failed') return
          setFlash(saveResultMessage(result))
          window.setTimeout(() => setFlash(null), 4000)
        },
      )
      if (athleteId) {
        void uploadAthleteVideo({
          athleteId,
          blob,
          name: meta.name,
          source: saveSource,
          durationSec: meta.durationSec,
          lessonId,
          skillId,
          skillLabel,
          classId,
          className,
        })
          .then(() => onLibrarySaved?.())
          .catch(() => {})
      }
    }
    attemptStartRef.current = performance.now()
    try {
      startRecorder(rec, 200)
    } catch {
      viewCaptureStopRef.current?.()
      viewCaptureStopRef.current = null
      setError('Could not start a recording of the camera picture.')
      return
    }
    setError(null)
    setRecSeconds(0)
    setRecording(true)
    recTimerRef.current = window.setInterval(() => {
      setRecSeconds(Math.floor((performance.now() - attemptStartRef.current) / 1000))
    }, 500)
  }

  const openClip = async (clip: RecordedClip) => {
    setReplayRefItem(null)
    setReplaySkillCard(null)
    const blob = await getBlob(clip.id)
    if (!blob) {
      setError('Clip data not found.')
      return
    }
    replayBlobRef.current = blob
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
    const url = URL.createObjectURL(blob)
    clipUrlRef.current = url
    setClipSrc(url)
    setActiveClipId(clip.id)
    setReplayTailSec(null)
    setMode('replay')
  }

  /** Load a video picked from the device photo library into the replay slot. */
  const openPhotoLibraryVideo = (file: File) => {
    setReplayRefItem(null)
    setReplaySkillCard(null)
    replayBlobRef.current = file
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
    const url = URL.createObjectURL(file)
    clipUrlRef.current = url
    setClipSrc(url)
    setActiveClipId(null)
    setReplayTailSec(null)
    setMode('replay')
  }

  /** Load a reference-library video into the replay slot (bottom pane). */
  const openReferenceItem = async (item: RefItem) => {
    setError(null)
    setActiveClipId(null)
    setReplaySkillCard(null)
    setReplayRefItem(item)
    setReplayTailSec(null)
    replayWindowRef.current = null
    setMode('replay')
    if (item.url && (isSocialVideoItem(item) || youtubeEmbedSrc(item.url))) {
      replayBlobRef.current = null
      setClipSrc(null)
    } else if (item.kind === 'file' || !item.url) {
      const blob = await getBlob(item.id)
      if (!blob) {
        setError('Stored video not found, it may have been cleared by the browser.')
        setReplayRefItem(null)
        return
      }
      replayBlobRef.current = blob
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
      const url = URL.createObjectURL(blob)
      clipUrlRef.current = url
      setClipSrc(url)
    } else {
      const blob = await getBlob(item.id)
      replayBlobRef.current = blob
      if (blob) {
        if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
        const url = URL.createObjectURL(blob)
        clipUrlRef.current = url
        setClipSrc(url)
      } else {
        setClipSrc(item.url ?? null)
      }
    }
    setMode('replay')
  }

  /** Load a skill card video into the replay slot (bottom pane). */
  const openSkillCardVideo = async (card: SkillCardVideoList, item: RefItem) => {
    await openReferenceItem(item)
    setReplaySkillCard({ skillId: card.skillId, name: card.name, evidenceKey: card.evidenceKey, items: card.items })
  }

  /**
   * Quick vertical swipe on the bottom replay video: step to the next
   * (swipe up) or previous (swipe down) clip in the list the current clip
   * came from (saved clips, the reference library, or a skill card).
   * Stops at the ends.
   * Live buffer replays and photo-library one-offs have no list, so
   * swiping does nothing. Each pane steps independently.
   */
  const stepBottomClip = useCallback(
    (direction: 'next' | 'prev') => {
      if (mode !== 'replay') return
      const delta = direction === 'next' ? 1 : -1
      if (activeClipId) {
        const idx = clips.findIndex((c) => c.id === activeClipId)
        if (idx < 0) return
        const next = clips[idx + delta]
        if (!next) return
        void openClip(next)
        return
      }
      if (replaySkillCard && replayRefItem) {
        const idx = replaySkillCard.items.findIndex((i) => i.id === replayRefItem.id)
        if (idx >= 0) {
          const next = replaySkillCard.items[idx + delta]
          if (!next) return
          void openSkillCardVideo(replaySkillCard, next)
          return
        }
      }
      if (replayRefItem) {
        const flat = refCollections.flatMap((col) => col.items)
        const idx = flat.findIndex((i) => i.id === replayRefItem.id)
        if (idx < 0) return
        const next = flat[idx + delta]
        if (!next) return
        void openReferenceItem(next)
      }
    },
    [mode, activeClipId, clips, replaySkillCard, replayRefItem, refCollections],
  )

  const openBufferReplay = async () => {
    if (!running) {
      setMode('replay')
      return
    }
    if (replayBuilding) return
    setError(null)
    setReplayRefItem(null)
    setReplaySkillCard(null)
    setReplayBuilding(true)
    const capturedFor = (performance.now() - rollingStartRef.current) / 1000
    try {
      const blob = await flushRollingBlob()
      if (streamRef.current) startRolling()
      if (!blob || blob.size < 1500 || capturedFor < 1.2) {
        setError(
          `Keep the camera on for a couple of seconds, then tap Replay last ${delaySec}s. That opens a player of what just happened.`,
        )
        return
      }
      const tail = Math.min(delaySec, capturedFor)
      // Play the recorder file as-is. Re-encoding the tail used to make a
      // glitchy sped-up clip; VideoWorkbench jumps to the last N seconds.
      replayBlobRef.current = blob
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
      const url = URL.createObjectURL(blob)
      clipUrlRef.current = url
      setClipSrc(url)
      setActiveClipId(null)
      setReplayTailSec(tail)
      replayWindowRef.current = { start: Math.max(0, capturedFor - tail), end: capturedFor }
      setMode('replay')
      const shown = Math.max(1, Math.round(tail))
      setFlash(`Last ${shown}s of buffer, pinch to zoom, hide the bar, or save`)
      window.setTimeout(() => setFlash(null), 2500)
    } finally {
      setReplayBuilding(false)
    }
  }

  const cloneReplayBlob = (): Blob | null => {
    const blob = replayBlobRef.current
    if (!blob || blob.size < 800) return null
    return blob.slice(0, blob.size, blob.type || 'video/mp4')
  }

  const blobForReplaySave = async (): Promise<Blob | null> => {
    const raw = cloneReplayBlob()
    if (!raw) return null
    const bake = { bakeIosDelayUnwind: isIosDevice() }
    const win = replayWindowRef.current
    try {
      if (win && win.end > win.start + 0.15) {
        return await extractVideoRange(raw, win.start, win.end, bake)
      }
      const tail = replayTailSec ?? delaySec
      return await extractVideoTail(raw, tail, bake)
    } catch {
      setError('Could not cut that replay to the buffer window.')
      return null
    }
  }

  const saveReplayToApp = () => {
    void (async () => {
      setReplayBusy(true)
      const blob = await blobForReplaySave()
      if (!blob) {
        setReplayBusy(false)
        setError('Nothing to save, open a replay first.')
        return
      }
      const seconds = replayTailSec ?? delaySec
      const meta: RecordedClip = {
        id: createId('clip'),
        name: `Buffer ${seconds}s · ${new Date().toLocaleTimeString()}`,
        createdAt: new Date().toISOString(),
        durationSec: seconds,
        sizeBytes: blob.size,
      }
      void addClip(meta, blob)
        .then(getClips)
        .then((list) => {
          setClips(list)
          setActiveClipId(meta.id)
          setFlash(`Saved in the app: ${meta.name}`)
          setTimeout(() => setFlash(null), 2500)
        })
        .catch(() => setError('Could not save the clip, device storage may be full.'))
        .finally(() => setReplayBusy(false))
      if (athleteId) {
        void uploadAthleteVideo({
          athleteId,
          blob,
          name: meta.name,
          source: saveSource,
          durationSec: seconds,
          lessonId,
          skillId,
          skillLabel,
          classId,
          className,
        })
          .then(() => {
            onLibrarySaved?.()
            setFlash(`Saved to video library: ${meta.name}`)
          })
          .catch(() => {})
      }
    })()
  }

  const sendReplay = async (
    dest: 'reference' | 'drill' | 'collection',
  ) => {
    const blob = await blobForReplaySave()
    if (!blob) {
      setError('Nothing to save, open a replay first.')
      return
    }
    const name = `Replay ${new Date().toLocaleTimeString()}`
    const ownerId = athleteId || 'ath_ryan'
    setReplayBusy(true)
    setError(null)
    try {
      if (dest === 'reference') {
        const id = createId('ref')
        try {
          await putBlob(id, blob)
        } catch {
          setError('Could not keep that replay on this device, storage may be full.')
          return
        }
        const cols = await getCollections()
        const existing = cols.find((c) => c.name === 'Replay references')
        const item: RefItem = {
          id,
          kind: 'file',
          name,
          createdAt: new Date().toISOString(),
        }
        const col: RefCollection = existing
          ? { ...existing, items: [item, ...existing.items] }
          : {
              id: createId('col'),
              name: 'Replay references',
              items: [item],
              createdAt: new Date().toISOString(),
              athleteId: athleteId ?? undefined,
            }
        await putCollection(col)
        dispatchLibraryChanged()
        onPlayAsReference?.(null, name, id)
        setFlash('That replay is now the reference clip.')
      } else if (dest === 'drill') {
        let src: string | null = null
        try {
          src = await uploadCoachMedia({ ownerId, file: blob, name })
        } catch {
          src = null
        }
        if (!src) {
          const id = createId('ref')
          try {
            await putBlob(id, blob)
            src = URL.createObjectURL(blob)
          } catch {
            setError('Could not save to the drill library, the upload failed and this device is out of room.')
            return
          }
        }
        saveDrill({ ...emptyDrill(), title: name, src, notes: 'Saved from replay last view' })
        setFlash('Saved to the drill library.')
      } else {
        const id = createId('ref')
        try {
          await putBlob(id, blob)
        } catch {
          setError('Could not keep that replay on this device, storage may be full.')
          return
        }
        const cols = await getCollections()
        const folder = className?.trim() || 'Class clips'
        const existing = cols.find((c) => c.name === folder)
        const item: RefItem = {
          id,
          kind: 'file',
          name,
          createdAt: new Date().toISOString(),
        }
        const col: RefCollection = existing
          ? { ...existing, items: [item, ...existing.items] }
          : {
              id: createId('col'),
              name: folder,
              items: [item],
              createdAt: new Date().toISOString(),
              athleteId: athleteId ?? undefined,
            }
        await putCollection(col)
        dispatchLibraryChanged()
        if (athleteId) {
          try {
            await uploadAthleteVideo({
              athleteId,
              blob,
              name,
              source: saveSource,
              lessonId,
              skillId,
              skillLabel,
              classId,
              className,
            })
            onLibrarySaved?.()
          } catch {
            /* local collection still saved */
          }
        }
        setFlash(`Saved to the ${folder} collection.`)
      }
      window.setTimeout(() => setFlash(null), 3200)
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : 'Could not save that replay.'
      setError(msg)
    } finally {
      setReplayBusy(false)
    }
  }

  const downloadReplay = () => {
    void (async () => {
      setSavingPhotos(true)
      const blob = await blobForReplaySave()
      if (!blob) {
        setSavingPhotos(false)
        setError('Nothing to download, open a replay first.')
        return
      }
      const seconds = replayTailSec ?? delaySec
      const ext = extForVideoType(blob.type)
      try {
        const result = await saveVideoToDevice(blob, `shape-lab-replay-${seconds}s.${ext}`)
        if (result === 'failed') setError('Could not save that clip to this device.')
        else {
          setFlash(saveResultMessage(result))
          setTimeout(() => setFlash(null), 4000)
        }
      } finally {
        setSavingPhotos(false)
      }
    })()
  }

  const removeClip = async (id: string) => {
    await deleteClip(id)
    setClips((prev) => prev.filter((c) => c.id !== id))
    if (activeClipId === id) {
      setActiveClipId(null)
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
      clipUrlRef.current = null
      setClipSrc(null)
    }
  }

  // -------------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------------

  const rail = Boolean(fullscreen && camRail)
  const btnCls = rail
    ? 'rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/16'
    : 'rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm hover:bg-[#243040]'
  const videoXform = {
    transform: `${mirror ? 'scaleX(-1) ' : ''}scale(${camZoom})`,
    transformOrigin: 'center center',
  } as const

  const camPip = fullscreen && focus === 'ref'
  const livePip = fullscreen && !camPip && mode === 'delay' && running && !livePeek
  const livePipCorner = hudAvoidPipRightClass(fullscreen, focus, pipCorner, 'cam')

  const cameraChrome = (
    <div className={rail ? 'flex flex-col gap-1.5' : 'flex flex-wrap items-center gap-2'}>
      {!running ? (
        <button
          type="button"
          onClick={() => void startCamera()}
          className={
            rail
              ? 'rounded-lg bg-white px-2 py-1.5 text-[11px] font-semibold text-black'
              : 'rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--on-accent)]'
          }
        >
          Start camera
        </button>
      ) : (
        <button type="button" onClick={stopCamera} className={btnCls}>
          Stop camera
        </button>
      )}
      <div className={`flex gap-1 ${rail ? 'rounded-lg bg-black/30 p-0.5' : 'rounded-lg border border-[var(--panel-border)] p-0.5'}`}>
        {(
          [
            ['live', 'Live'],
            ['delay', 'Delay cam'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            disabled={!running}
            className={`rounded-md px-2 py-1 text-[11px] disabled:opacity-40 ${
              mode === id
                ? rail
                  ? 'bg-white font-semibold text-black'
                  : 'bg-[var(--accent-dim)] font-semibold text-white'
                : rail
                  ? 'text-white/70'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!running || replayBuilding}
        onClick={() => void openBufferReplay()}
        className={
          rail
            ? 'rounded-lg bg-white/15 px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40'
            : 'rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40'
        }
      >
        {replayBuilding ? 'Opening replay…' : `Replay last ${delaySec}s`}
      </button>
      <button
        type="button"
        disabled={!running || (librarySaving && !recording)}
        title="Start or stop a recording of the delay-cam picture, not a screen recording"
        onClick={() => (recording ? stopRecording() : startRecording())}
        className={
          rail
            ? 'rounded-lg bg-[var(--bad)] px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40'
            : 'rounded-lg border border-[var(--bad)]/60 px-3 py-1.5 text-sm font-semibold text-[var(--bad)] disabled:opacity-40'
        }
      >
        {librarySaving ? 'Saving…' : recording ? `Stop ${recSeconds}s` : 'Record'}
      </button>
      <label className={`flex items-center gap-1.5 ${rail ? 'text-[11px] text-white/75' : 'text-sm text-[var(--muted)]'}`}>
        <input
          type="checkbox"
          checked={mirror}
          onChange={(e) => setMirror(e.target.checked)}
        />
        Mirror
      </label>
      {running && (
        <label className={`flex items-center gap-2 ${rail ? 'text-[11px] text-white/75' : 'text-sm text-[var(--muted)]'}`}>
          Delay
          <input
            type="range"
            min={DELAY_MIN}
            max={DELAY_MAX}
            step={1}
            value={delaySec}
            onChange={(e) => setDelaySec(Number(e.target.value))}
            className="min-w-0 flex-1 accent-[var(--accent)]"
          />
          <span className="tabular-nums">{delaySec}s</span>
        </label>
      )}
      {mode === 'delay' && running && (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={Math.max(0.1, delayDuration)}
            step={0.05}
            value={Math.min(delayTime, delayDuration || delayTime)}
            onChange={(e) => {
              const t = Number(e.target.value)
              delayFollowRef.current = false
              const v = delayVideoRef.current
              if (v) {
                v.pause()
                v.currentTime = t
              }
              setDelayTime(t)
            }}
            className="min-w-0 flex-1"
            aria-label="Scrub delay cam"
          />
          <button
            type="button"
            onClick={() => {
              delayFollowRef.current = true
            }}
            className={btnCls}
          >
            Live delay
          </button>
        </div>
      )}
    </div>
  )

  return (
    <section
      className={
        fullscreen
          ? 'relative flex h-full min-h-0 flex-col overflow-hidden bg-black'
          : 'relative flex min-h-0 flex-col gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4'
      }
    >
      {!fullscreen && (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Athlete camera</h2>
          <span className="text-xs text-[var(--muted)]">live · delay cam · replay</span>
        </div>
        <CompareSplitBar where="camera" />
      </div>
      )}

      {!fullscreen && !clipsOnly && cameraChrome}
      {rail && camRail && mode === 'replay' && !clipsOnly ? createPortal(cameraChrome, camRail) : null}

      {/* Video area, live video stays mounted (even during replay) so the stream keeps running.
          Hidden entirely in clips-only (two-clip compare) mode. */}
      {!clipsOnly && (
      <div
        className={
          mode === 'replay' && clipSrc
            ? 'pointer-events-none absolute h-px w-px overflow-hidden opacity-0'
            : `relative overflow-hidden bg-black ${
                fullscreen
                  ? 'min-h-0 flex-1'
                  : 'min-h-[16rem] h-[min(60vh,32rem)] rounded-lg border border-[var(--panel-border)]'
              }`
        }
      >
        <video
          ref={liveVideoRef}
          muted
          playsInline
          disableRemotePlayback
          webkit-playsinline="true"
          style={videoXform}
          className={
            livePip
              ? `absolute bottom-3 ${livePipCorner} z-[24] h-[7.75rem] w-[5.5rem] rounded-lg border-2 border-white bg-black object-cover shadow-lg`
              : `absolute inset-0 h-full w-full ${
                  cameraFit === 'cover' ? 'object-cover' : 'object-contain'
                } ${livePeek ? '' : mode === 'delay' ? 'hidden' : ''}`
          }
        />
        <IosDelayUnwind
          active={iosDelay}
          fillFrame={cameraFit === 'cover'}
          style={videoXform}
          className={
            mode === 'delay' && !livePeek ? 'absolute inset-0 h-full w-full' : 'hidden'
          }
        >
          <video
            ref={delayVideoRef}
            muted
            playsInline
            disableRemotePlayback
            webkit-playsinline="true"
            className={`h-full w-full ${cameraFit === 'cover' ? 'object-cover' : 'object-contain'}`}
          />
        </IosDelayUnwind>
        {livePip && (
          <>
            <button
              type="button"
              className={`absolute bottom-3 ${livePipCorner} z-[26] h-[7.75rem] w-[5.5rem] rounded-lg`}
              aria-label="Open live camera to set the tripod"
              onClick={() => setLivePeek(true)}
            />
            <span className={`pointer-events-none absolute bottom-4 z-[27] rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white ${
              pipPane(fullscreen, focus) === 'ref' && pipCorner === 'br' ? 'right-[9.1rem]' : 'right-4'
            }`}>
              Live
            </span>
          </>
        )}
        {!running && mode !== 'replay' && !fullscreen && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--muted)]">
            Camera off, press Start camera
          </div>
        )}
        {mode === 'delay' && running && delayBuffering && !fullscreen && (
          <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-[var(--warn)]">
            Buffering… delayed view starts in ~{delaySec}s
          </div>
        )}
        {mode === 'delay' && running && !delayBuffering && !fullscreen && (
          <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-[var(--accent)]">
            {delaySec}s behind live
          </div>
        )}
        {mode === 'delay' && running && fullscreen && !camPip && !livePeek && (
          <DelayCamHud
            delaySec={delaySec}
            zoom={camZoom}
            buffering={delayBuffering}
            recording={recording}
            recSeconds={recSeconds}
            saving={librarySaving}
            hudOpen={delayHudOpen}
            onZoom={setCamZoom}
            onHide={() => setDelayHudOpen(false)}
            onShow={() => setDelayHudOpen(true)}
            onReplay={() => void openBufferReplay()}
            onFlip={() => setMirror((on) => !on)}
            onRecord={() => (recording ? stopRecording() : startRecording())}
            onBuffer={() => {
              setMode('live')
              setReplayStart(true)
              setFocus('cam')
            }}
            onReset={() => {
              setCamZoom(1)
              delayFollowRef.current = true
            }}
            onMinimize={() => setFocus(focus === 'split' ? 'ref' : flipFocus(focus))}
            onExit={() => {
              setCamZoom(1)
              setMode('live')
              setReplayStart(true)
              setFocus('cam')
            }}
          />
        )}
        {mode === 'live' && fullscreen && !camPip && (
          <LiveBufferStart
            running={running}
            delaySec={delaySec}
            min={DELAY_MIN}
            max={DELAY_MAX}
            error={error}
            onDelaySec={setDelaySec}
            onGo={() => {
              void (async () => {
                if (!running) {
                  const ok = await startCamera()
                  if (!ok) return
                }
                setDelayHudOpen(true)
                setMode('delay')
                setReplayStart(false)
                setFocus(replayAfterGo === 'cam' ? 'cam' : 'split')
              })()
            }}
          />
        )}
        {livePeek && (
          <button
            type="button"
            className="absolute inset-0 z-[50] flex items-center justify-center bg-black/20"
            aria-label="Close live view"
            onClick={() => setLivePeek(false)}
          >
            <span className="rounded-full bg-black/55 px-4 py-2 text-base font-medium tracking-wide text-white shadow-lg">
              Tap to close
            </span>
          </button>
        )}
        {mode === 'delay' && running && !fullscreen && (
          <button
            type="button"
            disabled={librarySaving && !recording}
            title="Start or stop a recording of the delay-cam picture"
            onClick={() => (recording ? stopRecording() : startRecording())}
            className="absolute bottom-3 right-3 z-[15] rounded-full bg-[var(--bad)] px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
          >
            {librarySaving ? 'Saving…' : recording ? `Stop ${recSeconds}s` : 'Record'}
          </button>
        )}
        {recording && (
          <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded bg-black/70 px-2 py-1 text-xs text-[var(--bad)]">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--bad)]" />
            REC {recSeconds}s
          </div>
        )}
        {mode !== 'replay' && !fullscreen && <DraggableStillOverlay />}
      </div>
      )}

      {/* Replay of the last N seconds, a saved attempt, or a reference video.
          In clips-only mode this is the whole pane: no camera, just the clip. */}
      {(mode === 'replay' || clipsOnly) &&
        (hasReplayContent ? (
          <div
            className={`relative flex min-h-0 flex-col overflow-hidden ${
              fullscreen ? 'h-full flex-1' : 'min-h-[16rem] h-[min(60vh,32rem)] rounded-lg'
            }`}
          >
            {fullscreen && (
              <button
                type="button"
                onClick={() => setClipPickerOpen(true)}
                className="absolute right-2 top-[4.75rem] z-[40] flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Swap the replay clip"
                title="Swap the replay clip"
              >
                <IconSwap />
              </button>
            )}
            {replaySocialItem ? (
              isSocialVideoItem(replaySocialItem) ? (
                <InstagramEmbed
                  url={replaySocialItem.url!}
                  itemId={replaySocialItem.id}
                  savedUrl={replaySocialItem.savedUrl}
                  postedBy={replaySocialItem.postedBy || postedByFromUrl(replaySocialItem.url!)}
                  fill
                  fit={cameraFit}
                  markup
                  hudCorner={camHudCorner}
                  onVideoElement={onVideoElement}
              onScrub={onScrub}
                  onSwipeVertical={stepBottomClip}
                  tapTogglesChrome={fullscreen}
                  chromeOpen={fullscreen ? replayChromeOpen : undefined}
                  onToggleChrome={fullscreen ? () => setReplayChromeOpen((v) => !v) : undefined}
                />
              ) : (
                <div className="relative h-full w-full bg-black">
                  <iframe
                    title={replaySocialItem.name}
                    src={youtubeEmbedSrc(replaySocialItem.url!) ?? undefined}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full"
                  />
                  {!clipsOnly && (
                  <button
                    type="button"
                    onClick={() => setMode(running ? 'delay' : 'live')}
                    className="absolute left-2 top-2 z-[40] rounded-full bg-black/60 px-3 py-2 text-xs font-bold text-white hover:bg-black/80"
                    aria-label="Back to camera"
                  >
                    ← Back
                  </button>
                  )}
                </div>
              )
            ) : (
            <VideoWorkbench
              src={replayVideoSrc!}
              mirror={mirror}
              flipActive={mirror}
              onFlip={() => setMirror((m) => !m)}
              autoPlay
              tailSeconds={replayTailSec ?? undefined}
              fill
              objectFit={cameraFit}
              overlayChrome
              replayChrome={!camPip}
              pinchZoom={!camPip}
              markup={!camPip}
              bare={camPip}
              showStillOverlay={!fullscreen}
              savingPhotos={savingPhotos}
              onWindowChange={(start, end) => {
                replayWindowRef.current = { start, end }
              }}
              onBack={clipsOnly ? undefined : () => setMode(running ? 'delay' : 'live')}
              onSavePhotos={downloadReplay}
              onSaveInApp={saveReplayToApp}
              onMinimize={() => setFocus(flipFocus(focus))}
              libraryBusy={replayBusy}
              libraryNotice={flash}
              libraryError={error}
              onUseAsReference={() => void sendReplay('reference')}
              onSaveToDrill={() => void sendReplay('drill')}
              onSaveToCollection={() => void sendReplay('collection')}
              hudCorner={camHudCorner}
              onVideoElement={onVideoElement}
              onScrub={onScrub}
              onSwipeVertical={stepBottomClip}
              tapTogglesChrome={fullscreen}
              chromeOpen={fullscreen ? replayChromeOpen : undefined}
              onToggleChrome={fullscreen ? () => setReplayChromeOpen((v) => !v) : undefined}
            />
            )}
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--panel-border)] text-sm text-[var(--muted)]">
            {clipsOnly ? (
              <>
                <span>No clip loaded yet</span>
                <button
                  type="button"
                  onClick={() => setClipPickerOpen(true)}
                  className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--on-accent)]"
                >
                  🎞 Pick a video
                </button>
              </>
            ) : (
              <span>
                {clips.length
                  ? 'Pick a saved clip below, or start the camera and tap Replay last Ns'
                  : 'Start the camera, wait a couple of seconds, then tap Replay last Ns'}
              </span>
            )}
          </div>
        ))}

      {/* Record controls */}
      {!fullscreen && (
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={!running}
            className="rounded-lg border border-[var(--bad)]/60 px-3 py-1.5 text-sm font-semibold text-[var(--bad)] hover:bg-[#2a1518] disabled:opacity-40"
          >
            ● Record attempt
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-lg bg-[var(--bad)] px-3 py-1.5 text-sm font-semibold text-[#2a1518]"
          >
            ■ Stop &amp; save
          </button>
        )}
        <span className="text-xs text-[var(--muted)]">
          Replay last {delaySec}s of buffer (6–20s) · last {MAX_CLIPS} saved clips kept
          in the app
        </span>
      </div>
      )}

      {flash && (
        <p className="rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          {flash}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      )}

      {/* Clip list */}
      {!fullscreen && clips.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-[var(--muted)]">Recorded attempts</h3>
          <ul className="flex max-h-36 flex-col gap-1 overflow-y-auto panel-scroll">
            {clips.map((clip) => (
              <li key={clip.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void openClip(clip)}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                    activeClipId === clip.id
                      ? 'bg-[var(--accent-dim)]/30 text-[var(--text)]'
                      : 'text-[var(--muted)] hover:bg-[#243040] hover:text-[var(--text)]'
                  }`}
                >
                  <span className="truncate">{clip.name}</span>
                  <span className="ml-auto shrink-0 text-xs">
                    {clip.durationSec != null ? `${clip.durationSec}s · ` : ''}
                    {(clip.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void removeClip(clip.id)}
                  className="rounded px-1.5 text-xs text-[var(--muted)] hover:text-[var(--bad)]"
                  title="Delete clip"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {camPip && (
        <>
          {running && mode === 'delay' && (
            <button
              type="button"
              className="absolute bottom-1.5 right-1.5 z-[61] rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-black shadow"
              aria-label="Open live camera to set the tripod"
              onClick={(e) => {
                e.stopPropagation()
                setFocus('cam')
                setLivePeek(true)
              }}
            >
              Live
            </button>
          )}
          <span className="pointer-events-none absolute left-1.5 top-1.5 z-[61] rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
            {mode === 'replay' ? 'Replay' : mode === 'live' ? 'Live' : 'Delay'}
          </span>
        </>
      )}
      {clipPickerOpen &&
        (() => {
          const q = pickerQuery.trim().toLowerCase()
          const matchesQ = (...texts: Array<string | null | undefined>) =>
            !q || texts.some((t) => (t ?? '').toLowerCase().includes(q))
          const filteredClips = clips.filter((c) => matchesQ(c.name))
          const filteredCols = refCollections
            .map((col) => ({
              ...col,
              items: col.items.filter((item) =>
                matchesQ(item.name, item.postedBy, item.url ? postedByFromUrl(item.url) : null),
              ),
            }))
            .filter((c) => c.items.length > 0)
          return (
        <div
          className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 sm:items-center"
          onClick={() => closeClipPicker()}
          role="dialog"
          aria-label="Pick a replay clip"
        >
          <div
            className="max-h-[70dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-[#141a22] p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Replay clip</h3>
              <button
                type="button"
                onClick={() => closeClipPicker()}
                className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Done
              </button>
            </div>
            <p className="mb-3 text-xs text-white/60">
              Swap the bottom pane to any saved clip or reference video. Pick nothing to keep the live replay.
            </p>
            <div className="mb-3">
              <input
                type="search"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Search clips and references"
                aria-label="Search clips and references"
                className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            {running && (
              <button
                type="button"
                onClick={() => {
                  closeClipPicker()
                  setClipSrc(null)
                  setActiveClipId(null)
                  setReplayRefItem(null)
                  setReplayTailSec(null)
                  void openBufferReplay()
                }}
                className="mb-2 flex w-full items-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2.5 text-left text-sm font-semibold text-white"
              >
                <span aria-hidden>📹</span>
                <span>Live replay — last {delaySec}s of buffer</span>
              </button>
            )}
            {filteredClips.length === 0 ? (
              <p className="rounded-xl bg-white/5 px-3 py-4 text-center text-sm text-white/50">
                {q ? 'No clips match your search.' : 'No saved clips yet. Record an attempt and it shows up here.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {filteredClips.map((clip) => {
                  const pid = `clip:${clip.id}`
                  const previewing = previewId === pid
                  return (
                    <li key={clip.id}>
                      <div
                        className={`rounded-xl ${
                          activeClipId === clip.id
                            ? 'bg-[var(--accent)]/20'
                            : 'bg-white/5'
                        }`}
                      >
                        <div className="flex w-full items-center gap-2 px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              closeClipPicker()
                              void openClip(clip)
                            }}
                            className={`flex min-w-0 flex-1 items-center gap-2 text-left text-sm ${
                              activeClipId === clip.id
                                ? 'font-semibold text-white'
                                : 'text-white/80'
                            }`}
                          >
                            <span aria-hidden>🎞</span>
                            <span className="min-w-0 flex-1 truncate">{clip.name}</span>
                            <span className="shrink-0 text-xs text-white/50">
                              {clip.durationSec != null ? `${clip.durationSec}s` : ''}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void togglePickerPreview(pid, async () => {
                                const blob = await getBlob(clip.id)
                                return blob ? URL.createObjectURL(blob) : null
                              })
                            }
                            aria-label={previewing ? 'Hide preview' : `Preview ${clip.name}`}
                            title={previewing ? 'Hide preview' : 'Preview'}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm text-white hover:bg-white/20"
                          >
                            <span aria-hidden>{previewing ? '▾' : '▸'}</span>
                          </button>
                        </div>
                        {previewing && (
                          <div className="px-3 pb-3">
                            {previewUrl ? (
                              <video
                                src={previewUrl}
                                controls
                                playsInline
                                preload="metadata"
                                className="aspect-video w-full rounded-lg bg-black"
                              />
                            ) : (
                              <p className="py-4 text-center text-xs text-white/50">Loading preview…</p>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="mt-4 border-t border-white/10 pt-3">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                Reference library
              </h4>
              {filteredCols.every((c) => c.items.length === 0) ? (
                <p className="rounded-xl bg-white/5 px-3 py-3 text-center text-sm text-white/50">
                  {q ? 'No reference videos match your search.' : 'No reference videos saved yet.'}
                </p>
              ) : (
                filteredCols
                  .filter((c) => c.items.length > 0)
                  .map((col) => (
                    <div key={col.id} className="mb-3">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                        {col.name}
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {col.items.map((item) => {
                          const pid = `ref:${item.id}`
                          const previewing = previewId === pid
                          const previewSrc =
                            item.savedUrl || (item.kind === 'file' || item.kind === 'url' ? item.url : null)
                          return (
                            <li key={item.id}>
                              <div className="rounded-xl bg-white/5">
                                <div className="flex w-full items-center gap-2 px-3 py-2.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      closeClipPicker()
                                      void openReferenceItem(item)
                                    }}
                                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-white/80"
                                  >
                                    <span className="shrink-0 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                                      {KIND_LABEL[item.kind]}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate">{item.name}</span>
                                      {(item.postedBy || (item.url && postedByFromUrl(item.url))) && (
                                        <span className="block truncate text-[10px] text-white/45">
                                          @{item.postedBy || postedByFromUrl(item.url!)}
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                  {previewSrc ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void togglePickerPreview(pid, async () => previewSrc)
                                      }
                                      aria-label={previewing ? 'Hide preview' : `Preview ${item.name}`}
                                      title={previewing ? 'Hide preview' : 'Preview'}
                                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm text-white hover:bg-white/20"
                                    >
                                      <span aria-hidden>{previewing ? '▾' : '▸'}</span>
                                    </button>
                                  ) : null}
                                </div>
                                {previewing && (
                                  <div className="px-3 pb-3">
                                    {previewUrl ? (
                                      <video
                                        src={previewUrl}
                                        controls
                                        playsInline
                                        preload="metadata"
                                        className="aspect-video w-full rounded-lg bg-black"
                                      />
                                    ) : (
                                      <p className="py-4 text-center text-xs text-white/50">Loading preview…</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))
              )}
            </div>
            <div className="mt-4 border-t border-white/10 pt-3">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                Skill cards
              </h4>
              <SkillCardVideoBrowser
                activeItemId={replayRefItem?.id ?? null}
                onPick={(item, card) => {
                  closeClipPicker()
                  void openSkillCardVideo(card, item)
                }}
              />
            </div>
            <div className="mt-4 border-t border-white/10 pt-3">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                Photo library
              </h4>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10"
              >
                <span aria-hidden>🖼</span>
                <span className="min-w-0 flex-1 truncate">Pick a video from this device</span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    closeClipPicker()
                    openPhotoLibraryVideo(file)
                  }
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        </div>
          )
        })()}
      {addToCardItem && (
        <AddToSkillCardModal
          video={addToCardItem}
          coachId={profileId}
          isAdmin={gymEditor}
          onClose={() => setAddToCardItem(null)}
        />
      )}
    </section>
  )
}
