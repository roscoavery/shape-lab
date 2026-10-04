import { formatHoldGoal, type BatteryStatus } from '../../lib/holdBattery'

/**
 * Battery-style progress bar for a hold/rep standard.
 * Fills as the athlete's best gets closer to the goal, drains when
 * they skip training days, and points at the next progression when full.
 */
export function HoldBatteryBar({
  name,
  status,
}: {
  name: string
  status: BatteryStatus
}) {
  const { charge, goalSeconds, goalReps, decaying, full, daysSince, nextStage, stage } =
    status
  const goalText = goalSeconds
    ? formatHoldGoal(goalSeconds)
    : goalReps
      ? `${goalReps} reps`
      : stage?.goalLabel ?? ''
  const stageLabel = stage ? `${stage.label} · ` : ''

  const barColor = full
    ? 'bg-emerald-400'
    : charge >= 60
      ? 'bg-lime-400'
      : charge >= 30
        ? 'bg-amber-300'
        : 'bg-orange-400'

  return (
    <div className="rounded-lg bg-[#121820] px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text)]">
            {name}
            {stage && <span className="font-normal text-[var(--muted)]"> · {stage.label}</span>}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {stageLabel}Goal {goalText}
            {status.bestSeconds > 0 && goalSeconds ? (
              <> · best {formatHoldGoal(status.bestSeconds)}</>
            ) : null}
            {status.bestReps > 0 && goalReps && !goalSeconds ? (
              <> · best {status.bestReps}</>
            ) : null}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            full ? 'bg-emerald-400 text-black' : 'bg-white/10 text-white/80'
          }`}
        >
          {charge}%
        </span>
      </div>
      {/* Battery */}
      <div className="mt-2 flex items-center gap-1.5">
        <div className="relative h-4 flex-1 overflow-hidden rounded-md border border-white/20 bg-black/40">
          <div
            className={`h-full rounded-sm transition-all ${barColor}`}
            style={{ width: `${charge}%` }}
          />
          {full && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-black/70">
                Full
              </span>
            </div>
          )}
        </div>
        <div className="h-2.5 w-1 shrink-0 rounded-r-sm bg-white/20" />
      </div>
      {full && nextStage ? (
        <p className="mt-1.5 text-xs font-semibold text-emerald-300">
          Battery full. Time for {nextStage.label.toLowerCase()}
          {nextStage.goalLabel ? ` (${nextStage.goalLabel})` : ''}.
        </p>
      ) : full ? (
        <p className="mt-1.5 text-xs font-semibold text-emerald-300">
          Battery full. Keep it charged with regular sessions.
        </p>
      ) : decaying ? (
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          Losing charge, {daysSince} days since your last session. Log a hold to top it back up.
        </p>
      ) : charge === 0 ? (
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          Log your first hold to start charging this up.
        </p>
      ) : null}
    </div>
  )
}
