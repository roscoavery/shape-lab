/**
 * Camera + MediaPipe pose loop
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { getPoseLandmarker, resultToLandmarks } from '../lib/pose'
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

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
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
      if (now > lastTsRef.current) {
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
    setError(null)
    try {
      // Warm up the model first so the first frames aren't stalled
      await getPoseLandmarker()
      setReady(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) throw new Error('Video element missing')
      video.srcObject = stream
      await video.play()
      setRunning(true)
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        void loop()
      })
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not access camera. Allow camera permission and use HTTPS or localhost.'
      setError(msg)
      setRunning(false)
    }
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
  }
}
