import { formatSeconds } from '../hooks/useHoldTimer'
import type { AttemptRecord } from '../types'

type Props = {
  attempts: AttemptRecord[]
  athleteId: string | null
}

export function ProgressHistory({ attempts, athleteId }: Props) {
  const filtered = athleteId
    ? attempts.filter((a) => a.athleteId === athleteId)
    : attempts

  const byShape = new Map<string, AttemptRecord[]>()
  for (const a of filtered) {
    const list = byShape.get(a.shapeId) ?? []
    list.push(a)
    byShape.set(a.shapeId, list)
  }

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">Progress history</p>
      {!athleteId && (
        <p className="text-sm text-[var(--muted)]">Select a profile to see their history.</p>
      )}
      {athleteId && filtered.length === 0 && (
        <p className="text-sm text-[var(--muted)]">No saved attempts yet. Hit “Save attempt” after a hold.</p>
      )}

      <div className="panel-scroll mt-2 max-h-64 space-y-3 overflow-y-auto">
        {[...byShape.entries()].map(([shapeId, list]) => {
          const latest = list[0]
          const best = list.reduce((b, x) => (x.overall > b.overall ? x : b), list[0])
          const bestHold = list.reduce(
            (b, x) => (x.qualityHoldSeconds > b.qualityHoldSeconds ? x : b),
            list[0],
          )
          return (
            <div
              key={shapeId}
              className="rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
            >
              <div className="font-medium">{latest.shapeName}</div>
              <div className="mt-1 grid grid-cols-3 gap-2 text-[var(--muted)]">
                <div>
                  <div className="text-[10px] uppercase">Latest</div>
                  <div className="text-[var(--text)]">{latest.overall}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase">Best score</div>
                  <div className="text-[var(--accent)]">{best.overall}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase">Best quality hold</div>
                  <div className="text-[var(--text)]">{formatSeconds(bestHold.qualityHoldSeconds)}</div>
                </div>
              </div>
              <ul className="mt-2 space-y-1 border-t border-[var(--panel-border)] pt-2">
                {list.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex justify-between gap-2 text-xs text-[var(--muted)]">
                    <span>{new Date(a.savedAt).toLocaleString()}</span>
                    <span className="text-[var(--text)]">
                      {a.overall} · Q {formatSeconds(a.qualityHoldSeconds)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
