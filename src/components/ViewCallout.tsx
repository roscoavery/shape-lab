import { useEffect, useState } from 'react'
import type { CameraView, ScoreResult, ShapeDef } from '../types'
import { CAMERA_VIEW_COPY } from '../lib/view'

type Props = {
  shape: ShapeDef
  score?: ScoreResult | null
}

export function ViewCallout({ shape, score }: Props) {
  const view: CameraView = shape.cameraView ?? 'any'
  const copy = CAMERA_VIEW_COPY[view]
  const warn = score?.viewWarning
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (warn) setOpen(true)
  }, [warn])

  if (view === 'any' && !warn) {
    return <p className="text-xs text-[var(--muted)]">{copy.instruction}</p>
  }

  const title = warn && view === 'front' ? 'Turn the body' : copy.label
  const body = warn && view === 'front' ? warn : copy.instruction

  return (
    <div
      className={`rounded-lg border text-sm ${
        warn
          ? 'border-[var(--warn)]/50 bg-[#2a2410] text-[var(--warn)]'
          : view === 'side'
            ? 'border-[var(--accent)]/30 bg-[#102820] text-[var(--text)]'
            : 'border-[var(--panel-border)] bg-[#121820] text-[var(--text)]'
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
            {title}
          </p>
          {!open && (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              How to stand for the camera
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs font-semibold opacity-70">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>
      {open && (
        <div className="border-t border-current/10 px-3 py-2">
          <p>{body}</p>
          {score?.detectedStance && shape.stanceAware && (
            <p className="mt-1 text-xs opacity-80">
              Grading {score.detectedStance === 'right' ? 'right' : 'left'} foot /
              support forward
            </p>
          )}
        </div>
      )}
    </div>
  )
}
