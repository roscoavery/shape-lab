import { useMemo } from 'react'
import type { HomeworkLog } from '../../types'
import {
  perShapeHoldStats,
  windowHoldTotals,
  monthlyHoldHistory,
  repTotals,
  formatSecondsShort,
  shortDate,
} from '../../lib/holdStats'

/**
 * Full hold analytics for the athlete Progress view: per-shape longest /
 * average / totals with dates, today-vs-yesterday / week / month
 * comparisons, a monthly "electric bill" history chart, and rep totals.
 * Every number says what it is and when — no mystery compares.
 */

function deltaLabel(cur: number, prev: number): string | null {
  if (prev <= 0) return cur > 0 ? 'new' : null
  const d = cur - prev
  if (d === 0) return 'even'
  return `${d > 0 ? '+' : ''}${formatSecondsShort(d)}`
}

export function AthleteHoldStats({ logs }: { logs: HomeworkLog[] }) {
  const shapes = useMemo(() => perShapeHoldStats(logs), [logs])
  const windows = useMemo(() => windowHoldTotals(logs), [logs])
  const months = useMemo(() => monthlyHoldHistory(logs), [logs])
  const reps = useMemo(() => repTotals(logs), [logs])
  const maxMonth = Math.max(1, ...months.map((m) => m.seconds))

  if (shapes.length === 0 && reps.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No holds or reps logged yet — your stats will build here as you train.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {/* Per-shape cards */}
      {shapes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[var(--text)]">By shape</h4>
          <ul className="mt-2 space-y-2">
            {shapes.map((s) => {
              const delta = s.latestSeconds - s.firstSeconds
              return (
                <li
                  key={s.shapeId}
                  className="rounded-xl border border-[var(--panel-border)] bg-[#0d1218] p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-[var(--text)]">{s.name}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {s.count} session{s.count === 1 ? '' : 's'} · {formatSecondsShort(s.totalSeconds)} total
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-black/30 px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Longest</p>
                      <p className="text-base font-bold text-[var(--text)]">{formatSecondsShort(s.longest)}</p>
                      <p className="text-[10px] text-[var(--muted)]">{shortDate(s.longestDate)}</p>
                    </div>
                    <div className="rounded-lg bg-black/30 px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Average</p>
                      <p className="text-base font-bold text-[var(--text)]">{formatSecondsShort(s.average)}</p>
                      <p className="text-[10px] text-[var(--muted)]">per hold</p>
                    </div>
                    <div className="rounded-lg bg-black/30 px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Latest</p>
                      <p className="text-base font-bold text-[var(--text)]">{formatSecondsShort(s.latestSeconds)}</p>
                      <p className="text-[10px] text-[var(--muted)]">{shortDate(s.latestDate)}</p>
                    </div>
                  </div>
                  {s.count > 1 && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {delta > 0 ? (
                        <>Up <span className="font-bold text-[var(--good)]">{formatSecondsShort(delta)}</span> since {shortDate(s.firstDate)} <span className="text-[var(--muted)]">({formatSecondsShort(s.firstSeconds)} → {formatSecondsShort(s.latestSeconds)})</span></>
                      ) : delta < 0 ? (
                        <><span className="font-bold text-[var(--warn)]">{formatSecondsShort(delta)}</span> since {shortDate(s.firstDate)} — off days happen, next one counts</>
                      ) : (
                        <>Holding steady since {shortDate(s.firstDate)}</>
                      )}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Time comparisons */}
      <div>
        <h4 className="text-sm font-semibold text-[var(--text)]">How the training stacks up</h4>
        <ul className="mt-2 space-y-1.5 text-sm">
          {[
            { label: 'Today vs yesterday', cur: windows.today, prev: windows.yesterday },
            { label: 'This week vs last week', cur: windows.thisWeek, prev: windows.lastWeek },
            { label: 'This month vs last month', cur: windows.thisMonth, prev: windows.lastMonth },
          ].map((r) => {
            const d = deltaLabel(r.cur, r.prev)
            return (
              <li
                key={r.label}
                className="flex items-baseline justify-between gap-2 rounded-lg bg-[#0d1218] px-3 py-2"
              >
                <span className="text-[var(--muted)]">{r.label}</span>
                <span className="tabular-nums">
                  <span className="font-semibold text-[var(--text)]">{formatSecondsShort(r.cur)}</span>
                  <span className="text-[var(--muted)]"> vs {formatSecondsShort(r.prev)}</span>
                  {d && d !== 'even' && (
                    <span className={`ml-2 font-bold ${d === 'new' || d.startsWith('+') ? 'text-[var(--good)]' : 'text-[var(--warn)]'}`}>
                      {d === 'new' ? 'new!' : d}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-1 text-[11px] text-[var(--muted)]">Total hold time across all shapes.</p>
      </div>

      {/* Monthly history chart */}
      <div>
        <h4 className="text-sm font-semibold text-[var(--text)]">Monthly history</h4>
        <div className="mt-2 flex h-32 items-end gap-1 rounded-xl border border-[var(--panel-border)] bg-[#0d1218] p-3">
          {months.map((m) => (
            <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[9px] tabular-nums text-[var(--muted)]">
                {m.seconds > 0 ? formatSecondsShort(m.seconds) : ''}
              </span>
              <div
                className="w-full rounded-t bg-[var(--accent)]/70"
                style={{ height: `${Math.max(2, (m.seconds / maxMonth) * 88)}px`, opacity: m.seconds > 0 ? 1 : 0.25 }}
                title={`${m.label}: ${formatSecondsShort(m.seconds)}`}
              />
              <span className="text-[9px] text-[var(--muted)]">{m.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-[var(--muted)]">Total hold time per month — your training electric bill.</p>
      </div>

      {/* Rep totals */}
      {reps.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[var(--text)]">Reps logged</h4>
          <ul className="mt-2 space-y-1.5 text-sm">
            {reps.map((r) => (
              <li
                key={r.name}
                className="flex items-baseline justify-between gap-2 rounded-lg bg-[#0d1218] px-3 py-2"
              >
                <span className="font-medium text-[var(--text)]">{r.name}</span>
                <span className="tabular-nums text-[var(--muted)]">
                  <span className="font-bold text-[var(--text)]">{r.totalReps}</span> total · {r.sessions} session{r.sessions === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
