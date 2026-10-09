import { useRef, useState, useCallback } from 'react'

/**
 * Records the compare view without any UI buttons in the output.
 * Composites the two video elements onto a canvas and captures it,
 * optionally mixing in microphone audio for voiceover.
 */
export function useCleanRecorder() {
  const [recording, setRecording] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current
      if (!rec) {
        resolve(null)
        return
      }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' })
        chunksRef.current = []
        recorderRef.current = null
        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        micStreamRef.current?.getTracks().forEach((t) => t.stop())
        micStreamRef.current = null
        setRecording(false)
        resolve(blob)
      }
      rec.stop()
    })
  }, [])

  const start = useCallback(async (
    topVideo: HTMLVideoElement | null,
    bottomVideo: HTMLVideoElement | null,
    opts: { withMic: boolean; split?: 'tb' | 'lr'; topRatio?: number },
  ): Promise<boolean> => {
    if (recording) return false
    const top = topVideo
    const bottom = bottomVideo
    if (!top && !bottom) return false

    try {
      // Canvas sized to a reasonable output (720p-ish).
      const canvas = document.createElement('canvas')
      const W = 720
      const H = 1280
      canvas.width = W
      canvas.height = H
      canvasRef.current = canvas
      const ctx = canvas.getContext('2d')
      if (!ctx) return false

      const split = opts.split ?? 'tb'
      const ratio = opts.topRatio ?? 0.5

      const draw = () => {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, W, H)
        const drawCover = (
          video: HTMLVideoElement | null,
          dx: number, dy: number, dw: number, dh: number,
        ) => {
          if (!video || video.readyState < 2 || video.videoWidth === 0) return
          // Cover: fill the rect, cropping as needed.
          const vr = video.videoWidth / video.videoHeight
          const rr = dw / dh
          let sw: number, sh: number, sx: number, sy: number
          if (vr > rr) {
            sh = video.videoHeight
            sw = sh * rr
            sx = (video.videoWidth - sw) / 2
            sy = 0
          } else {
            sw = video.videoWidth
            sh = sw / rr
            sx = 0
            sy = (video.videoHeight - sh) / 2
          }
          ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh)
        }
        if (split === 'tb') {
          const topH = Math.round(H * ratio)
          drawCover(top, 0, 0, W, topH)
          drawCover(bottom, 0, topH, W, H - topH)
        } else {
          const leftW = Math.round(W * ratio)
          drawCover(top, 0, 0, leftW, H)
          drawCover(bottom, leftW, 0, W - leftW, H)
        }
        rafRef.current = requestAnimationFrame(draw)
      }
      draw()

      const stream = canvas.captureStream(30)

      // Optional microphone for voiceover.
      let withMic = false
      if (opts.withMic) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
          micStreamRef.current = mic
          const audioTrack = mic.getAudioTracks()[0]
          if (audioTrack) {
            stream.addTrack(audioTrack)
            withMic = true
          }
        } catch {
          // Mic denied or unavailable; record without it.
        }
      }

      const mime = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : 'video/webm'
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.start(250)
      recorderRef.current = rec
      setRecording(true)
      setMicOn(withMic)
      return true
    } catch {
      return false
    }
  }, [recording])

  return { recording, micOn, start, stop }
}
