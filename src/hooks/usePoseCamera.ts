/**
 * Camera + MediaPipe pose loop
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { getPoseLandmarker, resultToLandmarks } from '../lib/pose'
import { hintMotion } from '../lib/saveMedia'
import { cameraPermissionMessage, isAndroid, requestUserCamera } from '../lib/delayCameraPipeline'
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

  const [ready, setReady] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null)
  const [fps, setFps] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const startLockRef = useRef<Promise<void> | null>(null)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
    if (videoRef.current) videoRef.current.srcObject = null
    setRunning(false)
    setLandmarks(null)
  }, [])

  const loop = useCallback(async () => {
    const video = videoRef.current
    if (!video) {
      // Stage unmounted (user left Tasks/Coach) — do not spin rAF.
      return
    }
    if (video.readyState < 2) {
      rafRef.current = requestAnimationFrame(() => {
        void loop()
      })
      return
    }

    try {
      const landmarker = await getPoseLandmarker()
      const now = performance.now()
      const minGap = isAndroid() ? 50 : 0
      if (now - lastTsRef.current >= minGap) {
        const result = landmarker.detectForVideo(video, now)
        lastTsRef.current = now
        setLandmarks(resultToLandmarks(result))
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
    }

    rafRef.current = requestAnimationFrame(() => {
      void loop()
    })
  }, [])

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
        // getUserMedia must be the first await after the tap on iPad Safari.
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
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          void loop()
        })
        try {
          await getPoseLandmarker()
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
