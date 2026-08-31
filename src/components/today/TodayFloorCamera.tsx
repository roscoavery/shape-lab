import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { jointAngle, VISIBILITY_DRAW } from '../../lib/angles'
import { classifyPoses, personAnchor, type DetectedPerson } from '../../lib/detectShapes'
import { listCoachOverlayStills } from '../../lib/igStills'
import { LM, POSE_EDGES } from '../../lib/landmarks'
import { lessonScoreShapes } from '../../lib/lessonShapes'
import { getFloorPoseLandmarker, resultToMultipleLandmarks } from '../../lib/pose'
import { scoreShape } from '../../lib/scoring'
import type { Landmark, ReferencePhoto, ScoreResult, ShapeDef } from '../../types'
import { useOverlayStill } from '../OverlayStillContext'
import { ReferenceStill } from '../ReferenceStill'

type Props = {
  mirror: boolean
  showJointAngles: boolean
  onShowJointAnglesChange: (show: boolean) => void
  referencePhotos: ReferencePhoto[]
  onOpenCompareWithReference: () => void
}

const MATCH_SHAPES = lessonScoreShapes()

const ANGLES: { label: string; points: [number, number, number] }[] = [
  { label: 'L elbow', points: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST] },
  { label: 'R elbow', points: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST] },
  { label: 'L hip', points: [LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE] },
  { label: 'R hip', points: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE] },
  { label: 'L knee', points: [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE] },
  { label: 'R knee', points: [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE] },
]

function visible(point: Landmark | undefined) {
  return Boolean(point && (point.visibility ?? 1) >= VISIBILITY_DRAW)
}

function primaryPose(poses: Landmark[][]): Landmark[] | null {
  let best: { pose: Landmark[]; area: number } | null = null
  for (const pose of poses) {
    const visibleBody = pose
      .slice(LM.LEFT_SHOULDER)
      .filter((point) => (point.visibility ?? 1) >= VISIBILITY_DRAW)
    if (visibleBody.length === 0) continue
    const xs = visibleBody.map((point) => point.x)
    const ys = visibleBody.map((point) => point.y)
    const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))
    if (!best || area > best.area) best = { pose, area }
  }
  return best?.pose ?? null
}

function drawFloorOverlay(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  people: DetectedPerson[],
  mirror: boolean,
  showJointAngles: boolean,
) {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  const x = (value: number) => (mirror ? 1 - value : value) * width
  const y = (value: number) => value * height

  for (const person of people) {
    const landmarks = person.landmarks
    if (showJointAngles) {
      ctx.lineWidth = Math.max(2, width / 480)
      ctx.strokeStyle = 'rgba(45, 212, 168, 0.9)'
      for (const [a, b] of POSE_EDGES) {
        const from = landmarks[a]
        const to = landmarks[b]
        if (!visible(from) || !visible(to)) continue
        ctx.beginPath()
        ctx.moveTo(x(from.x), y(from.y))
        ctx.lineTo(x(to.x), y(to.y))
        ctx.stroke()
      }

      ctx.fillStyle = '#ffffff'
      for (let i = LM.LEFT_SHOULDER; i < landmarks.length; i += 1) {
        const point = landmarks[i]
        if (!visible(point)) continue
        ctx.beginPath()
        ctx.arc(x(point.x), y(point.y), Math.max(2, width / 320), 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.font = `${Math.max(10, Math.round(width / 90))}px system-ui`
      for (const angle of ANGLES) {
        const value = jointAngle(landmarks, ...angle.points)
        const joint = landmarks[angle.points[1]]
        if (value == null || !visible(joint)) continue
        const text = `${angle.label} ${Math.round(value)}°`
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)'
        ctx.fillRect(x(joint.x) + 5, y(joint.y) - 15, ctx.measureText(text).width + 8, 18)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(text, x(joint.x) + 9, y(joint.y) - 2)
      }
    }

    if (!person.headline) continue
    const anchor = personAnchor(landmarks)
    const label = person.headline
    ctx.font = `600 ${Math.max(13, Math.round(width / 65))}px system-ui`
    const labelWidth = ctx.measureText(label).width + 18
    const labelX = Math.min(width - labelWidth - 6, Math.max(6, x(anchor.x) - labelWidth / 2))
    const labelY = Math.min(height - 34, Math.max(8, y(anchor.y) - 28))
    ctx.fillStyle = person.confident ? 'rgba(15, 118, 90, 0.9)' : 'rgba(15, 23, 42, 0.86)'
    ctx.fillRect(labelX, labelY, labelWidth, 28)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, labelX + 9, labelY + 19)
  }
}

