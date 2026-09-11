/**
 * Camera + MediaPipe pose loop.
 * One in-flight detect at a time. AthleteTracker owns subject lock.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { hintMotion } from '../lib/saveMedia'
import { cameraPermissionMessage, isAndroid, requestUserCamera } from '../lib/delayCameraPipeline'
import { AthleteTracker, loadPoseQuality } from '../lib/athleteTrack'
import { BackgroundMotion } from '../lib/poseSubject'
import type { Landmark } from '../types'

export type PoseCameraState = {
  ready: boolean
  error: string | null
  landmarks: Landmark[] | null
  fps: number
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  start: () => Promise<void>
  stop: () => void
  running: boolean
  stream: MediaStream | null
}

export function usePoseCamera(): PoseCameraState {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const lastTsRef = useRef<number>(0)
  const fpsCountRef = useRef({ frames: 0, last: performance.now() })
  const loopGenRef = useRef(0)
  const busyRef = useRef(false)
  const lastPublishRef = useRef(0)
  const lastLmKeyRef = useRef('')

  const [ready, setReady] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null)
  const [fps, setFps] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const startLockRef = useRef<Promise<void> | null>(null)
  const trackerRef = useRef<AthleteTracker | null>(null)
  const motionRef = useRef<BackgroundMotion | null>(null)

  const stop = useCallback(() => {
    loopGenRef.current += 1
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    busyRef.current = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
    if (videoRef.current) videoRef.current.srcObject = null
    setRunning(false)
    setLandmarks(null)
    trackerRef.current?.reset()
    motionRef.current?.reset()
  }, [])

  const publish = useCallback((lm: Landmark[] | null, now: number) => {
    const key = lm
      ? lm
          .slice(11, 29)
          .map((p) => `${(p.x * 80) | 0},${(p.y * 80) | 0},${((p.visibility ?? 1) * 4) | 0}`)
          .join(';')
      : ''
    if (key === lastLmKeyRef.current && now - lastPublishRef.current < 80) return
    lastLmKeyRef.current = key
    lastPublishRef.current = now
    setLandmarks(lm)
  }, [])

  const loop = useCallback(() => {
    const gen = loopGenRef.current
    const video = videoRef.current
    if (!video) return
    if (busyRef.current) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }
    if (video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }

    busyRef.current = true
    void (async () => {
      try {
        const quality = loadPoseQuality()
        const { getPoseLandmarker, resultToMultipleLandmarks, detectPosesForVideo, activePoseModelLabel } =
          await import('../lib/pose')
        if (gen !== loopGenRef.current) return
        const landmarker = await getPoseLandmarker(quality)
        if (gen !== loopGenRef.current) return
        const now = performance.now()
        const minGap = isAndroid() ? 50 : 16
        if (now - lastTsRef.current >= minGap) {
          const t0 = performance.now()
          const result = detectPosesForVideo(landmarker, video, now)
          const inferMs = performance.now() - t0
          lastTsRef.current = now
          if (!trackerRef.current) trackerRef.current = new AthleteTracker()
          if (!motionRef.current) motionRef.current = new BackgroundMotion()
          trackerRef.current.setMeta(quality, activePoseModelLabel(), inferMs)
          motionRef.current.sample(video, now)
          const frame = trackerRef.current.push(
            resultToMultipleLandmarks(result),
            now,
            motionRef.current,
          )
          publish(frame.stabilized, now)
        }

        const fc = fpsCountRef.current
        fc.frames += 1
        if (now - fc.last >= 1000) {
          setFps(fc.frames)
          fc.frames = 0
          fc.last = now
        }
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Pose detection failed')
      } finally {
        busyRef.current = false
        if (gen === loopGenRef.current) {
          rafRef.current = requestAnimationFrame(loop)
        }
      }
    })()
  }, [publish])

  const start = useCallback(async () => {
    if (streamRef.current && videoRef.current?.srcObject === streamRef.current) {
      setRunning(true)
      setError(null)
      return
    }
    if (startLockRef.current) return startLockRef.current

    const run = (async () => {
      setError(null)
      try {
        const media = await requestUserCamera()
        streamRef.current = media
        setStream(media)
        hintMotion(media)

        let video = videoRef.current
        for (let i = 0; i < 40 && !video; i++) {
          await new Promise((r) => window.setTimeout(r, 50))
          video = videoRef.current
        }
        if (!video) {
          throw new Error('Camera view is not on screen. Stay on Tasks 2 and tap Start again.')
        }
        video.setAttribute('playsinline', 'true')
        video.setAttribute('webkit-playsinline', 'true')
        video.muted = true
        video.srcObject = media
        try {
          await video.play()
        } catch {
          await new Promise((r) => window.setTimeout(r, 120))
          await video.play()
        }
        setRunning(true)
        loopGenRef.current += 1
        cancelAnimationFrame(rafRef.current)
        busyRef.current = false
        trackerRef.current?.reset()
        rafRef.current = requestAnimationFrame(loop)
        try {
          const { getPoseLandmarker } = await import('../lib/pose')
          await getPoseLandmarker(loadPoseQuality())
          setReady(true)
        } catch (err) {
          console.warn(err)
          setError(
            err instanceof Error
              ? err.message
              : 'Camera is on, but pose scoring could not load. Try again on a stronger connection.',
          )
        }
      } catch (err) {
        setError(cameraPermissionMessage(err))
        setRunning(false)
        throw err instanceof Error ? err : new Error(cameraPermissionMessage(err))
      } finally {
        startLockRef.current = null
      }
    })()
    startLockRef.current = run
    return run
  }, [loop])

  useEffect(() => () => stop(), [stop])

  return {
    ready,
    error,
    landmarks,
    fps,
    videoRef,
    canvasRef,
    start,
    stop,
    running,
    stream,
  }
}
