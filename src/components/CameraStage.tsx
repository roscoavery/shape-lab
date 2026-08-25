/**
 * Draws mirrored video + skeleton overlay + optional live angle labels
 */

import { useEffect } from 'react'
import { jointAngle } from '../lib/angles'
import { LM, POSE_EDGES } from '../lib/landmarks'
import type { Landmark } from '../types'

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  landmarks: Landmark[] | null
  mirror: boolean
  showAngles: boolean
  running: boolean
}

const ANGLE_READOUTS: { label: string; points: [number, number, number]; color: string }[] = [
  { label: 'L elbow', points: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST], color: '#2dd4a8' },
  { label: 'R elbow', points: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST], color: '#2dd4a8' },
  { label: 'L shoulder', points: [LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_ELBOW], color: '#f0b429' },
  { label: 'R shoulder', points: [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW], color: '#f0b429' },
  { label: 'L hip', points: [LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE], color: '#7db7ff' },
  { label: 'R hip', points: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE], color: '#7db7ff' },
  { label: 'L knee', points: [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE], color: '#c4a5ff' },
  { label: 'R knee', points: [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE], color: '#c4a5ff' },
]

export function CameraStage({
  videoRef,
  canvasRef,
  landmarks,
  mirror,
  showAngles,
  running,
}: Props) {
  useEffect(() => {
    let raf = 0

    const draw = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.videoWidth) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.save()
          if (mirror) {
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          if (landmarks) {
            // Bones
            ctx.lineWidth = Math.max(3, canvas.width * 0.003)
            ctx.strokeStyle = 'rgba(45, 212, 168, 0.9)'
            for (const [a, b] of POSE_EDGES) {
              const A = landmarks[a]
              const B = landmarks[b]
              if (!A || !B) continue
              if ((A.visibility ?? 1) < 0.4 || (B.visibility ?? 1) < 0.4) continue
              ctx.beginPath()
              ctx.moveTo(A.x * canvas.width, A.y * canvas.height)
              ctx.lineTo(B.x * canvas.width, B.y * canvas.height)
              ctx.stroke()
            }

            // Joints
            for (const lm of landmarks) {
              if ((lm.visibility ?? 1) < 0.4) continue
              ctx.beginPath()
              ctx.fillStyle = '#ffffff'
              ctx.arc(lm.x * canvas.width, lm.y * canvas.height, Math.max(3, canvas.width * 0.005), 0, Math.PI * 2)
              ctx.fill()
            }

            if (showAngles) {
              // Draw angle text in non-mirrored space for readability
              ctx.restore()
              ctx.save()
              ctx.font = `600 ${Math.max(12, canvas.width * 0.018)}px sans-serif`
              ctx.textAlign = 'left'
              for (const readout of ANGLE_READOUTS) {
                const ang = jointAngle(landmarks, ...readout.points)
                if (ang === null) continue
                const joint = landmarks[readout.points[1]]
                if (!joint || (joint.visibility ?? 1) < 0.4) continue
                let x = joint.x * canvas.width
                let y = joint.y * canvas.height
                if (mirror) x = canvas.width - x
                ctx.fillStyle = 'rgba(0,0,0,0.55)'
                const text = `${readout.label} ${Math.round(ang)}°`
                const pad = 4
                const w = ctx.measureText(text).width
                ctx.fillRect(x + 8 - pad, y - 16 - pad, w + pad * 2, 18 + pad)
                ctx.fillStyle = readout.color
                ctx.fillText(text, x + 8, y - 4)
              }
              ctx.restore()
              raf = requestAnimationFrame(draw)
              return
            }
          }
          ctx.restore()
        }
      }
      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [videoRef, canvasRef, landmarks, mirror, showAngles, running])

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-[var(--panel-border)] bg-black shadow-lg">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="block h-auto w-full bg-[#0a0e12]" />
      {!running && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0e12]/90 p-6 text-center">
          <p className="text-lg font-semibold text-[var(--text)]">Camera is off</p>
          <p className="max-w-sm text-sm text-[var(--muted)]">
            Start the camera to begin live pose detection. Use a side view for handstands and levers.
          </p>
        </div>
      )}
    </div>
  )
}