export function TodayFloorCamera({
  mirror,
  showJointAngles,
  onShowJointAnglesChange,
  referencePhotos,
  onOpenCompareWithReference,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef(0)
  const startingRef = useRef(false)
  const showAnglesRef = useRef(showJointAngles)
  const mirrorRef = useRef(mirror)
  const selectedShapeRef = useRef<ShapeDef>(MATCH_SHAPES[0]!)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<DetectedPerson[]>([])
  const [selectedShapeId, setSelectedShapeId] = useState(
    MATCH_SHAPES[0]?.id ?? 'handstand',
  )
  const [matchScore, setMatchScore] = useState<ScoreResult | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const overlay = useOverlayStill()
  const selectedShape =
    MATCH_SHAPES.find((shape) => shape.id === selectedShapeId) ?? MATCH_SHAPES[0]!
  const coachStills = useMemo(
    () => listCoachOverlayStills(referencePhotos),
    [referencePhotos],
  )

  useEffect(() => {
    showAnglesRef.current = showJointAngles
    mirrorRef.current = mirror
    selectedShapeRef.current = selectedShape
  }, [showJointAngles, mirror, selectedShape])

  useEffect(() => {
    if (!fullscreen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setRunning(false)
    setPeople([])
    setMatchScore(null)
  }, [])

  useEffect(() => () => stop(), [stop])

  const start = async () => {
    if (startingRef.current || streamRef.current) return
    startingRef.current = true
    setError(null)
    try {
      // Keep this request local to Today. Compare never receives this stream.
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
      if (!video) throw new Error('Today floor-camera preview is unavailable.')
      video.srcObject = stream
      await video.play()
      const landmarker = await getFloorPoseLandmarker()
      setRunning(true)
      let lastDetection = 0

      const loop = () => {
        const now = performance.now()
        const target = videoRef.current
        const canvas = canvasRef.current
        if (target && canvas && target.readyState >= 2 && now - lastDetection >= 110) {
          lastDetection = now
          try {
            const poses = resultToMultipleLandmarks(landmarker.detectForVideo(target, now))
            const hits = classifyPoses(poses)
            const primary = primaryPose(poses)
            setPeople(hits)
            setMatchScore(
              primary
                ? scoreShape(primary, selectedShapeRef.current, null, {
                    stance: 'auto',
                    profileOk: true,
                  })
                : null,
            )
            drawFloorOverlay(
              canvas,
              target.videoWidth,
              target.videoHeight,
              hits,
              mirrorRef.current,
              showAnglesRef.current,
            )
          } catch (err) {
            console.error('Today floor detection failed', err)
          }
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch (err) {
      stop()
      setError(
        err instanceof Error
          ? err.message
          : 'Could not open the Today camera. Allow permission and try again.',
      )
    } finally {
      startingRef.current = false
    }
  }

  const nextShape = () => {
    const index = MATCH_SHAPES.findIndex((shape) => shape.id === selectedShape.id)
    const next = MATCH_SHAPES[(index + 1) % MATCH_SHAPES.length]
    if (next) setSelectedShapeId(next.id)
  }

  const previousShape = () => {
    const index = MATCH_SHAPES.findIndex((shape) => shape.id === selectedShape.id)
    const previous = MATCH_SHAPES[(index - 1 + MATCH_SHAPES.length) % MATCH_SHAPES.length]
    if (previous) setSelectedShapeId(previous.id)
  }

  const openCompareWithReference = () => {
    const still = coachStills.find((item) => item.shapeId === selectedShape.id) ?? null
    overlay.setSelected(still)
    if (still) {
      overlay.setOpacity(0.8)
      overlay.setScale(0.28)
      overlay.setOffset(82, 18)
    }
    setFullscreen(false)
    stop()
    onOpenCompareWithReference()
  }

  const scoreValue = matchScore?.overall ?? null
  const scoreColor =
    scoreValue == null
      ? 'text-white/55'
      : scoreValue >= 85
        ? 'text-[var(--good)]'
        : scoreValue >= 70
          ? 'text-[var(--accent)]'
          : scoreValue >= 50
            ? 'text-[var(--warn)]'
            : 'text-[var(--bad)]'

  return (
    <section
      className={
        fullscreen
          ? 'fixed inset-0 z-[300] flex h-[100dvh] flex-col overflow-hidden bg-black p-3 sm:p-4'
          : 'rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Today floor camera
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">Automatic shape labels</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Tracks up to four people. This camera is separate from Videos / Compare.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!running ? (
            <button
              type="button"
              onClick={() => void start()}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-black"
            >
              Start floor camera
            </button>
          ) : (
            <button
              type="button"
              onClick={stop}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
            >
              Stop floor camera
            </button>
          )}
          <button
            type="button"
            onClick={() => setFullscreen((open) => !open)}
            className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
          >
            {fullscreen ? 'Exit full screen' : 'Full screen'}
          </button>
        </div>
      </div>

      <div className="mt-3 grid shrink-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="text-xs text-[var(--muted)]">
          Match this shape
          <select
            value={selectedShape.id}
            onChange={(event) => setSelectedShapeId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
          >
            {MATCH_SHAPES.map((shape) => (
              <option key={shape.id} value={shape.id}>
                {shape.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={previousShape}
          className="self-end rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-[var(--text)]"
        >
          Previous Shape
        </button>
        <button
          type="button"
          onClick={nextShape}
          className="self-end rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          Next Shape
        </button>
      </div>

      <div
        className={`relative mt-3 overflow-hidden rounded-xl bg-black ${
          fullscreen ? 'min-h-0 flex-1' : 'aspect-video'
        }`}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          className={`h-full w-full object-contain ${mirror ? '-scale-x-100' : ''}`}
        />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute right-2 top-2 z-10 w-[min(34%,12rem)] overflow-hidden rounded-lg border border-white/30 bg-black/75 shadow-lg">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/75">
            Coach still · {selectedShape.name}
          </p>
          <ReferenceStill
            shapeId={selectedShape.id}
            photos={referencePhotos}
            alt={selectedShape.name}
            className="max-h-36 w-full object-contain"
            emptyLabel={`No coach still for ${selectedShape.name}`}
          />
        </div>
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[70%] rounded-xl bg-black/75 px-3 py-2 text-white shadow-lg">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">
            Live match · {selectedShape.name}
          </p>
          <p className={`text-3xl font-black tabular-nums ${scoreColor}`}>
            {scoreValue == null ? '—' : Math.round(scoreValue)}
          </p>
          {matchScore?.mainCorrection && (
            <p className="mt-1 text-xs leading-snug text-white/85">
              {matchScore.mainCorrection}
            </p>
          )}
        </div>
        {!running && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/65">
            Camera off — start it here when you need floor detection.
          </div>
        )}
      </div>

      <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--muted)]">
          {running
            ? people.length === 0
              ? 'Looking for people…'
              : `Tracking ${people.length} ${people.length === 1 ? 'person' : 'people'}`
            : 'Compare remains independent and protected.'}
        </p>
        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <input
            type="checkbox"
            checked={showJointAngles}
            onChange={(event) => onShowJointAnglesChange(event.target.checked)}
          />
          Show Joint Angles
        </label>
      </div>
      <button
        type="button"
        onClick={openCompareWithReference}
        className="mt-3 shrink-0 rounded-lg border border-[var(--accent)]/60 px-3 py-2 text-sm font-semibold text-[var(--text)]"
      >
        Full Screen With Reference
      </button>
      {error && (
        <p className="mt-3 rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      )}
    </section>
  )
}
