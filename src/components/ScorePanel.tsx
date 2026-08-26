import type { ScoreResult, ShapeDef } from '../types'
import { formatSeconds } from '../hooks/useHoldTimer'
import { ViewCallout } from './ViewCallout'

function scoreColor(score: number): string {
  if (score >= 85) return 'var(--good)'
  if (score >= 70) return 'var(--accent)'
  if (score >= 50) return 'var(--warn)'
  return 'var(--bad)'
}

type Props = {
  shape: ShapeDef
  score: ScoreResult
  qualityThreshold: number
  totalHoldSeconds: number
  qualityHoldSeconds: number
  onResetTimer: () => void
  onSave: () => void
  canSave: boolean
}

export function ScorePanel({
  shape,
  score,
  qualityThreshold,
  totalHoldSeconds,
  qualityHoldSeconds,
  onResetTimer,
  onSave,
  canSave,
}: Props) {
  const inQuality = score.holdReady ?? score.overall >= qualityThreshold

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      {shape.bodyPosition && (
        <div className="rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm leading-snug">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Body position (what we grade)
          </p>
          <p>{shape.bodyPosition}</p>
        </div>
      )}
      <ViewCallout shape={shape} score={score} />
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Overall</p>
          <p
            className="text-5xl font-bold tabular-nums leading-none"
            style={{ color: scoreColor(score.overall) }}
          >
            {score.overall}
          </p>
        </div>
        <div className="text-right text-sm text-[var(--muted)]">
          <div>
            Quality gate:{' '}
            <span className="text-[var(--text)]">{qualityThreshold}</span>
          </div>
          <div className={inQuality ? 'text-[var(--good)] font-semibold' : 'text-[var(--warn)]'}>
            {inQuality ? 'HOLDING — stay there' : score.nearHit ? 'ALMOST — one piece off' : 'Looking'}
          </div>
        </div>
      </div>

      {inQuality && (
        <div className="rounded-lg border border-[var(--good)] bg-[#102820] px-3 py-2 text-lg font-bold text-[var(--good)]">
          HOLDING — keep that {shape.name}
        </div>
      )}
      {!inQuality && score.nearHit && (
        <div className="rounded-lg border border-[var(--warn)] bg-[#2a2410] px-3 py-2 text-base font-semibold text-[var(--warn)]">
          ALMOST — {score.mainCorrection ?? 'one piece off'}
        </div>
      )}

      {score.mainCorrection && (
        <div className="rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm">
          <span className="text-[var(--muted)]">Main correction: </span>
          <span className="font-medium text-[var(--text)]">{score.mainCorrection}</span>
        </div>
      )}

      <div className="grid gap-2">
        {score.criteria.map((c) => (
          <div key={c.id} className="grid grid-cols-[1fr_auto] items-center gap-2">
            <div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span>{c.label}</span>
                <span className="tabular-nums font-semibold" style={{ color: scoreColor(c.score) }}>
                  {c.score}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-[#0d1218]">
                <div
                  className="h-full rounded transition-[width] duration-150"
                  style={{
                    width: `${c.score}%`,
                    background: scoreColor(c.score),
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3">
        <div>
          <p className="text-xs text-[var(--muted)]">Total hold</p>
          <p className="text-xl font-semibold tabular-nums">{formatSeconds(totalHoldSeconds)}</p>
          {shape.category !== 'hold' && (
            <p className="text-[10px] text-[var(--muted)]">Useful for static shapes too</p>
          )}
        </div>
        <div>
          <p className="text-xs text-[var(--muted)]">Quality hold (≥{qualityThreshold})</p>
          <p className="text-xl font-semibold tabular-nums text-[var(--accent)]">
            {formatSeconds(qualityHoldSeconds)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onResetTimer}
          className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm hover:bg-[#243040]"
        >
          Reset timer
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save attempt
        </button>
      </div>
    </div>
  )
}
