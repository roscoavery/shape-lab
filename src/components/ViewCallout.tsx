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

  if (view === 'any' && !warn) {
    return (
      <p className="text-xs text-[var(--muted)]">{copy.instruction}</p>
    )
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        warn
          ? 'border-[var(--warn)]/50 bg-[#2a2410] text-[var(--warn)]'
          : view === 'side'
            ? 'border-[var(--accent)]/30 bg-[#102820] text-[var(--text)]'
            : 'border-[var(--panel-border)] bg-[#121820] text-[var(--text)]'
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {warn ? 'Turn the body' : copy.label}
      </div>
      <p className="mt-0.5">{warn ?? copy.instruction}</p>
      {score?.detectedStance && shape.stanceAware && (
        <p className="mt-1 text-xs opacity-80">
          Grading {score.detectedStance === 'right' ? 'right' : 'left'} foot / support forward
        </p>
      )}
    </div>
  )
}
